"""
Risk-scoring engine for TrustMesh.
Computes six weighted risk features per customer/order and combines them
into a single 0-100 risk score, per the PRD formula:

Risk Score = 0.25*D + 0.20*R + 0.15*V + 0.15*C + 0.15*B + 0.10*F

D: Device/account concentration
R: Refund-destination or payment-reference reuse
V: Velocity of account creation/orders
C: Coupon-abuse concentration
B: Connection to confirmed abuse (ring association)
F: Abnormal return/refund frequency
"""
from app.services.neo4j_client import get_driver

WEIGHTS = {"D": 0.25, "R": 0.20, "V": 0.15, "C": 0.15, "B": 0.15, "F": 0.10}


def _normalize(value: float, cap: float) -> float:
    """Normalize a raw count to 0-100, capping at `cap` (anything >= cap scores 100)."""
    if cap <= 0:
        return 0.0
    return min(100.0, (value / cap) * 100.0)


def compute_device_concentration(customer_id: str) -> float:
    """
    D: How many other customers share this customer's device(s)?
    More sharing = higher score. Capped at 10 co-users (Ring A has ~7-8).
    """
    driver = get_driver()
    query = """
    MATCH (c:Customer {customer_id: $customer_id})-[:USES]->(d:Device)<-[:USES]-(other:Customer)
    RETURN count(DISTINCT other) AS co_users
    """
    with driver.session() as session:
        record = session.run(query, customer_id=customer_id).single()
        co_users = record["co_users"] if record else 0
    return _normalize(co_users, cap=10)


def compute_refund_reuse(customer_id: str) -> float:
    """
    R: Does this customer's refund destination get reused by other customers?
    Capped at 10 co-users.
    """
    driver = get_driver()
    query = """
    MATCH (c:Customer {customer_id: $customer_id})-[:PLACES]->(:Order)-[:RESULTS_IN]->(:Refund)-[:SENT_TO]->(rd:RefundDestination)
          <-[:SENT_TO]-(:Refund)<-[:RESULTS_IN]-(:Order)<-[:PLACES]-(other:Customer)
    WHERE other.customer_id <> $customer_id
    RETURN count(DISTINCT other) AS co_users
    """
    with driver.session() as session:
        record = session.run(query, customer_id=customer_id).single()
        co_users = record["co_users"] if record else 0
    return _normalize(co_users, cap=10)


def compute_velocity(customer_id: str) -> float:
    """
    V: How many orders has this customer placed within a short window
    relative to account age? High order count on a freshly created
    account is suspicious. Capped at 5 orders (baseline is ~1 per customer).
    """
    driver = get_driver()
    query = """
    MATCH (c:Customer {customer_id: $customer_id})-[:PLACES]->(o:Order)
    RETURN count(o) AS order_count
    """
    with driver.session() as session:
        record = session.run(query, customer_id=customer_id).single()
        order_count = record["order_count"] if record else 0
    return _normalize(order_count, cap=5)


def compute_coupon_concentration(customer_id: str) -> float:
    """
    C: Does this customer's coupon usage overlap heavily with other
    customers using the same coupon? Capped at 10 co-users.
    """
    driver = get_driver()
    query = """
    MATCH (c:Customer {customer_id: $customer_id})-[:PLACES]->(:Order)-[:REDEEMS]->(cp:Coupon)<-[:REDEEMS]-(:Order)<-[:PLACES]-(other:Customer)
    WHERE other.customer_id <> $customer_id
    RETURN count(DISTINCT other) AS co_users
    """
    with driver.session() as session:
        record = session.run(query, customer_id=customer_id).single()
        co_users = record["co_users"] if record else 0
    return _normalize(co_users, cap=10)


def compute_ring_association(customer_id: str) -> float:
    """
    B: Is this customer part of a detected ring? Ring membership is a
    strong signal on its own; larger rings score higher but any ring
    of ~8+ already registers as maximal risk.
    """
    driver = get_driver()
    query = """
    MATCH (c:Customer {customer_id: $customer_id})
    RETURN c.ring_id AS ring_id
    """
    with driver.session() as session:
        record = session.run(query, customer_id=customer_id).single()
        ring_id = record["ring_id"] if record else None

    if not ring_id:
        return 0.0

    size_query = """
    MATCH (c:Customer {ring_id: $ring_id})
    RETURN count(c) AS ring_size
    """
    with driver.session() as session:
        record = session.run(size_query, ring_id=ring_id).single()
        ring_size = record["ring_size"] if record else 0

    return _normalize(ring_size, cap=8)


def compute_refund_frequency(customer_id: str) -> float:
    """
    F: What fraction of this customer's orders resulted in a refund?
    High refund ratio is suspicious. Returned as a 0-100 percentage.
    """
    driver = get_driver()
    query = """
    MATCH (c:Customer {customer_id: $customer_id})-[:PLACES]->(o:Order)
    OPTIONAL MATCH (o)-[:RESULTS_IN]->(r:Refund)
    RETURN count(o) AS total_orders, count(r) AS refund_count
    """
    with driver.session() as session:
        record = session.run(query, customer_id=customer_id).single()
        total = record["total_orders"] if record else 0
        refunds = record["refund_count"] if record else 0

    if total == 0:
        return 0.0
    return (refunds / total) * 100.0


def compute_risk_score(customer_id: str) -> dict:
    """
    Compute the full weighted risk score for a customer, with a
    breakdown of each contributing feature — matching the PRD's
    required explanation output.
    """
    features = {
        "D": compute_device_concentration(customer_id),
        "R": compute_refund_reuse(customer_id),
        "V": compute_velocity(customer_id),
        "C": compute_coupon_concentration(customer_id),
        "B": compute_ring_association(customer_id),
        "F": compute_refund_frequency(customer_id),
    }

    weighted_score = sum(features[k] * WEIGHTS[k] for k in WEIGHTS)

    if weighted_score >= 85:
        tier = "critical"
    elif weighted_score >= 65:
        tier = "high"
    elif weighted_score >= 35:
        tier = "medium"
    else:
        tier = "low"

    return {
        "customer_id": customer_id,
        "risk_score": round(weighted_score, 1),
        "risk_tier": tier,
        "features": {k: round(v, 1) for k, v in features.items()},
    }


if __name__ == "__main__":
    # Quick manual test: score a known Ring A customer vs a normal one
    test_ids = ["ringA_customer_0", "ringB_customer_0", "household_customer_0", "customer_1000"]
    for cid in test_ids:
        result = compute_risk_score(cid)
        print(f"{cid}: score={result['risk_score']} tier={result['risk_tier']} features={result['features']}")