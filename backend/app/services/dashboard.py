"""
Dashboard aggregation service for TrustMesh.

Builds the data required by the Risk Dashboard directly from Neo4j:
- KPI summary
- Orders / GMV trend
- Intervention outcomes
- Active rings
- Latest alerts
"""

from datetime import datetime, timezone, timedelta
from app.services.neo4j_client import get_driver


def _parse_timestamp(value):
    """Convert an ISO timestamp string into a datetime."""
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def get_dashboard_summary() -> dict:
    """
    Aggregate the main dashboard KPIs.
    """

    driver = get_driver()

    with driver.session() as session:

        # ---------------------------------------------------------
        # Orders / GMV
        # ---------------------------------------------------------
        order_record = session.run(
            """
            MATCH (o:Order)
            RETURN
                count(o) AS monitored_orders,
                coalesce(sum(o.amount), 0) AS gmv_screened_inr
            """
        ).single()

        monitored_orders = order_record["monitored_orders"]
        gmv_screened_inr = float(order_record["gmv_screened_inr"] or 0)

        # ---------------------------------------------------------
        # Active rings
        # ---------------------------------------------------------
        ring_record = session.run(
            """
            MATCH (c:Customer)
            WHERE c.ring_id IS NOT NULL
            RETURN count(DISTINCT c.ring_id) AS active_rings
            """
        ).single()

        active_rings = ring_record["active_rings"]

        # ---------------------------------------------------------
        # Alert metrics
        # ---------------------------------------------------------
        alert_record = session.run(
            """
            MATCH (a:Alert)
            RETURN
                count(a) AS total_alerts,

                count(
                    CASE
                        WHEN a.risk_tier = 'critical'
                        THEN 1
                    END
                ) AS critical_alerts,

                count(
                    CASE
                        WHEN a.status IN ['OPEN', 'REVIEWING', 'ESCALATED']
                        THEN 1
                    END
                ) AS pending_review,

                coalesce(
                    sum(
                        CASE
                            WHEN a.status IN ['OPEN', 'REVIEWING', 'ESCALATED']
                            THEN a.exposure_inr
                            ELSE 0
                        END
                    ),
                    0
                ) AS pending_exposure_inr,

                coalesce(
                    sum(a.exposure_inr),
                    0
                ) AS total_exposure_inr,

                coalesce(
                    sum(
                        CASE
                            WHEN a.rec_action IN ['HOLD', 'BLOCK']
                            THEN a.exposure_inr
                            ELSE 0
                        END
                    ),
                    0
                ) AS loss_prevented_inr,

                coalesce(
                    sum(
                        CASE
                            WHEN a.status = 'RESOLVED'
                             AND a.rec_action = 'ALLOW'
                            THEN a.exposure_inr
                            ELSE 0
                        END
                    ),
                    0
                ) AS false_positive_cost_inr
            """
        ).single()

        return {
            "monitored_orders": monitored_orders,
            "gmv_screened_inr": gmv_screened_inr,
            "active_rings": active_rings,
            "critical_alerts": alert_record["critical_alerts"],
            "total_exposure_inr": float(
                alert_record["total_exposure_inr"] or 0
            ),
            "loss_prevented_inr": float(
                alert_record["loss_prevented_inr"] or 0
            ),
            "pending_review": alert_record["pending_review"],
            "fp_cost_inr": float(
                alert_record["false_positive_cost_inr"] or 0
            ),
        }


def get_orders_gmv_trend() -> list[dict]:
    """
    Return daily order count and GMV.

    Only includes orders up to the current time so future-dated
    synthetic scenario records do not appear in the live dashboard.
    """

    driver = get_driver()

    with driver.session() as session:
        result = session.run(
            """
            MATCH (o:Order)
            WHERE o.timestamp IS NOT NULL
              AND datetime(o.timestamp) <= datetime()

            WITH date(datetime(o.timestamp)) AS day,
                 count(o) AS orders,
                 coalesce(sum(o.amount), 0) AS gmv_inr

            RETURN
                toString(day) AS date,
                orders,
                round(gmv_inr * 100) / 100.0 AS gmv_inr

            ORDER BY day
            """
        )

        return [
            {
                "date": record["date"],
                "orders": record["orders"],
                "gmv_inr": float(record["gmv_inr"] or 0),
            }
            for record in result
        ]

def get_intervention_outcomes() -> list[dict]:
    """
    Aggregate alerts by recommended intervention.

    The categories map directly to the Dashboard:
    ALLOW -> Allowed
    OTP   -> OTP Required
    HOLD  -> Held
    BLOCK -> Blocked
    """

    driver = get_driver()

    with driver.session() as session:
        result = session.run(
            """
            MATCH (a:Alert)

            WITH
                CASE a.rec_action
                    WHEN 'ALLOW' THEN 'Allowed'
                    WHEN 'OTP' THEN 'OTP Required'
                    WHEN 'HOLD' THEN 'Held'
                    WHEN 'BLOCK' THEN 'Blocked'
                    ELSE 'Other'
                END AS outcome,
                count(a) AS count

            RETURN outcome, count
            ORDER BY count DESC
            """
        )

        return [
            {
                "outcome": record["outcome"],
                "count": record["count"],
            }
            for record in result
        ]


def get_active_rings(limit: int = 10) -> list[dict]:
    """
    Return the largest currently labelled customer rings.
    """

    driver = get_driver()

    with driver.session() as session:
        result = session.run(
            """
            MATCH (c:Customer)
            WHERE c.ring_id IS NOT NULL

            RETURN
                c.ring_id AS ring_id,
                count(c) AS nodes

            ORDER BY nodes DESC
            LIMIT $limit
            """,
            limit=limit,
        )

        return [
            {
                "ring_id": record["ring_id"],
                "nodes": record["nodes"],
            }
            for record in result
        ]

def get_latest_alerts(limit: int = 10) -> list[dict]:
    """
    Return the most recent alerts for the dashboard queue.
    """

    driver = get_driver()

    with driver.session() as session:
        result = session.run(
            """
            MATCH (a:Alert)

            RETURN
                a.alert_id AS alert_id,
                a.order_id AS order_id,
                a.risk_score AS risk_score,
                a.risk_tier AS risk_tier,
                a.exposure_inr AS exposure_inr,
                a.top_reasons AS top_reasons,
                a.rec_action AS rec_action,
                a.status AS status,
                a.assignee AS assignee,
                a.created_at AS created_at

            ORDER BY a.created_at DESC
            LIMIT $limit
            """,
            limit=limit,
        )

        return [
            {
                "alert_id": record["alert_id"],
                "order_id": record["order_id"],
                "risk_score": record["risk_score"],
                "risk_tier": record["risk_tier"],
                "exposure_inr": record["exposure_inr"],
                "top_reasons": record["top_reasons"] or [],
                "rec_action": record["rec_action"],
                "status": record["status"],
                "assignee": record["assignee"],
                "created_at": record["created_at"],
            }
            for record in result
        ]


def get_dashboard() -> dict:
    """
    Build the complete dashboard payload.
    """

    return {
        "summary": get_dashboard_summary(),
        "orders_gmv_trend": get_orders_gmv_trend(),
        "intervention_outcomes": get_intervention_outcomes(),
        "active_rings": get_active_rings(),
        "latest_alerts": get_latest_alerts(),
    }