"""
Entity graph evidence for TrustMesh case details.

Builds a customer-centered graph from Neo4j so the Case Detail
page can display the actual entities and relationships associated
with an alert.
"""

from app.services.neo4j_client import get_driver


def _node(node_id: str, node_type: str, label: str, **properties) -> dict:
    """Create a normalized graph node."""
    return {
        "id": node_id,
        "type": node_type,
        "label": label,
        "properties": properties,
    }


def _edge(
    source: str,
    target: str,
    relationship: str,
    **properties,
) -> dict:
    """Create a normalized graph edge."""
    return {
        "source": source,
        "target": target,
        "relationship": relationship,
        "properties": properties,
    }


def get_alert_graph(customer_id: str) -> dict:
    """
    Build the entity graph centered on one customer.

    The graph includes:
    - Customer
    - shared Devices
    - Orders
    - Coupons redeemed by those orders
    - Refunds
    - Refund destinations

    It also identifies customers that share graph entities with
    the subject customer. Those relationships are useful evidence
    for the Case Detail graph.
    """

    driver = get_driver()

    nodes: dict[str, dict] = {}
    edges: dict[tuple[str, str, str], dict] = {}

    def add_node(node: dict):
        nodes[node["id"]] = node

    def add_edge(edge: dict):
        key = (
            edge["source"],
            edge["target"],
            edge["relationship"],
        )
        edges[key] = edge

    with driver.session() as session:

        # ---------------------------------------------------------
        # Customer
        # ---------------------------------------------------------
        result = session.run(
            """
            MATCH (c:Customer {customer_id: $customer_id})
            RETURN
                c.customer_id AS customer_id,
                c.ring_id AS ring_id
            """,
            customer_id=customer_id,
        )

        customer_record = result.single()

        if customer_record is None:
            return {
                "customer_id": customer_id,
                "nodes": [],
                "edges": [],
                "summary": {
                    "node_count": 0,
                    "edge_count": 0,
                    "shared_customer_count": 0,
                    "ring_id": None,
                },
            }

        add_node(
            _node(
                f"customer:{customer_id}",
                "Customer",
                customer_id,
                customer_id=customer_id,
                ring_id=customer_record["ring_id"],
            )
        )

        # ---------------------------------------------------------
        # Customer → Device
        # ---------------------------------------------------------
        result = session.run(
            """
            MATCH (c:Customer {customer_id: $customer_id})
                  -[:USES]->(d:Device)
            RETURN
                d.device_hash AS device_hash
            """,
            customer_id=customer_id,
        )

        for record in result:
            device_hash = record["device_hash"]

            if not device_hash:
                continue

            device_id = f"device:{device_hash}"

            add_node(
                _node(
                    device_id,
                    "Device",
                    device_hash,
                    device_hash=device_hash,
                )
            )

            add_edge(
                _edge(
                    f"customer:{customer_id}",
                    device_id,
                    "USES",
                )
            )

        # ---------------------------------------------------------
        # Customer → Order → Coupon
        # ---------------------------------------------------------
        result = session.run(
            """
            MATCH (c:Customer {customer_id: $customer_id})
                  -[:PLACES]->(o:Order)

            OPTIONAL MATCH (o)-[:REDEEMS]->(cp:Coupon)

            RETURN
                o.order_id AS order_id,
                o.amount AS amount,
                o.timestamp AS timestamp,
                cp.code AS coupon_code
            """,
            customer_id=customer_id,
        )

        for record in result:
            order_id = record["order_id"]

            if not order_id:
                continue

            order_node_id = f"order:{order_id}"

            add_node(
                _node(
                    order_node_id,
                    "Order",
                    order_id,
                    order_id=order_id,
                    amount=record["amount"],
                    timestamp=record["timestamp"],
                )
            )

            add_edge(
                _edge(
                    f"customer:{customer_id}",
                    order_node_id,
                    "PLACES",
                )
            )

            coupon_code = record["coupon_code"]

            if coupon_code:
                coupon_node_id = f"coupon:{coupon_code}"

                add_node(
                    _node(
                        coupon_node_id,
                        "Coupon",
                        coupon_code,
                        code=coupon_code,
                    )
                )

                add_edge(
                    _edge(
                        order_node_id,
                        coupon_node_id,
                        "REDEEMS",
                    )
                )

        # ---------------------------------------------------------
        # Customer → Order → Refund → RefundDestination
        # ---------------------------------------------------------
        result = session.run(
            """
            MATCH (c:Customer {customer_id: $customer_id})
                  -[:PLACES]->(o:Order)
                  -[:RESULTS_IN]->(r:Refund)
                  -[:SENT_TO]->(rd:RefundDestination)

            RETURN
                o.order_id AS order_id,
                r.refund_id AS refund_id,
                rd.refund_ref_hash AS refund_ref_hash
            """,
            customer_id=customer_id,
        )

        for record in result:
            order_id = record["order_id"]
            refund_id = record["refund_id"]
            refund_ref_hash = record["refund_ref_hash"]

            if not order_id or not refund_id:
                continue

            order_node_id = f"order:{order_id}"
            refund_node_id = f"refund:{refund_id}"

            # The order may already have been added by the
            # Customer → Order query.
            add_node(
                _node(
                    refund_node_id,
                    "Refund",
                    refund_id,
                    refund_id=refund_id,
                )
            )

            add_edge(
                _edge(
                    order_node_id,
                    refund_node_id,
                    "RESULTS_IN",
                )
            )

            if refund_ref_hash:
                destination_node_id = (
                    f"refund_destination:{refund_ref_hash}"
                )

                add_node(
                    _node(
                        destination_node_id,
                        "RefundDestination",
                        refund_ref_hash,
                        refund_ref_hash=refund_ref_hash,
                    )
                )

                add_edge(
                    _edge(
                        refund_node_id,
                        destination_node_id,
                        "SENT_TO",
                    )
                )

        # ---------------------------------------------------------
        # Shared graph entities → other customers
        #
        # This gives the Case Detail graph the important
        # customer-to-customer evidence.
        # ---------------------------------------------------------

        result = session.run(
            """
            MATCH (c:Customer {customer_id: $customer_id})
                  -[:USES]->(d:Device)
                  <-[:USES]-(other:Customer)

            WHERE other.customer_id <> $customer_id

            RETURN DISTINCT
                other.customer_id AS other_customer_id,
                d.device_hash AS device_hash
            """,
            customer_id=customer_id,
        )

        for record in result:
            other_customer_id = record["other_customer_id"]
            device_hash = record["device_hash"]

            if not other_customer_id:
                continue

            other_node_id = f"customer:{other_customer_id}"

            add_node(
                _node(
                    other_node_id,
                    "Customer",
                    other_customer_id,
                    customer_id=other_customer_id,
                )
            )

            device_node_id = f"device:{device_hash}"

            add_edge(
                _edge(
                    other_node_id,
                    device_node_id,
                    "USES",
                    evidence="shared_device",
                )
            )

        # ---------------------------------------------------------
        # Shared coupon → other customers
        # ---------------------------------------------------------
        result = session.run(
            """
            MATCH (c:Customer {customer_id: $customer_id})
                  -[:PLACES]->(:Order)
                  -[:REDEEMS]->(cp:Coupon)
                  <-[:REDEEMS]-(:Order)
                  <-[:PLACES]-(other:Customer)

            WHERE other.customer_id <> $customer_id

            RETURN DISTINCT
                other.customer_id AS other_customer_id,
                cp.code AS coupon_code
            """,
            customer_id=customer_id,
        )

        for record in result:
            other_customer_id = record["other_customer_id"]
            coupon_code = record["coupon_code"]

            if not other_customer_id or not coupon_code:
                continue

            other_node_id = f"customer:{other_customer_id}"
            coupon_node_id = f"coupon:{coupon_code}"

            add_node(
                _node(
                    other_node_id,
                    "Customer",
                    other_customer_id,
                    customer_id=other_customer_id,
                )
            )

            add_node(
                _node(
                    coupon_node_id,
                    "Coupon",
                    coupon_code,
                    code=coupon_code,
                )
            )

            add_edge(
                _edge(
                    other_node_id,
                    coupon_node_id,
                    "REDEEMS",
                    evidence="shared_coupon",
                )
            )

        # ---------------------------------------------------------
        # Shared refund destination → other customers
        # ---------------------------------------------------------
        result = session.run(
            """
            MATCH (c:Customer {customer_id: $customer_id})
                  -[:PLACES]->(:Order)
                  -[:RESULTS_IN]->(:Refund)
                  -[:SENT_TO]->(rd:RefundDestination)
                  <-[:SENT_TO]-(:Refund)
                  <-[:RESULTS_IN]-(:Order)
                  <-[:PLACES]-(other:Customer)

            WHERE other.customer_id <> $customer_id

            RETURN DISTINCT
                other.customer_id AS other_customer_id,
                rd.refund_ref_hash AS refund_ref_hash
            """,
            customer_id=customer_id,
        )

        for record in result:
            other_customer_id = record["other_customer_id"]
            refund_ref_hash = record["refund_ref_hash"]

            if not other_customer_id or not refund_ref_hash:
                continue

            other_node_id = f"customer:{other_customer_id}"
            destination_node_id = (
                f"refund_destination:{refund_ref_hash}"
            )

            add_node(
                _node(
                    other_node_id,
                    "Customer",
                    other_customer_id,
                    customer_id=other_customer_id,
                )
            )

            add_node(
                _node(
                    destination_node_id,
                    "RefundDestination",
                    refund_ref_hash,
                    refund_ref_hash=refund_ref_hash,
                )
            )

            add_edge(
                _edge(
                    other_node_id,
                    destination_node_id,
                    "SENT_TO",
                    evidence="shared_refund_destination",
                )
            )

    customer_node_id = f"customer:{customer_id}"

    shared_customers = [
        node
        for node in nodes.values()
        if node["type"] == "Customer"
        and node["id"] != customer_node_id
    ]

    return {
        "customer_id": customer_id,
        "nodes": list(nodes.values()),
        "edges": list(edges.values()),
        "summary": {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "shared_customer_count": len(shared_customers),
            "ring_id": customer_record["ring_id"],
        },
    }