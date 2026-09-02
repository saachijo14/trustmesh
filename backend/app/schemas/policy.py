from pydantic import BaseModel, Field


class PolicyConfig(BaseModel):
    max_autonomous_order_value_inr: float = Field(
        default=50000,
        ge=0,
    )

    coupon_cap_new_account_inr: float = Field(
        default=100,
        ge=0,
    )

    coupon_cap_medium_risk_inr: float = Field(
        default=100,
        ge=0,
    )

    ring_node_threshold: int = Field(
        default=15,
        ge=1,
    )

    otp_max_challenges_per_window: int = Field(
        default=3,
        ge=1,
    )

    hold_expiry_minutes: int = Field(
        default=30,
        ge=1,
    )


class PolicyEvaluationRequest(BaseModel):
    customer_id: str
    order_amount: float = Field(
        default=0,
        ge=0,
    )


class PolicyUpdateRequest(BaseModel):
    config: PolicyConfig