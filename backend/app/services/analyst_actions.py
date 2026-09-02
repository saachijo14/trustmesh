"""
Analyst action handling for TrustMesh.
Creates Alert records from checkout evaluations and lets analysts act on
them (Allow/OTP/Hold/Escalate/Mark Abuse/False Positive), powering the
Alerts + CaseDetail frontend pages.
"""
import uuid
from datetime import datetime, timezone
from app.services.neo4j_client import get_driver
from app.services.audit_log import log_event

REASON_TAG_MAP = {
    "DEVICE_SHARED_WITH_MULTIPLE_ACCOUNTS": "Device match",
    "RING_ASSOCIATION_DETECTED": "Ring overlap",
    "COUPON_CONCENTRATION_HIGH": "Coupon abuse",
    "REFUND_DESTINATION_REUSED": "Refund pattern",
    "ABNORMAL_REFUND_FREQUENCY": "Refund pattern",
    "HIGH_ORDER_VELOCITY": "Velocity spike",
    "ORDER_EXCEEDS_AUTONOMOUS_LIMIT": "High value",
    "NO_SIGNIFICANT_RISK_SIGNALS": "No signals",
}

DECISION_TO_REC_ACTION = {
    "ALLOW": "ALLOW",
    "STEP_UP_REQUIRED": "OTP",
    "HOLD_FOR_REVIEW": "HOLD",
    "DENY_AUTONOMOUS_ACTION": "BLOCK",
}

DECISION_TO_INITIAL_STATUS = {
    "ALLOW": "CLOSED",
    "STEP_UP_REQUIRED": "OPEN",
    "HOLD_FOR_REVIEW": "OPEN",
    "DENY_AUTONOMOUS_ACTION": "OPEN",
}

VALID_ACTIONS = {
    "ALLOW": "CLOSED",
    "OTP": "REVIEWING",
    "HOLD": "REVIEWING",
    "ESCALATE": "ESCALATED",
    "MARK_ABUSE": "RESOLVED",
    "FALSE_POSITIVE": "RESOLVED",
}


def _top_reasons(reason_codes: list[str]) -> list[str]:
    tags = []
    for code in reason_codes:
        tag = REASON_TAG_MAP.get(code, code)
        if tag not in tags:
            tags.append(tag)
    return tags


def create_alert(risk_result: dict, policy_result: dict, order_id: str, order_amount: float) -> dict:
    """
    Create an Alert node from a completed checkout evaluation.
    Called once per /checkout/evaluate call, for every decision
    (including ALLOW) so the Alert Queue shows a full evaluation log.
    """
    driver = get_driver()

    with driver.session() as session:
        count_record = session.run("MATCH (a:Alert) RETURN count(a) AS c").single()
        seq = 9800 + (count_record["c"] if count_record else 0) + 1

    alert_id = f"ALT-{seq}"
    decision = policy_result["decision"]
    rec_action = DECISION_TO_REC_ACTION.get(decision, "REVIEW")
    status = DECISION_TO_INITIAL_STATUS.get(decision, "OPEN")
    assignee = "Auto" if status == "CLOSED" else None
    created_at = datetime.now(timezone.utc).isoformat()

    alert = {
        "alert_id": alert_id,
        "order_id": order_id,
        "customer_id": risk_result["customer_id"],
        "risk_score": risk_result["risk_score"],
        "risk_tier": risk_result["risk_tier"],
        "exposure_inr": order_amount,
        "top_reasons": _top_reasons(policy_result["reason_codes"]),
        "rec_action": rec_action,
        "status": status,
        "assignee": assignee,
        "created_at": created_at,
    }

    query = """
    MATCH (c:Customer {customer_id: $customer_id})
    CREATE (a:Alert {
        alert_id: $alert_id,
        order_id: $order_id,
        risk_score: $risk_score,
        risk_tier: $risk_tier,
        exposure_inr: $exposure_inr,
        top_reasons: $top_reasons,
        rec_action: $rec_action,
        status: $status,
        assignee: $assignee,
        created_at: $created_at
    })
    CREATE (c)-[:HAS_ALERT]->(a)
    """
    with driver.session() as session:
        session.run(query, customer_id=risk_result["customer_id"], **{k: v for k, v in alert.items() if k != "customer_id"})

    log_event(
        event_type="ALERT_CREATED",
        customer_id=risk_result["customer_id"],
        actor="system",
        details={"alert_id": alert_id, "decision": decision, "status": status},
    )

    return alert


