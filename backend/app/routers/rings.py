"""
Ring Explorer API for TrustMesh.

Exposes detected customer rings and their graph relationships
for the Ring Explorer frontend.
"""

from fastapi import APIRouter, HTTPException

from app.services.ring_detection import (
    detect_rings,
    write_ring_labels_to_neo4j,
)
from app.services.neo4j_client import get_driver


router = APIRouter(prefix="/rings", tags=["rings"])


@router.get("")
def get_rings():
    """
    Return all detected rings.

    Each ring contains:
    - ring_id
    - customer_ids
    - size
    - edge_count
    - signals
    """

    rings = detect_rings()

    # Keep Neo4j ring_id values synchronized with the latest detection.
    write_ring_labels_to_neo4j(rings)

    return rings


@router.get("/{ring_id}")
def get_ring_detail(ring_id: str):
    """
    Return detailed information about one ring,
    including its customers and the shared entities
    connecting those customers.
    """

    rings = detect_rings()

    ring = next(
        (r for r in rings if r["ring_id"] == ring_id),
        None,
    )

    if ring is None:
        raise HTTPException(
            status_code=404,
            detail=f"Ring '{ring_id}' not found",
        )

    customer_ids = ring["customer_ids"]

    driver = get_driver()

    with driver.session() as session:

        # ---------------------------------------------------------
        # 1. Customer details
        # ---------------------------------------------------------
        customer_result = session.run(
            """
            MATCH (c:Customer)
            WHERE c.customer_id IN $customer_ids
            RETURN c.customer_id AS customer_id,
                   c.ring_id AS ring_id
            ORDER BY c.customer_id
            """,
            customer_ids=customer_ids,
        )

        customers = [
            {
                "customer_id": record["customer_id"],
                "ring_id": record["ring_id"],
            }
            for record in customer_result
        ]

        # ---------------------------------------------------------
        # 2. Shared devices
        # ---------------------------------------------------------
        device_result = session.run("""
        MATCH (c1:Customer)-[:USES]->(d:Device)<-[:USES]-(c2:Customer)
        WHERE c1.customer_id IN $customer_ids
        AND c2.customer_id IN $customer_ids
        AND c1.customer_id < c2.customer_id
        RETURN c1.customer_id AS source,
        c2.customer_id AS target,
        'DEVICE_SHARED' AS relationship,
        d.device_hash AS shared_entity
        """, customer_ids=customer_ids)

        device_edges = [
            {
                "source": record["source"],
                "target": record["target"],
                "relationship": record["relationship"],
                "shared_entity": record["shared_entity"],
            }
            for record in device_result
        ]

        # ---------------------------------------------------------
        # 3. Shared coupons
        # ---------------------------------------------------------
        coupon_result = session.run("""
        MATCH (c1:Customer)-[:PLACES]->(:Order)-[:REDEEMS]->(cp:Coupon)
        <-[:REDEEMS]-(:Order)<-[:PLACES]-(c2:Customer)
        WHERE c1.customer_id IN $customer_ids
        AND c2.customer_id IN $customer_ids
        AND c1.customer_id < c2.customer_id
        RETURN c1.customer_id AS source,
        c2.customer_id AS target,
        'COUPON_SHARED' AS relationship,
        cp.code AS shared_entity
        """, customer_ids=customer_ids)

        coupon_edges = [
            {
                "source": record["source"],
                "target": record["target"],
                "relationship": record["relationship"],
                "shared_entity": record["shared_entity"],
            }
            for record in coupon_result
        ]

        # ---------------------------------------------------------
        # 4. Shared refund destinations
        # ---------------------------------------------------------
        refund_result = session.run("""
        MATCH (c1:Customer)-[:PLACES]->(:Order)
          -[:RESULTS_IN]->(:Refund)
          -[:SENT_TO]->(rd:RefundDestination)
          <-[:SENT_TO]-(:Refund)
          <-[:RESULTS_IN]-(:Order)
          <-[:PLACES]-(c2:Customer)
        WHERE c1.customer_id IN $customer_ids
        AND c2.customer_id IN $customer_ids
        AND c1.customer_id < c2.customer_id
        RETURN c1.customer_id AS source,
           c2.customer_id AS target,
           'REFUND_DESTINATION_SHARED' AS relationship,
           rd.refund_ref_hash AS shared_entity
        """, customer_ids=customer_ids)

        refund_edges = [
            {
                "source": record["source"],
                "target": record["target"],
                "relationship": record["relationship"],
                "shared_entity": record["shared_entity"],
            }
            for record in refund_result
        ]

    edges = device_edges + coupon_edges + refund_edges

    return {
        **ring,
        "customers": customers,
        "edges": edges,
    }