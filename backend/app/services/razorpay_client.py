import hashlib
import hmac
import os
from typing import Any

import razorpay
from dotenv import load_dotenv

load_dotenv()


RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET")


if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
    client = None
else:
    client = razorpay.Client(
        auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
    )


def is_configured() -> bool:
    return client is not None


def get_key_id() -> str:
    if not RAZORPAY_KEY_ID:
        raise RuntimeError("RAZORPAY_KEY_ID is not configured")
    return RAZORPAY_KEY_ID


def create_order(
    amount_inr: float,
    receipt: str,
    customer_id: str,
    cart_id: str,
) -> dict[str, Any]:
    if client is None:
        raise RuntimeError(
            "Razorpay is not configured. "
            "Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env"
        )

    amount_paise = int(round(amount_inr * 100))

    if amount_paise <= 0:
        raise ValueError("Payment amount must be greater than zero")

    data = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt,
        "notes": {
            "customer_id": customer_id,
            "cart_id": cart_id,
        },
    }

    return client.order.create(data=data)


def fetch_payment(payment_id: str) -> dict[str, Any]:
    if client is None:
        raise RuntimeError("Razorpay is not configured")

    return client.payment.fetch(payment_id)


def fetch_order(order_id: str) -> dict[str, Any]:
    if client is None:
        raise RuntimeError("Razorpay is not configured")

    return client.order.fetch(order_id)


def verify_payment_signature(
    order_id: str,
    payment_id: str,
    signature: str,
) -> bool:
    if not RAZORPAY_KEY_SECRET:
        raise RuntimeError(
            "RAZORPAY_KEY_SECRET is not configured"
        )

    message = f"{order_id}|{payment_id}".encode("utf-8")

    generated_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        message,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(
        generated_signature,
        signature,
    )


def verify_webhook_signature(
    payload: bytes,
    signature: str,
) -> bool:
    if not RAZORPAY_WEBHOOK_SECRET:
        raise RuntimeError(
            "RAZORPAY_WEBHOOK_SECRET is not configured"
        )

    generated_signature = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(
        generated_signature,
        signature,
    )