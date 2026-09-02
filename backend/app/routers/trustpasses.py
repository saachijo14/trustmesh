from fastapi import APIRouter, HTTPException

from app.services.trustpass import (
    list_trustpasses,
    get_trustpass,
    get_customer_trustpasses,
)


router = APIRouter(
    prefix="/trustpasses",
    tags=["trustpasses"],
)


@router.get("")
def get_all_trustpasses():
    """
    Return the TrustPass registry.
    """
    return list_trustpasses()


@router.get("/customer/{customer_id}")
def get_trustpasses_for_customer(customer_id: str):
    """
    Return all TrustPasses issued for a customer.
    """
    return get_customer_trustpasses(customer_id)


@router.get("/{trustpass_id}")
def get_trustpass_detail(trustpass_id: str):
    """
    Return one TrustPass by TrustPass ID.
    """
    trustpass = get_trustpass(trustpass_id)

    if trustpass is None:
        raise HTTPException(
            status_code=404,
            detail=f"TrustPass '{trustpass_id}' not found",
        )

    return trustpass