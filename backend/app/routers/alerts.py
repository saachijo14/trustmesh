"""
Alerts API for TrustMesh — powers the Alert Queue and CaseDetail frontend pages.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.services.analyst_actions import list_alerts, get_alert, record_analyst_action
from app.services.alert_graph import get_alert_graph

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AnalystActionRequest(BaseModel):
    action: str  # ALLOW | OTP | HOLD | ESCALATE | MARK_ABUSE | FALSE_POSITIVE
    analyst_id: str
    notes: str | None = ""


@router.get("")
def get_alerts(status: str | None = Query(None), risk_tier: str | None = Query(None)):
    """List alerts for the Alert Queue, optionally filtered by status or risk tier."""
    return list_alerts(status=status, risk_tier=risk_tier)


@router.get("/{alert_id}/graph")
def get_alert_graph_detail(alert_id: str):
    alert = get_alert(alert_id)

    if alert is None:
        raise HTTPException(
            status_code=404,
            detail=f"Alert '{alert_id}' not found",
        )

    customer_id = alert.get("customer_id")

    if not customer_id:
        raise HTTPException(
            status_code=400,
            detail=f"Alert '{alert_id}' has no customer_id",
        )

    graph = get_alert_graph(customer_id)

    return {
        "alert_id": alert_id,
        **graph,
    }

@router.get("/{alert_id}")
def get_alert_detail(alert_id: str):
    """Fetch a single alert for the CaseDetail page."""
    alert = get_alert(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")
    return alert


@router.post("/{alert_id}/action")
def take_alert_action(alert_id: str, req: AnalystActionRequest):
    """Apply an analyst decision to an alert (Allow/OTP/Hold/Escalate/Mark Abuse/False Positive)."""
    try:
        return record_analyst_action(alert_id, req.action, req.analyst_id, req.notes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))