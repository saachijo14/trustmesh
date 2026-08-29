from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class AccountCreatedEvent(BaseModel):
    """Fired when a new customer account is created."""
    customer_id: str
    phone_hash: str
    device_hash: str
    ip_hash: str
    created_at: datetime


class CheckoutInitiatedEvent(BaseModel):
    """Fired when a customer or buyer agent starts a checkout."""
    customer_id: str
    cart_id: str
    amount: float
    product_category: str
    timestamp: datetime


class OrderCreatedEvent(BaseModel):
    """Fired when an order is placed."""
    order_id: str
    customer_id: str
    amount: float
    coupon_code: Optional[str] = None
    address_hash: str
    payment_ref_hash: str
    timestamp: datetime


class PaymentUpdatedEvent(BaseModel):
    """Fired when a payment's status changes."""
    order_id: str
    payment_id: str
    status: str  # e.g. "created", "authorized", "captured", "failed"
    failure_reason: Optional[str] = None
    timestamp: datetime


class RefundRequestedEvent(BaseModel):
    """Fired when a refund is requested for an order."""
    order_id: str
    refund_id: str
    refund_amount: float
    refund_ref_hash: str
    reason: str
    timestamp: datetime


class ReturnEvent(BaseModel):
    """Fired when a product return is initiated or updated."""
    order_id: str
    return_reason: str
    status: str  # e.g. "initiated", "received", "completed"
    timestamp: datetime


class AnalystActionEvent(BaseModel):
    """Fired when an analyst takes an action on an alert."""
    alert_id: str
    action: str  # e.g. "ALLOW", "HOLD_FOR_REVIEW", "MARK_ABUSE"
    reviewer: str
    reason: str
    timestamp: datetime