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
    driver = get_driver()

    with driver.session() as session:
        record = session.run(
            """
            MATCH (p:PolicyConfig {policy_version: $policy_version})
            RETURN
                p.max_autonomous_order_value_inr AS max_autonomous_order_value_inr,
                p.coupon_cap_new_account_inr AS coupon_cap_new_account_inr,
                p.coupon_cap_medium_risk_inr AS coupon_cap_medium_risk_inr,
                p.ring_node_threshold AS ring_node_threshold,
                p.otp_max_challenges_per_window AS otp_max_challenges_per_window,
                p.hold_expiry_minutes AS hold_expiry_minutes
            """,
            policy_version=POLICY_VERSION,
        ).single()

    if record is None:
        return DEFAULT_POLICY_CONFIG.copy()

    return {
        "max_autonomous_order_value_inr": record["max_autonomous_order_value_inr"],
        "coupon_cap_new_account_inr": record["coupon_cap_new_account_inr"],
        "coupon_cap_medium_risk_inr": record["coupon_cap_medium_risk_inr"],
        "ring_node_threshold": record["ring_node_threshold"],
        "otp_max_challenges_per_window": record["otp_max_challenges_per_window"],
        "hold_expiry_minutes": record["hold_expiry_minutes"],
    }


def save_policy_config(config: dict) -> dict:
    driver = get_driver()

    with driver.session() as session:

        # Save current policy configuration as individual Neo4j properties.
        session.run(
            """
            MERGE (p:PolicyConfig {policy_version: $policy_version})
            SET
                p.max_autonomous_order_value_inr = $max_autonomous_order_value_inr,
                p.coupon_cap_new_account_inr = $coupon_cap_new_account_inr,
                p.coupon_cap_medium_risk_inr = $coupon_cap_medium_risk_inr,
                p.ring_node_threshold = $ring_node_threshold,
                p.otp_max_challenges_per_window = $otp_max_challenges_per_window,
                p.hold_expiry_minutes = $hold_expiry_minutes,
                p.updated_at = toString(datetime())
            """,
            policy_version=POLICY_VERSION,
            **config,
        )

        # Mark previous versions inactive.
        session.run(
            """
            MATCH (v:PolicyVersion)
            SET v.active = false
            """
        )

        # Count existing versions.
        count_record = session.run(
            """
            MATCH (v:PolicyVersion)
            RETURN count(v) AS count
            """
        ).single()

        version_number = int(count_record["count"]) + 1
        version_id = f"{POLICY_VERSION}-{version_number}"

        # Store the configuration snapshot as individual properties.
        session.run(
            """
            CREATE (v:PolicyVersion {
                version_id: $version_id,
                policy_version: $policy_version,
                created_at: toString(datetime()),
                active: true,
                changes: $changes,
                max_autonomous_order_value_inr: $max_autonomous_order_value_inr,
                coupon_cap_new_account_inr: $coupon_cap_new_account_inr,
                coupon_cap_medium_risk_inr: $coupon_cap_medium_risk_inr,
                ring_node_threshold: $ring_node_threshold,
                otp_max_challenges_per_window: $otp_max_challenges_per_window,
                hold_expiry_minutes: $hold_expiry_minutes
            })
            """,
            version_id=version_id,
            policy_version=POLICY_VERSION,
            changes="Policy configuration updated",
            **config,
        )

    return config

def apply_policy(risk: dict, order_amount: float = 0) -> dict:
    """
    Apply the active policy to a risk result.

    Order amount is enforced against the configured autonomous
    order value limit.
    """

    config = get_policy_config()

    risk_tier = risk["risk_tier"]
    risk_score = risk["risk_score"]

    tier_policy = TIER_ACTIONS[risk_tier]

    allowed_actions = list(tier_policy["allowed_actions"])
    blocked_actions = list(tier_policy["blocked_actions"])

    reason_codes = list(risk.get("reason_codes", []))

    max_autonomous_value = float(
        config["max_autonomous_order_value_inr"]
    )

    # Enforce autonomous order value limit.
    if (
        order_amount > max_autonomous_value
        and "CREATE_ORDER" in allowed_actions
    ):
        allowed_actions.remove("CREATE_ORDER")

        if "CREATE_ORDER" not in blocked_actions:
            blocked_actions.append("CREATE_ORDER")

        if "ORDER_VALUE_LIMIT_EXCEEDED" not in reason_codes:
            reason_codes.append("ORDER_VALUE_LIMIT_EXCEEDED")

        decision = "STEP_UP_REQUIRED"
        recommended_action = "STEP_UP_REQUIRED"
        requires_human_approval = False

    else:
        decision = tier_policy["decision"]
        recommended_action = decision
        requires_human_approval = tier_policy["requires_human_approval"]

    return {
        "decision": decision,
        "risk_tier": risk_tier,
        "allowed_actions": allowed_actions,
        "blocked_actions": blocked_actions,
        "reason_codes": reason_codes,
        "requires_human_approval": requires_human_approval,
        "policy_version": POLICY_VERSION,
        "recommended_action": recommended_action,
    }


if __name__ == "__main__":
    from app.services.risk_scoring import compute_risk_score

    test_ids = ["ringA_customer_0", "ringB_customer_0", "household_customer_0", "customer_1000"]
    for cid in test_ids:
        risk = compute_risk_score(cid)
        policy = apply_policy(risk, order_amount=15000)
        print(f"{cid}: decision={policy['decision']} tier={policy['risk_tier']} reasons={policy['reason_codes']}")