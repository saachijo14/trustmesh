"""
Tiered policy engine for TrustMesh.
Turns a risk score/tier into a bounded, explainable action.
"""
from app.services.audit_log import log_event
from app.services.neo4j_client import get_driver
POLICY_VERSION = "v1.0"

TIER_ACTIONS = {
    "low": {
        "decision": "ALLOW",
        "requires_human_approval": False,
        "allowed_actions": ["CREATE_ORDER", "AUTO_APPLY_COUPON", "AUTO_APPROVE_REFUND"],
        "blocked_actions": [],
    },
    "medium": {
        "decision": "STEP_UP_REQUIRED",
        "requires_human_approval": False,
        "allowed_actions": ["REQUEST_OTP", "CREATE_ORDER_AFTER_OTP"],
        "blocked_actions": ["AUTO_APPLY_COUPON_ABOVE_100", "AUTO_APPROVE_REFUND"],
    },
    "high": {
        "decision": "HOLD_FOR_REVIEW",
        "requires_human_approval": True,
        "allowed_actions": ["REQUEST_OTP"],
        "blocked_actions": ["CREATE_ORDER", "AUTO_APPLY_COUPON", "AUTO_APPROVE_REFUND"],
    },
    "critical": {
        "decision": "DENY_AUTONOMOUS_ACTION",
        "requires_human_approval": True,
        "allowed_actions": [],
        "blocked_actions": ["CREATE_ORDER", "AUTO_APPLY_COUPON", "AUTO_APPROVE_REFUND", "AGENT_CHECKOUT"],
    },
}

# Merchant-configurable defaults (PRD Policy Studio controls)
DEFAULT_POLICY_CONFIG = {
    "max_autonomous_order_value_inr": 50000,
    "coupon_cap_new_account_inr": 100,
    "coupon_cap_medium_risk_inr": 100,
    "ring_node_threshold": 15,
    "otp_max_challenges_per_window": 3,
    "hold_expiry_minutes": 30,
}

def get_policy_config() -> dict:
    """
    Return the currently active merchant policy configuration.

    Falls back to DEFAULT_POLICY_CONFIG if no saved configuration exists.
    """
    driver = get_driver()

    with driver.session() as session:
        record = session.run(
            """
            MATCH (p:PolicyConfig {policy_version: $policy_version})
            RETURN properties(p) AS config
            """,
            policy_version=POLICY_VERSION,
        ).single()

    if record is None:
        return DEFAULT_POLICY_CONFIG.copy()

    config = dict(record["config"])
    config.pop("policy_version", None)

    return config


def save_policy_config(config: dict) -> dict:
    """
    Persist the active merchant policy configuration in Neo4j.
    """
    driver = get_driver()

    with driver.session() as session:
        session.run(
            """
            MERGE (p:PolicyConfig {policy_version: $policy_version})
            SET p.max_autonomous_order_value_inr = $max_autonomous_order_value_inr,
                p.coupon_cap_new_account_inr = $coupon_cap_new_account_inr,
                p.coupon_cap_medium_risk_inr = $coupon_cap_medium_risk_inr,
                p.ring_node_threshold = $ring_node_threshold,
                p.otp_max_challenges_per_window = $otp_max_challenges_per_window,
                p.hold_expiry_minutes = $hold_expiry_minutes
            """,
            policy_version=POLICY_VERSION,
            **config,
        )

    return config

def apply_policy(risk_result: dict, order_amount: float = 0, config: dict = None) -> dict:
    """
    Given a risk_scoring.compute_risk_score() result, apply the tiered
    policy and return a full decision object with reason codes,
    matching the PRD's required explanation output.
    """
    config = config or get_policy_config()
    tier = risk_result["risk_tier"]
    score = risk_result["risk_score"]
    features = risk_result["features"]

    base = TIER_ACTIONS[tier]

    # Build reason codes from the strongest contributing features
    reason_codes = []
    if features.get("D", 0) >= 50:
        reason_codes.append("DEVICE_SHARED_WITH_MULTIPLE_ACCOUNTS")
    if features.get("R", 0) >= 50:
        reason_codes.append("REFUND_DESTINATION_REUSED")
    if features.get("C", 0) >= 50:
        reason_codes.append("COUPON_CONCENTRATION_HIGH")
    if features.get("B", 0) >= 50:
        reason_codes.append("RING_ASSOCIATION_DETECTED")
    if features.get("F", 0) >= 50:
        reason_codes.append("ABNORMAL_REFUND_FREQUENCY")
    if features.get("V", 0) >= 50:
        reason_codes.append("HIGH_ORDER_VELOCITY")
    if not reason_codes:
        reason_codes.append("NO_SIGNIFICANT_RISK_SIGNALS")

    # Escalate if order exceeds the autonomous max, regardless of tier
    exceeds_autonomous_limit = order_amount > config["max_autonomous_order_value_inr"]
    if exceeds_autonomous_limit and tier == "low":
        decision = "STEP_UP_REQUIRED"
        requires_human_approval = False
        reason_codes.append("ORDER_EXCEEDS_AUTONOMOUS_LIMIT")
    else:
        decision = base["decision"]
        requires_human_approval = base["requires_human_approval"]

    result = {
        "customer_id": risk_result["customer_id"],
        "risk_score": score,
        "risk_tier": tier,
        "decision": decision,
        "allowed_actions": base["allowed_actions"],
        "blocked_actions": base["blocked_actions"],
        "reason_codes": reason_codes,
        "signals_observed": reason_codes,
        "requires_human_approval": requires_human_approval,
        "policy_version": POLICY_VERSION,
        "recommended_action": decision,
    }

    log_event(
        event_type="POLICY_DECISION",
        customer_id=risk_result["customer_id"],
        actor="system",
        details={"decision": decision, "reason_codes": reason_codes, "order_amount": order_amount},
    )

    return result


if __name__ == "__main__":
    from app.services.risk_scoring import compute_risk_score

    test_ids = ["ringA_customer_0", "ringB_customer_0", "household_customer_0", "customer_1000"]
    for cid in test_ids:
        risk = compute_risk_score(cid)
        policy = apply_policy(risk, order_amount=15000)
        print(f"{cid}: decision={policy['decision']} tier={policy['risk_tier']} reasons={policy['reason_codes']}")