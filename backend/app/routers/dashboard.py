from fastapi import APIRouter

from app.services.dashboard import get_dashboard


router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
)


@router.get("")
def dashboard():
    """
    Return the complete Risk Dashboard dataset.
    """
    return get_dashboard()