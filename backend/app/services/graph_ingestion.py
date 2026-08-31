"""
Ingests TrustMesh events into Neo4j as a heterogeneous relationship graph:
Customer --uses--> Device
Customer --uses--> Phone
Customer --seen_from--> IP
Customer --shipped_to--> Address
Customer --places--> Order
Order --redeems--> Coupon
Order --paid_with--> PaymentRef
Order --results_in--> Refund
Refund --sent_to--> RefundDestination
"""
from app.services.neo4j_client import get_driver


def setup_constraints():
    """Create uniqueness constraints so MERGE operations are fast and safe."""
    driver = get_driver()
    constraints = [
        "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Customer) REQUIRE c.customer_id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (d:Device) REQUIRE d.device_hash IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Phone) REQUIRE p.phone_hash IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (ip:IP) REQUIRE ip.ip_hash IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (a:Address) REQUIRE a.address_hash IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (o:Order) REQUIRE o.order_id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (cp:Coupon) REQUIRE cp.code IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (pr:PaymentRef) REQUIRE pr.payment_ref_hash IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (r:Refund) REQUIRE r.refund_id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (rd:RefundDestination) REQUIRE rd.refund_ref_hash IS UNIQUE",
    ]
    with driver.session() as session:
        for stmt in constraints:
            session.run(stmt)


def ingest_account_created(event: dict):
    """Create/merge a Customer node and link it to Device, Phone, IP."""
    driver = get_driver()
    query = """
    MERGE (c:Customer {customer_id: $customer_id})
    ON CREATE SET c.created_at = $created_at

    MERGE (d:Device {device_hash: $device_hash})
    MERGE (c)-[:USES]->(d)

    MERGE (p:Phone {phone_hash: $phone_hash})
    MERGE (c)-[:USES]->(p)

    MERGE (ip:IP {ip_hash: $ip_hash})
    MERGE (c)-[:SEEN_FROM]->(ip)
    """
    with driver.session() as session:
        session.run(query, **event)


def ingest_order_created(event: dict):
    """Create/merge an Order node, link to Customer, Address, PaymentRef, and optionally Coupon."""
    driver = get_driver()
    query = """
    MATCH (c:Customer {customer_id: $customer_id})
    MERGE (o:Order {order_id: $order_id})
    ON CREATE SET o.amount = $amount, o.timestamp = $timestamp
    MERGE (c)-[:PLACES]->(o)

    MERGE (a:Address {address_hash: $address_hash})
    MERGE (c)-[:SHIPPED_TO]->(a)

    MERGE (pr:PaymentRef {payment_ref_hash: $payment_ref_hash})
    MERGE (o)-[:PAID_WITH]->(pr)
    """
    with driver.session() as session:
        session.run(query, **event)

        # Coupon is optional
        if event.get("coupon_code"):
            coupon_query = """
            MATCH (o:Order {order_id: $order_id})
            MERGE (cp:Coupon {code: $coupon_code})
            MERGE (o)-[:REDEEMS]->(cp)
            """
            session.run(coupon_query, order_id=event["order_id"], coupon_code=event["coupon_code"])


def ingest_refund_requested(event: dict):
    """Create/merge a Refund node, link to Order and RefundDestination."""
    driver = get_driver()
    query = """
    MATCH (o:Order {order_id: $order_id})
    MERGE (r:Refund {refund_id: $refund_id})
    ON CREATE SET r.refund_amount = $refund_amount, r.reason = $reason, r.timestamp = $timestamp
    MERGE (o)-[:RESULTS_IN]->(r)

    MERGE (rd:RefundDestination {refund_ref_hash: $refund_ref_hash})
    MERGE (r)-[:SENT_TO]->(rd)
    """
    with driver.session() as session:
        session.run(query, **event)


def ingest_events(events: list[dict]) -> dict:
    """
    Ingest a list of generated events into Neo4j, dispatching by event type.
    Events are sorted chronologically first, since order-created and
    refund-requested events depend on their parent Customer/Order already
    existing in the graph.
    Returns a summary of how many of each type were processed.
    """
    setup_constraints()

    # Sort chronologically: account_created uses 'created_at', others use 'timestamp'
    def event_time(e: dict) -> str:
        return e.get("created_at") or e.get("timestamp")

    sorted_events = sorted(events, key=event_time)

    counts = {"account_created": 0, "order_created": 0, "refund_requested": 0}

    for event in sorted_events:
        event_type = event["type"]
        payload = {k: v for k, v in event.items() if k != "type"}

        if event_type == "account_created":
            ingest_account_created(payload)
            counts["account_created"] += 1
        elif event_type == "order_created":
            ingest_order_created(payload)
            counts["order_created"] += 1
        elif event_type == "refund_requested":
            ingest_refund_requested(payload)
            counts["refund_requested"] += 1

    return counts