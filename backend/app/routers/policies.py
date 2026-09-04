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
from app.services.neo4j_client import get_driver


router = APIRouter(prefix="/policies", tags=["policies"])


@router.get("")
def get_policy():
    return {
        "policy_version": POLICY_VERSION,
        "config": get_policy_config(),
    }


@router.put("")
def update_policy(req: PolicyUpdateRequest):
    config = req.config.model_dump()

    saved_config = save_policy_config(config)

    return {
        "policy_version": POLICY_VERSION,
        "config": saved_config,
        "message": "Policy configuration updated successfully.",
    }


@router.post("/evaluate")
def evaluate_policy(req: PolicyEvaluationRequest):
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


# ------------------------------------------------------------------
# POLICY VERSION HISTORY
# ------------------------------------------------------------------

@router.get("/versions")
def get_policy_versions():
    driver = get_driver()

    query = """
    MATCH (v:PolicyVersion)
    RETURN
        v.version_id AS id,
        v.policy_version AS policy_version,
        v.created_at AS created_at,
        v.active AS active,
        v.changes AS changes,
        v.max_autonomous_order_value_inr AS max_autonomous_order_value_inr,
        v.coupon_cap_new_account_inr AS coupon_cap_new_account_inr,
        v.coupon_cap_medium_risk_inr AS coupon_cap_medium_risk_inr,
        v.ring_node_threshold AS ring_node_threshold,
        v.otp_max_challenges_per_window AS otp_max_challenges_per_window,
        v.hold_expiry_minutes AS hold_expiry_minutes
    ORDER BY v.created_at DESC
    """

    with driver.session() as session:
        result = session.run(query)

        versions = []

        for record in result:
            versions.append({
                "id": record["id"],
                "policy_version": record["policy_version"],
                "created_at": record["created_at"],
                "active": bool(record["active"]),
                "changes": record["changes"] or "Policy configuration update",
                "config": {
                    "max_autonomous_order_value_inr": record["max_autonomous_order_value_inr"],
                    "coupon_cap_new_account_inr": record["coupon_cap_new_account_inr"],
                    "coupon_cap_medium_risk_inr": record["coupon_cap_medium_risk_inr"],
                    "ring_node_threshold": record["ring_node_threshold"],
                    "otp_max_challenges_per_window": record["otp_max_challenges_per_window"],
                    "hold_expiry_minutes": record["hold_expiry_minutes"],
                },
            })

    return versions


@router.post("/versions/{version_id}/rollback")
def rollback_policy_version(version_id: str):
    driver = get_driver()

    with driver.session() as session:

        record = session.run(
            """
            MATCH (v:PolicyVersion {version_id: $version_id})
            RETURN
                v.max_autonomous_order_value_inr AS max_autonomous_order_value_inr,
                v.coupon_cap_new_account_inr AS coupon_cap_new_account_inr,
                v.coupon_cap_medium_risk_inr AS coupon_cap_medium_risk_inr,
                v.ring_node_threshold AS ring_node_threshold,
                v.otp_max_challenges_per_window AS otp_max_challenges_per_window,
                v.hold_expiry_minutes AS hold_expiry_minutes
            """,
            version_id=version_id,
        ).single()

        if record is None:
            raise HTTPException(
                status_code=404,
                detail=f"Policy version '{version_id}' not found",
            )

        config = {
            "max_autonomous_order_value_inr": record["max_autonomous_order_value_inr"],
            "coupon_cap_new_account_inr": record["coupon_cap_new_account_inr"],
            "coupon_cap_medium_risk_inr": record["coupon_cap_medium_risk_inr"],
            "ring_node_threshold": record["ring_node_threshold"],
            "otp_max_challenges_per_window": record["otp_max_challenges_per_window"],
            "hold_expiry_minutes": record["hold_expiry_minutes"],
        }

        session.run(
            """
            MATCH (p:PolicyConfig {policy_version: $policy_version})
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

        session.run(
            """
            MATCH (v:PolicyVersion)
            SET v.active = false
            """
        )

        rollback_id = f"rollback-{version_id}"

        session.run(
            """
            MERGE (v:PolicyVersion {version_id: $version_id})
            SET
                v.policy_version = $policy_version,
                v.created_at = toString(datetime()),
                v.active = true,
                v.changes = $changes,
                v.max_autonomous_order_value_inr = $max_autonomous_order_value_inr,
                v.coupon_cap_new_account_inr = $coupon_cap_new_account_inr,
                v.coupon_cap_medium_risk_inr = $coupon_cap_medium_risk_inr,
                v.ring_node_threshold = $ring_node_threshold,
                v.otp_max_challenges_per_window = $otp_max_challenges_per_window,
                v.hold_expiry_minutes = $hold_expiry_minutes
            """,
            version_id=rollback_id,
            policy_version=POLICY_VERSION,
            changes=f"Rolled back to {version_id}",
            **config,
        )

    return {
        "message": f"Policy rolled back to {version_id}.",
        "config": config,
    }