from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.risk_scoring import compute_risk_score
from app.services.policy_engine import apply_policy
from app.services.trustpass import issue_trustpass
from app.services.analyst_actions import create_alert
from app.services.neo4j_client import get_driver
from app.services.razorpay_client import (
    create_order,
    fetch_order,
    fetch_payment,
    get_key_id,
    is_configured,
    verify_payment_signature,
)


router = APIRouter(prefix="/checkout", tags=["checkout"])


class EvaluateCheckoutRequest(BaseModel):
    customer_id: str
    cart_id: str
    order_amount: float
    coupon_cap_inr: float | None = 100


class CreatePaymentOrderRequest(BaseModel):
    customer_id: str
    cart_id: str
    amount_inr: float


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


@router.post("/evaluate")
def evaluate_checkout(req: EvaluateCheckoutRequest):
    """
    Full checkout evaluation pipeline:
    risk score -> policy decision -> TrustPass -> alert.
    """

    risk = compute_risk_score(req.customer_id)

    policy = apply_policy(
        risk,
        order_amount=req.order_amount,
    )

    order_creation_allowed = any(
        action in policy["allowed_actions"]
        for action in (
            "CREATE_ORDER",
            "CREATE_ORDER_AFTER_OTP",
        )
    )

    trustpass = issue_trustpass(
        policy,
        subject_type="checkout",
        subject_id=req.cart_id,
        max_permitted_amount_inr=(
            req.order_amount
            if order_creation_allowed
            else 0
        ),
        coupon_cap_inr=req.coupon_cap_inr,
    )

    create_alert(
        risk,
        policy,
        order_id=req.cart_id,
        order_amount=req.order_amount,
    )

    return {
        "risk": risk,
        "policy": policy,
        "trustpass": trustpass,
    }


@router.post("/payment/order")
def create_payment_order(req: CreatePaymentOrderRequest):
    """
    Create a Razorpay order after TrustMesh has allowed
    the checkout to proceed.
    """

    if not is_configured():
        raise HTTPException(
            status_code=503,
            detail=(
                "Razorpay is not configured. "
                "Add RAZORPAY_KEY_ID and "
                "RAZORPAY_KEY_SECRET to .env"
            ),
        )

    if req.amount_inr <= 0:
        raise HTTPException(
            status_code=400,
            detail="Payment amount must be greater than zero",
        )

    receipt = f"tm_{req.cart_id}"

    try:
        razorpay_order = create_order(
            amount_inr=req.amount_inr,
            receipt=receipt,
            customer_id=req.customer_id,
            cart_id=req.cart_id,
        )

        driver = get_driver()

        with driver.session() as session:
            session.run(
                """
                CREATE (p:RazorpayOrder {
                    razorpay_order_id: $razorpay_order_id,
                    customer_id: $customer_id,
                    cart_id: $cart_id,
                    amount_inr: $amount_inr,
                    amount_paise: $amount_paise,
                    currency: $currency,
                    status: $status,
                    created_at: toString(datetime())
                })
                """,
                razorpay_order_id=razorpay_order["id"],
                customer_id=req.customer_id,
                cart_id=req.cart_id,
                amount_inr=req.amount_inr,
                amount_paise=razorpay_order["amount"],
                currency=razorpay_order["currency"],
                status=razorpay_order["status"],
            )

        return {
            "key_id": get_key_id(),
            "order_id": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "receipt": razorpay_order.get("receipt"),
            "status": razorpay_order.get("status"),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to create Razorpay order: {str(e)}",
        )


@router.post("/payment/verify")
def verify_payment(req: VerifyPaymentRequest):
    """
    Verify Razorpay payment signature and confirm payment status.
    """

    try:
        driver = get_driver()

        with driver.session() as session:
            stored_order = session.run(
                """
                MATCH (p:RazorpayOrder {
                    razorpay_order_id: $razorpay_order_id
                })
                RETURN p
                """,
                razorpay_order_id=req.razorpay_order_id,
            ).single()

        if stored_order is None:
            raise HTTPException(
                status_code=400,
                detail="Razorpay order is not recognized by TrustMesh",
            )

        stored_order_id = stored_order["p"]["razorpay_order_id"]

        # IMPORTANT:
        # The server-side stored order ID is used for signature
        # verification instead of trusting the client value.
        signature_valid = verify_payment_signature(
            order_id=stored_order_id,
            payment_id=req.razorpay_payment_id,
            signature=req.razorpay_signature,
        )

        if not signature_valid:
            with driver.session() as session:
                session.run(
                    """
                    MATCH (p:RazorpayOrder {
                        razorpay_order_id: $order_id
                    })
                    SET
                        p.status = "signature_failed",
                        p.payment_id = $payment_id,
                        p.updated_at = toString(datetime())
                    """,
                    order_id=stored_order_id,
                    payment_id=req.razorpay_payment_id,
                )

            raise HTTPException(
                status_code=400,
                detail="Invalid Razorpay payment signature",
            )

        payment = fetch_payment(
            req.razorpay_payment_id
        )

        razorpay_order = fetch_order(
            stored_order_id
        )

        payment_order_id = payment.get("order_id")

        if payment_order_id != stored_order_id:
            raise HTTPException(
                status_code=400,
                detail="Payment does not belong to the expected order",
            )

        stored_amount_paise = int(
            stored_order["p"]["amount_paise"]
        )

        payment_amount_paise = int(
            payment.get("amount", 0)
        )

        if payment_amount_paise != stored_amount_paise:
            raise HTTPException(
                status_code=400,
                detail="Payment amount does not match TrustMesh order",
            )

        payment_status = payment.get("status")
        order_status = razorpay_order.get("status")

        with driver.session() as session:
            session.run(
                """
                MATCH (p:RazorpayOrder {
                    razorpay_order_id: $order_id
                })
                SET
                    p.payment_id = $payment_id,
                    p.payment_status = $payment_status,
                    p.order_status = $order_status,
                    p.status = $final_status,
                    p.updated_at = toString(datetime())
                """,
                order_id=stored_order_id,
                payment_id=req.razorpay_payment_id,
                payment_status=payment_status,
                order_status=order_status,
                final_status=(
                    "paid"
                    if payment_status == "captured"
                    else payment_status
                ),
            )

        if payment_status != "captured":
            return {
                "verified": True,
                "paid": False,
                "payment_id": req.razorpay_payment_id,
                "order_id": stored_order_id,
                "payment_status": payment_status,
                "order_status": order_status,
                "message": (
                    "Payment signature verified, "
                    "but payment is not captured yet."
                ),
            }

        return {
            "verified": True,
            "paid": True,
            "payment_id": req.razorpay_payment_id,
            "order_id": stored_order_id,
            "payment_status": payment_status,
            "order_status": order_status,
            "amount_inr": stored_amount_paise / 100,
            "message": "Payment verified and captured successfully.",
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Payment verification failed: {str(e)}",
        )