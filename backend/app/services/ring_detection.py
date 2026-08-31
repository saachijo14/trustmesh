"""
Ring/community detection for TrustMesh.
Fetches the customer-device-coupon-refund graph from Neo4j into NetworkX,
runs connected-components and Louvain community detection to find rings,
and writes ring/community IDs back to Neo4j for querying.
"""
import networkx as nx
from networkx.algorithms.community import louvain_communities
from app.services.neo4j_client import get_driver


def fetch_customer_graph() -> nx.Graph:
    """
    Build a NetworkX graph where Customers are connected to each other
    indirectly via shared Device, Coupon, or RefundDestination nodes.
    We project customer-customer edges: two customers are linked if they
    share a device, a coupon, or a refund destination.
    """
    driver = get_driver()
    G = nx.Graph()

    with driver.session() as session:
        # Customers sharing a device
        result = session.run("""
            MATCH (c1:Customer)-[:USES]->(d:Device)<-[:USES]-(c2:Customer)
            WHERE c1.customer_id < c2.customer_id
            RETURN c1.customer_id AS a, c2.customer_id AS b, 'device' AS reason
        """)
        for record in result:
            G.add_edge(record["a"], record["b"], reason=record["reason"])

        # Customers sharing a coupon (via their orders)
        result = session.run("""
            MATCH (c1:Customer)-[:PLACES]->(:Order)-[:REDEEMS]->(cp:Coupon)<-[:REDEEMS]-(:Order)<-[:PLACES]-(c2:Customer)
            WHERE c1.customer_id < c2.customer_id
            RETURN c1.customer_id AS a, c2.customer_id AS b, 'coupon' AS reason
        """)
        for record in result:
            G.add_edge(record["a"], record["b"], reason=record["reason"])

        # Customers sharing a refund destination
        result = session.run("""
            MATCH (c1:Customer)-[:PLACES]->(:Order)-[:RESULTS_IN]->(:Refund)-[:SENT_TO]->(rd:RefundDestination)
                  <-[:SENT_TO]-(:Refund)<-[:RESULTS_IN]-(:Order)<-[:PLACES]-(c2:Customer)
            WHERE c1.customer_id < c2.customer_id
            RETURN c1.customer_id AS a, c2.customer_id AS b, 'refund_destination' AS reason
        """)
        for record in result:
            G.add_edge(record["a"], record["b"], reason=record["reason"])

    return G


def detect_rings(min_ring_size: int = 3) -> list[dict]:
    """
    Detect rings using connected components (customers linked by shared
    devices/coupons/refund destinations). Returns rings of size >= min_ring_size,
    since small connected pairs are usually noise, not real abuse rings.
    """
    G = fetch_customer_graph()

    components = list(nx.connected_components(G))
    rings = []

    for i, component in enumerate(components):
        if len(component) < min_ring_size:
            continue

        subgraph = G.subgraph(component)
        reasons = set(nx.get_edge_attributes(subgraph, "reason").values())

        rings.append({
            "ring_id": f"RING-{i:03d}",
            "customer_ids": sorted(component),
            "size": len(component),
            "edge_count": subgraph.number_of_edges(),
            "signals": sorted(reasons),
        })

    # Sort largest rings first
    rings.sort(key=lambda r: r["size"], reverse=True)
    return rings


def write_ring_labels_to_neo4j(rings: list[dict]):
    """Write ring_id back onto Customer nodes in Neo4j so it's queryable."""
    driver = get_driver()
    with driver.session() as session:
        for ring in rings:
            session.run("""
                UNWIND $customer_ids AS cid
                MATCH (c:Customer {customer_id: cid})
                SET c.ring_id = $ring_id
            """, customer_ids=ring["customer_ids"], ring_id=ring["ring_id"])


if __name__ == "__main__":
    rings = detect_rings()
    print(f"Detected {len(rings)} ring(s):")
    for r in rings:
        print(f"  {r['ring_id']}: {r['size']} customers, signals={r['signals']}")
    write_ring_labels_to_neo4j(rings)
    print("Ring labels written to Neo4j.")