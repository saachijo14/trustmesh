"""
Central audit-log writer for TrustMesh.
Every service (graph_ingestion, policy_engine, trustpass, analyst_actions,
razorpay_client) should call log_event() whenever it makes or records a
decision, so the full history of what happened — automated or human — is
queryable for the audit trail and CaseDetail/Metrics pages.
"""
import uuid
from datetime import datetime, timezone
from app.services.neo4j_client import get_driver


def log_event(
    event_type: str,
    customer_id: str,
    actor: str = "system",
    details: dict = None,
    order_id: str = None,
) -> dict:
    """
    Write a single audit event to Neo4j, linked to the customer
    (and order, if given).

    event_type: short code, e.g. "RISK_SCORED", "POLICY_DECISION",
                "TRUSTPASS_ISSUED", "ANALYST_ACTION", "PAYMENT_CREATED"
    customer_id: the Customer node this event relates to
    actor: "system" for automated events, or an analyst_id for human actions
    details: any JSON-serializable dict of event-specific info
             (e.g. {"decision": "STEP_UP_REQUIRED", "risk_score": 50.5})
    order_id: optional, links the event to an Order node too
    """
    event_id = f"audit_{uuid.uuid4().hex[:10]}"
    timestamp = datetime.now(timezone.utc).isoformat()
    details = details or {}

    driver = get_driver()
    query = """
    MATCH (c:Customer {customer_id: $customer_id})
    CREATE (a:AuditEvent {
        event_id: $event_id,
        event_type: $event_type,
        actor: $actor,
        timestamp: $timestamp,
        details: $details_json
    })
    CREATE (c)-[:HAS_AUDIT_EVENT]->(a)
    WITH a
    OPTIONAL MATCH (o:Order {order_id: $order_id})
    FOREACH (_ IN CASE WHEN $order_id IS NOT NULL AND o IS NOT NULL THEN [1] ELSE [] END |
        CREATE (a)-[:RELATES_TO_ORDER]->(o)
    )
    RETURN a.event_id AS event_id
    """
    import json
    with driver.session() as session:
        session.run(
            query,
            customer_id=customer_id,
            event_id=event_id,
            event_type=event_type,
            actor=actor,
            timestamp=timestamp,
            details_json=json.dumps(details),
            order_id=order_id,
        )

    return {
        "event_id": event_id,
        "event_type": event_type,
        "customer_id": customer_id,
        "actor": actor,
        "timestamp": timestamp,
        "details": details,
        "order_id": order_id,
    }


def get_audit_trail(customer_id: str = None, limit: int = 50) -> list[dict]:
    """
    Fetch recent audit events, optionally filtered to one customer.
    Used by the future GET /audit-log endpoint.
    """
    import json

    driver = get_driver()
    if customer_id:
        query = """
        MATCH (c:Customer {customer_id: $customer_id})-[:HAS_AUDIT_EVENT]->(a:AuditEvent)
        RETURN a.event_id AS event_id, a.event_type AS event_type,
               a.actor AS actor, a.timestamp AS timestamp, a.details AS details,
               c.customer_id AS customer_id
        ORDER BY a.timestamp DESC
        LIMIT $limit
        """
        params = {"customer_id": customer_id, "limit": limit}
    else:
        query = """
        MATCH (c:Customer)-[:HAS_AUDIT_EVENT]->(a:AuditEvent)
        RETURN a.event_id AS event_id, a.event_type AS event_type,
               a.actor AS actor, a.timestamp AS timestamp, a.details AS details,
               c.customer_id AS customer_id
        ORDER BY a.timestamp DESC
        LIMIT $limit
        """
        params = {"limit": limit}

    driver = get_driver()
    with driver.session() as session:
        records = session.run(query, **params)
        results = []
        for record in records:
            entry = dict(record)
            entry["details"] = json.loads(entry["details"]) if entry["details"] else {}
            results.append(entry)
        return results


if __name__ == "__main__":
    # Quick manual test
    result = log_event(
        event_type="TEST_EVENT",
        customer_id="ringA_customer_0",
        actor="system",
        details={"note": "audit_log.py smoke test"},
    )
    print("Logged:", result)

    trail = get_audit_trail(customer_id="ringA_customer_0", limit=5)
    print("Trail:")
    for entry in trail:
        print(" ", entry)