def list_alerts(status: str = None, risk_tier: str = None, limit: int = 100) -> list[dict]:
    """Fetch alerts for the Alert Queue page, optionally filtered."""
    driver = get_driver()
    filters = []
    params = {"limit": limit}
    if status:
        filters.append("a.status = $status")
        params["status"] = status
    if risk_tier:
        filters.append("a.risk_tier = $risk_tier")
        params["risk_tier"] = risk_tier

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
    query = f"""
    MATCH (c:Customer)-[:HAS_ALERT]->(a:Alert)
    {where_clause}
    RETURN a.alert_id AS alert_id, a.order_id AS order_id, c.customer_id AS customer_id,
           a.risk_score AS risk_score, a.risk_tier AS risk_tier, a.exposure_inr AS exposure_inr,
           a.top_reasons AS top_reasons, a.rec_action AS rec_action, a.status AS status,
           a.assignee AS assignee, a.created_at AS created_at
    ORDER BY a.created_at DESC
    LIMIT $limit
    """
    with driver.session() as session:
        return [dict(r) for r in session.run(query, **params)]


def get_alert(alert_id: str) -> dict | None:
    """Fetch a single alert by id, for the CaseDetail page."""
    driver = get_driver()
    query = """
    MATCH (c:Customer)-[:HAS_ALERT]->(a:Alert {alert_id: $alert_id})
    RETURN a.alert_id AS alert_id, a.order_id AS order_id, c.customer_id AS customer_id,
           a.risk_score AS risk_score, a.risk_tier AS risk_tier, a.exposure_inr AS exposure_inr,
           a.top_reasons AS top_reasons, a.rec_action AS rec_action, a.status AS status,
           a.assignee AS assignee, a.created_at AS created_at
    """
    with driver.session() as session:
        record = session.run(query, alert_id=alert_id).single()
        return dict(record) if record else None


def record_analyst_action(alert_id: str, action: str, analyst_id: str, notes: str = "") -> dict:
    """
    Apply an analyst action (ALLOW/OTP/HOLD/ESCALATE/MARK_ABUSE/FALSE_POSITIVE)
    to an alert: updates its status + assignee, and logs the decision.
    """
    action = action.upper()
    if action not in VALID_ACTIONS:
        raise ValueError(f"Invalid action '{action}'. Must be one of {list(VALID_ACTIONS)}")

    alert = get_alert(alert_id)
    if alert is None:
        raise ValueError(f"No alert found with id '{alert_id}'")

    new_status = VALID_ACTIONS[action]

    driver = get_driver()
    query = """
    MATCH (a:Alert {alert_id: $alert_id})
    SET a.status = $status, a.assignee = $assignee
    """
    with driver.session() as session:
        session.run(query, alert_id=alert_id, status=new_status, assignee=analyst_id)

    log_event(
        event_type="ANALYST_ACTION",
        customer_id=alert["customer_id"],
        actor=analyst_id,
        details={"alert_id": alert_id, "action": action, "new_status": new_status, "notes": notes},
    )

    updated_alert = get_alert(alert_id)
    return updated_alert


if __name__ == "__main__":
    from app.services.risk_scoring import compute_risk_score
    from app.services.policy_engine import apply_policy

    risk = compute_risk_score("ringA_customer_0")
    policy = apply_policy(risk, order_amount=15000)
    alert = create_alert(risk, policy, order_id="cart_test_1", order_amount=15000)
    print("Created:", alert)

    acted = record_analyst_action(alert["alert_id"], "ESCALATE", analyst_id="Arjun R.", notes="Ring core node")
    print("After action:", acted)