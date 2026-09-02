"""
TrustPass issuance and registry for TrustMesh.

Wraps a policy decision into a privacy-safe, time-limited authorization
object that a buyer/agent can act on, without exposing raw risk internals.

Issued TrustPasses are persisted in Neo4j so they can be queried by the
TrustPass Registry API.
"""

import uuid
from datetime import datetime, timezone, timedelta

from app.services.audit_log import log_event
from app.services.neo4j_client import get_driver


TRUSTPASS_TTL_MINUTES = 30


PUBLIC_EXPLANATIONS = {
    "ALLOW": "Checkout approved.",
    "STEP_UP_REQUIRED": "Additional verification is required before checkout.",
    "HOLD_FOR_REVIEW": "This order is under review. You will be notified shortly.",
    "DENY_AUTONOMOUS_ACTION": "This action requires manual approval and cannot proceed automatically.",
}


def issue_trustpass(
    policy_result: dict,
    subject_type: str,
    subject_id: str,
    max_permitted_amount_inr: float = None,
    coupon_cap_inr: float = None,
) -> dict:
    """
    Issue a TrustPass from a policy_engine.apply_policy() result.

    Never includes raw risk_score, features, or graph internals.
    Only bounded policy information is exposed.
    """
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=TRUSTPASS_TTL_MINUTES)

    result = {
        "trustpass_id": f"tp_{uuid.uuid4().hex[:8]}",
        "subject_type": subject_type,
        "subject_id": subject_id,
        "customer_id": policy_result["customer_id"],
        "risk_tier": policy_result["risk_tier"],
        "decision": policy_result["decision"],
        "allowed_actions": policy_result["allowed_actions"],
        "blocked_actions": policy_result["blocked_actions"],
        "max_permitted_amount_inr": max_permitted_amount_inr,
        "coupon_cap_inr": coupon_cap_inr,
        "issued_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "merchant_policy_version": policy_result["policy_version"],
        "public_explanation": PUBLIC_EXPLANATIONS.get(
            policy_result["decision"],
            "Checkout status pending.",
        ),
        "requires_human_approval": policy_result["requires_human_approval"],
        "status": "active",
    }

    save_trustpass(result)

    log_event(
        event_type="TRUSTPASS_ISSUED",
        customer_id=policy_result["customer_id"],
        actor="system",
        details={
            "trustpass_id": result["trustpass_id"],
            "decision": result["decision"],
            "subject_id": subject_id,
        },
    )

    return result


def save_trustpass(trustpass: dict) -> None:
    """Persist an issued TrustPass in Neo4j."""
    driver = get_driver()

    with driver.session() as session:
        session.run(
            """
            MERGE (tp:TrustPass {trustpass_id: $trustpass_id})
            SET tp.subject_type = $subject_type,
                tp.subject_id = $subject_id,
                tp.customer_id = $customer_id,
                tp.risk_tier = $risk_tier,
                tp.decision = $decision,
                tp.allowed_actions = $allowed_actions,
                tp.blocked_actions = $blocked_actions,
                tp.max_permitted_amount_inr = $max_permitted_amount_inr,
                tp.coupon_cap_inr = $coupon_cap_inr,
                tp.issued_at = $issued_at,
                tp.expires_at = $expires_at,
                tp.merchant_policy_version = $merchant_policy_version,
                tp.public_explanation = $public_explanation,
                tp.requires_human_approval = $requires_human_approval,
                tp.status = $status
            """,
            **trustpass,
        )


def list_trustpasses() -> list[dict]:
    """Return all issued TrustPasses, newest first."""
    driver = get_driver()

    with driver.session() as session:
        result = session.run(
            """
            MATCH (tp:TrustPass)
            RETURN properties(tp) AS trustpass
            ORDER BY tp.issued_at DESC
            """
        )

        trustpasses = [dict(record["trustpass"]) for record in result]

    for trustpass in trustpasses:
        _refresh_expiry_status(trustpass)

    return trustpasses


def get_trustpass(trustpass_id: str) -> dict | None:
    """Return one TrustPass by ID."""
    driver = get_driver()

    with driver.session() as session:
        record = session.run(
            """
            MATCH (tp:TrustPass {trustpass_id: $trustpass_id})
            RETURN properties(tp) AS trustpass
            """,
            trustpass_id=trustpass_id,
        ).single()

    if record is None:
        return None

    trustpass = dict(record["trustpass"])
    _refresh_expiry_status(trustpass)

    return trustpass


def get_customer_trustpasses(customer_id: str) -> list[dict]:
    """Return all TrustPasses issued for a customer."""
    driver = get_driver()

    with driver.session() as session:
        result = session.run(
            """
            MATCH (tp:TrustPass {customer_id: $customer_id})
            RETURN properties(tp) AS trustpass
            ORDER BY tp.issued_at DESC
            """,
            customer_id=customer_id,
        )

        trustpasses = [dict(record["trustpass"]) for record in result]

    for trustpass in trustpasses:
        _refresh_expiry_status(trustpass)

    return trustpasses


def is_expired(trustpass: dict) -> bool:
    expires_at = datetime.fromisoformat(trustpass["expires_at"])
    return datetime.now(timezone.utc) > expires_at


def _refresh_expiry_status(trustpass: dict) -> None:
    """
    Mark an active TrustPass as expired when its TTL has elapsed.
    Also persist the status change in Neo4j.
    """
    if trustpass.get("status") == "active" and is_expired(trustpass):
        trustpass["status"] = "expired"

        driver = get_driver()

        with driver.session() as session:
            session.run(
                """
                MATCH (tp:TrustPass {trustpass_id: $trustpass_id})
                SET tp.status = 'expired'
                """,
                trustpass_id=trustpass["trustpass_id"],
            )


if __name__ == "__main__":
    from app.services.risk_scoring import compute_risk_score
    from app.services.policy_engine import apply_policy

    risk = compute_risk_score("ringA_customer_0")
    policy = apply_policy(risk, order_amount=15000)

    tp = issue_trustpass(
        policy,
        subject_type="checkout",
        subject_id="cart_test_1",
        max_permitted_amount_inr=3000,
        coupon_cap_inr=100,
    )

    print(tp)
    print("Expired?", is_expired(tp))