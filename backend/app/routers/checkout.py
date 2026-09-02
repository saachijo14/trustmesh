from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.risk_scoring import compute_risk_score
from app.services.policy_engine import apply_policy
from app.services.trustpass import issue_trustpass
from app.services.analyst_actions import create_alert

router = APIRouter(prefix="/checkout", tags=["checkout"])


class EvaluateCheckoutRequest(BaseModel):
    customer_id: str
    cart_id: str
    order_amount: float
    coupon_cap_inr: float | None = 100


@router.post("/evaluate")
def evaluate_checkout(req: EvaluateCheckoutRequest):
    """
    Full checkout evaluation pipeline: risk score -> policy decision -> TrustPass.
    This is the endpoint the Agent Checkout Simulator will call.
    """
    risk = compute_risk_score(req.customer_id)
    policy = apply_policy(risk, order_amount=req.order_amount)
    order_creation_allowed = any(
    action in policy["allowed_actions"]
    for action in ("CREATE_ORDER", "CREATE_ORDER_AFTER_OTP")
)
    trustpass = issue_trustpass(
        policy,
        subject_type="checkout",
        subject_id=req.cart_id,
        max_permitted_amount_inr=req.order_amount if order_creation_allowed else 0,
        coupon_cap_inr=req.coupon_cap_inr,
    )

    create_alert(risk, policy, order_id=req.cart_id, order_amount=req.order_amount)

    return {
        "risk": risk,
        "policy": policy,
        "trustpass": trustpass,
    }