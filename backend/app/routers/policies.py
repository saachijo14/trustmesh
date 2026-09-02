from fastapi import APIRouter, HTTPException

from app.schemas.policy import (
    PolicyConfig,
    PolicyEvaluationRequest,
    PolicyUpdateRequest,
)

from app.services.policy_engine import (
    POLICY_VERSION,
    get_policy_config,
    save_policy_config,
    apply_policy,
)

from app.services.risk_scoring import compute_risk_score


router = APIRouter(
    prefix="/policies",
    tags=["policies"],
)


@router.get("")
def get_policy():
    """
    Return the active merchant policy configuration.
    """
    return {
        "policy_version": POLICY_VERSION,
        "config": get_policy_config(),
    }


@router.put("")
def update_policy(req: PolicyUpdateRequest):
    """
    Update the active merchant policy configuration.
    """
    config = req.config.model_dump()

    saved_config = save_policy_config(config)

    return {
        "policy_version": POLICY_VERSION,
        "config": saved_config,
        "message": "Policy configuration updated successfully.",
    }


@router.post("/evaluate")
def evaluate_policy(req: PolicyEvaluationRequest):
    """
    Evaluate a customer's current risk against the active policy.
    """
    try:
        risk_result = compute_risk_score(req.customer_id)

        policy_result = apply_policy(
            risk_result,
            order_amount=req.order_amount,
        )

        return policy_result

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )