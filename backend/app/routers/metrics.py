from fastapi import APIRouter

from app.services.metrics import get_metrics


router = APIRouter(
    prefix="/metrics",
    tags=["metrics"],
)


@router.get("")
def metrics():
    """
    Return operational risk and evaluation metrics.
    """
    return get_metrics()