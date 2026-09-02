"""
Metrics and evaluation service for TrustMesh.

Provides operational risk metrics from Neo4j without inventing
fraud ground-truth labels.

Ground-truth-dependent metrics such as precision/recall/F1 are
reported as unavailable until labelled evaluation data exists.
"""

from datetime import datetime, timezone
from app.services.evaluation import evaluate_model

from app.services.neo4j_client import get_driver


def _run_single(query: str, **params):
    driver = get_driver()

    with driver.session() as session:
        record = session.run(query, **params).single()
        return dict(record) if record else {}


def _run_many(query: str, **params):
    driver = get_driver()

    with driver.session() as session:
        return [dict(record) for record in session.run(query, **params)]


def get_metrics() -> dict:
    """
    Return the main operational and evaluation metrics for TrustMesh.
    """

    # ---------------------------------------------------------
    # 1. ORDER / GMV METRICS
    # ---------------------------------------------------------
    order_metrics = _run_single("""
        MATCH (o:Order)
        WHERE datetime(o.timestamp) <= datetime()
        RETURN
            count(o) AS monitored_orders,
            coalesce(sum(toFloat(o.amount)), 0.0) AS gmv_screened_inr,
            coalesce(avg(toFloat(o.amount)), 0.0) AS average_order_value_inr,
            coalesce(max(toFloat(o.amount)), 0.0) AS max_order_value_inr
    """)

    # ---------------------------------------------------------
    # 2. RING METRICS
    # ---------------------------------------------------------
    ring_metrics = _run_single("""
        MATCH (c:Customer)
        WHERE c.ring_id IS NOT NULL
        RETURN
            count(DISTINCT c.ring_id) AS active_rings,
            count(c) AS customers_in_rings
    """)

    ring_distribution = _run_many("""
        MATCH (c:Customer)
        WHERE c.ring_id IS NOT NULL
        RETURN
            c.ring_id AS ring_id,
            count(c) AS nodes
        ORDER BY nodes DESC
    """)

    # ---------------------------------------------------------
    # 3. ALERT METRICS
    # ---------------------------------------------------------
    alert_metrics = _run_single("""
        MATCH (a:Alert)
        RETURN
            count(a) AS total_alerts,
            sum(CASE WHEN a.status = 'OPEN' THEN 1 ELSE 0 END) AS open_alerts,
            sum(CASE WHEN a.status = 'REVIEWING' THEN 1 ELSE 0 END) AS reviewing_alerts,
            sum(CASE WHEN a.status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved_alerts,
            sum(CASE WHEN a.status = 'CLOSED' THEN 1 ELSE 0 END) AS closed_alerts,
            sum(CASE WHEN a.status = 'ESCALATED' THEN 1 ELSE 0 END) AS escalated_alerts
    """)

    # ---------------------------------------------------------
    # 4. RISK TIER DISTRIBUTION
    # ---------------------------------------------------------
    risk_distribution = _run_many("""
        MATCH (a:Alert)
        RETURN
            a.risk_tier AS risk_tier,
            count(a) AS count
        ORDER BY
            CASE a.risk_tier
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
                ELSE 5
            END
    """)

    # ---------------------------------------------------------
    # 5. RECOMMENDED ACTION DISTRIBUTION
    # ---------------------------------------------------------
    action_distribution = _run_many("""
        MATCH (a:Alert)
        RETURN
            a.rec_action AS action,
            count(a) AS count
        ORDER BY count DESC
    """)

    # ---------------------------------------------------------
    # 6. EXPOSURE
    # ---------------------------------------------------------
    exposure_metrics = _run_single("""
        MATCH (a:Alert)
        RETURN
            coalesce(sum(toFloat(a.exposure_inr)), 0.0) AS total_exposure_inr,
            coalesce(
                sum(
                    CASE
                        WHEN a.status IN ['OPEN', 'REVIEWING', 'ESCALATED']
                        THEN toFloat(a.exposure_inr)
                        ELSE 0.0
                    END
                ),
                0.0
            ) AS pending_exposure_inr
    """)

    # ---------------------------------------------------------
    # 7. ANALYST OUTCOMES
    # ---------------------------------------------------------
    outcome_distribution = _run_many("""
        MATCH (a:Alert)
        WHERE a.status IS NOT NULL
        RETURN
            a.status AS outcome,
            count(a) AS count
        ORDER BY count DESC
    """)

    # ---------------------------------------------------------
    # 8. GROUND-TRUTH EVALUATION
    # ---------------------------------------------------------
    #
    # Evaluation uses the explicitly labelled synthetic evaluation
    # cases defined in evaluation.py. These metrics are kept separate
    # from operational alert outcomes.
    #
    evaluation_result = evaluate_model()

    evaluation = {
    "ground_truth_available": evaluation_result["ground_truth"]["available"],
    "label_source": evaluation_result["ground_truth"]["source"],
    "evaluation_dataset": evaluation_result["evaluation_dataset"],
    "confusion_matrix": evaluation_result["confusion_matrix"],
    "precision": evaluation_result["metrics"]["precision"],
    "recall": evaluation_result["metrics"]["recall"],
    "f1_score": evaluation_result["metrics"]["f1_score"],
    "false_positive_rate": evaluation_result["metrics"]["false_positive_rate"],
    "accuracy": evaluation_result["metrics"]["accuracy"],
    "note": evaluation_result["ground_truth"]["note"],
    }

    # ---------------------------------------------------------
    # 9. OPERATIONAL RATES
    # ---------------------------------------------------------
    total_alerts = alert_metrics.get("total_alerts", 0) or 0
    resolved = alert_metrics.get("resolved_alerts", 0) or 0
    closed = alert_metrics.get("closed_alerts", 0) or 0
    escalated = alert_metrics.get("escalated_alerts", 0) or 0

    resolution_rate = (
        ((resolved + closed) / total_alerts) * 100
        if total_alerts
        else 0.0
    )

    escalation_rate = (
        (escalated / total_alerts) * 100
        if total_alerts
        else 0.0
    )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),

        "orders": {
            "monitored_orders": order_metrics.get("monitored_orders", 0),
            "gmv_screened_inr": round(
                float(order_metrics.get("gmv_screened_inr", 0.0)), 2
            ),
            "average_order_value_inr": round(
                float(order_metrics.get("average_order_value_inr", 0.0)), 2
            ),
            "max_order_value_inr": round(
                float(order_metrics.get("max_order_value_inr", 0.0)), 2
            ),
        },

        "rings": {
            "active_rings": ring_metrics.get("active_rings", 0),
            "customers_in_rings": ring_metrics.get(
                "customers_in_rings", 0
            ),
            "distribution": ring_distribution,
        },

        "alerts": {
            "total_alerts": total_alerts,
            "open": alert_metrics.get("open_alerts", 0),
            "reviewing": alert_metrics.get("reviewing_alerts", 0),
            "resolved": resolved,
            "closed": closed,
            "escalated": escalated,
            "resolution_rate_percent": round(resolution_rate, 2),
            "escalation_rate_percent": round(escalation_rate, 2),
        },

        "risk_distribution": risk_distribution,

        "action_distribution": action_distribution,

        "exposure": {
            "total_exposure_inr": round(
                float(exposure_metrics.get("total_exposure_inr", 0.0)), 2
            ),
            "pending_exposure_inr": round(
                float(exposure_metrics.get("pending_exposure_inr", 0.0)), 2
            ),
        },

        "outcomes": outcome_distribution,

        "evaluation": evaluation,
    }


if __name__ == "__main__":
    import json

    metrics = get_metrics()
    print(json.dumps(metrics, indent=2))