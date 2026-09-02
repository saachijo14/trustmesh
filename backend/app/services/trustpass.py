"""
TrustPass issuance for TrustMesh.
Wraps a policy decision into a privacy-safe, time-limited authorization
object that a buyer/agent can act on, without exposing raw risk internals.
"""
import uuid
from datetime import datetime, timezone, timedelta
from app.services.audit_log import log_event

TRUSTPASS_TTL_MINUTES = 30

PUBLIC_EXPLANATIONS = {
    "ALLOW": "Checkout approved.",
    "STEP_UP_REQUIRED": "Additional verification is required before checkout.",
    "HOLD_FOR_REVIEW": "This order is under review. You will be notified shortly.",
    "DENY_AUTONOMOUS_ACTION": "This action requires manual approval and cannot proceed automatically.",
}


def issue_trustpass(policy_result: dict, subject_type: str, subject_id: str, max_permitted_amount_inr: float = None, coupon_cap_inr: float = None) -> dict:
    """
    Issue a TrustPass from a policy_engine.apply_policy() result.
    Never includes raw risk_score, features, or graph internals —
    only the bounded decision and public-safe explanation.
    """
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=TRUSTPASS_TTL_MINUTES)

    result = {
        "trustpass_id": f"tp_{uuid.uuid4().hex[:8]}",
        "subject_type": subject_type,
        "subject_id": subject_id,
        "risk_tier": policy_result["risk_tier"],
        "decision": policy_result["decision"],
        "allowed_actions": policy_result["allowed_actions"],
        "blocked_actions": policy_result["blocked_actions"],
        "max_permitted_amount_inr": max_permitted_amount_inr,
        "coupon_cap_inr": coupon_cap_inr,
        "issued_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "merchant_policy_version": policy_result["policy_version"],
        "public_explanation": PUBLIC_EXPLANATIONS.get(policy_result["decision"], "Checkout status pending."),
        "requires_human_approval": policy_result["requires_human_approval"],
        "status": "active",
    }

    log_event(
        event_type="TRUSTPASS_ISSUED",
        customer_id=policy_result["customer_id"],
        actor="system",
        details={"trustpass_id": result["trustpass_id"], "decision": result["decision"], "subject_id": subject_id},
    )

    return result


def is_expired(trustpass: dict) -> bool:
    expires_at = datetime.fromisoformat(trustpass["expires_at"])
    return datetime.now(timezone.utc) > expires_at


if __name__ == "__main__":
    from app.services.risk_scoring import compute_risk_score
    from app.services.policy_engine import apply_policy

    risk = compute_risk_score("ringA_customer_0")
    policy = apply_policy(risk, order_amount=15000)
    tp = issue_trustpass(policy, subject_type="checkout", subject_id="cart_test_1",
                          max_permitted_amount_inr=3000, coupon_cap_inr=100)
    print(tp)
    print("Expired?", is_expired(tp))