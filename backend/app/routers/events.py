from fastapi import APIRouter
from app.schemas.events import (
    AccountCreatedEvent,
    CheckoutInitiatedEvent,
    OrderCreatedEvent,
    PaymentUpdatedEvent,
    RefundRequestedEvent,
    ReturnEvent,
    AnalystActionEvent,
)

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/account-created")
def account_created(event: AccountCreatedEvent):
    # TODO: persist to graph + relational store
    return {"received": True, "event": event}


@router.post("/checkout-initiated")
def checkout_initiated(event: CheckoutInitiatedEvent):
    return {"received": True, "event": event}


@router.post("/order-created")
def order_created(event: OrderCreatedEvent):
    return {"received": True, "event": event}


@router.post("/payment-updated")
def payment_updated(event: PaymentUpdatedEvent):
    return {"received": True, "event": event}


@router.post("/refund-requested")
def refund_requested(event: RefundRequestedEvent):
    return {"received": True, "event": event}


@router.post("/return")
def return_event(event: ReturnEvent):
    return {"received": True, "event": event}


@router.post("/analyst-action")
def analyst_action(event: AnalystActionEvent):
    return {"received": True, "event": event}