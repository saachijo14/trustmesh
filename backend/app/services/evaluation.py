"""
Evaluation utilities for TrustMesh.

Runs the existing risk-scoring pipeline against labelled synthetic
evaluation cases and calculates classification metrics.

Ground-truth labels come from the synthetic scenario definition,
not from the model's own predictions.
"""

from app.services.risk_scoring import compute_risk_score


# -------------------------------------------------------------------
# Evaluation dataset
# -------------------------------------------------------------------
#
# These labels represent the known synthetic scenarios.
#
# FRAUD:
#   ringA / ringB customers are intentionally generated with
#   coordinated fraud-risk signals.
#
# LEGITIMATE:
#   household and ordinary customers represent non-fraud behaviour.
#
# Keep this dataset separate from operational alerts so that the
# evaluation does not simply measure analyst decisions.
#
EVALUATION_CASES = [
    # Ring A: coordinated device/coupon/ring behaviour
    {"customer_id": "ringA_customer_0", "ground_truth": 1},
    {"customer_id": "ringA_customer_1", "ground_truth": 1},
    {"customer_id": "ringA_customer_2", "ground_truth": 1},
    {"customer_id": "ringA_customer_3", "ground_truth": 1},
    {"customer_id": "ringA_customer_4", "ground_truth": 1},

    # Ring B: coordinated refund-destination behaviour
    {"customer_id": "ringB_customer_0", "ground_truth": 1},
    {"customer_id": "ringB_customer_1", "ground_truth": 1},
    {"customer_id": "ringB_customer_2", "ground_truth": 1},
    {"customer_id": "ringB_customer_3", "ground_truth": 1},
    {"customer_id": "ringB_customer_4", "ground_truth": 1},

    # Legitimate household behaviour
    {"customer_id": "household_customer_0", "ground_truth": 0},
    {"customer_id": "household_customer_1", "ground_truth": 0},
    {"customer_id": "household_customer_2", "ground_truth": 0},

    # Ordinary customers
    {"customer_id": "customer_1000", "ground_truth": 0},
    {"customer_id": "customer_1001", "ground_truth": 0},
    {"customer_id": "customer_1002", "ground_truth": 0},
    {"customer_id": "customer_1003", "ground_truth": 0},
    {"customer_id": "customer_1004", "ground_truth": 0},
]


# Risk score at or above this value is treated as a fraud prediction.
#
# This is deliberately separate from the policy tiers.
# Policy decides what action to take.
# Evaluation asks whether the model identified fraud-risk cases.
# Evaluate all medium-or-higher risk cases as positive/risky.
# This matches the TrustMesh risk-tier boundary rather than tuning
# the threshold to the labelled evaluation cases.
FRAUD_SCORE_THRESHOLD = 35.0


def calculate_metrics(tp: int, tn: int, fp: int, fn: int) -> dict:
    """Calculate standard binary classification metrics safely."""

    precision = (
        tp / (tp + fp)
        if (tp + fp) > 0
        else 0.0
    )

    recall = (
        tp / (tp + fn)
        if (tp + fn) > 0
        else 0.0
    )

    f1_score = (
        2 * precision * recall / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )

    false_positive_rate = (
        fp / (fp + tn)
        if (fp + tn) > 0
        else 0.0
    )

    accuracy = (
        (tp + tn) / (tp + tn + fp + fn)
        if (tp + tn + fp + fn) > 0
        else 0.0
    )

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1_score, 4),
        "false_positive_rate": round(false_positive_rate, 4),
        "accuracy": round(accuracy, 4),
    }


def evaluate_model() -> dict:
    """
    Run TrustMesh risk scoring against the labelled evaluation set.

    Returns:
        Complete evaluation report including:
        - confusion matrix
        - precision
        - recall
        - F1
        - false-positive rate
        - accuracy
        - per-case predictions
    """

    tp = 0
    tn = 0
    fp = 0
    fn = 0

    evaluated_cases = []
    skipped_cases = []

    for case in EVALUATION_CASES:
        customer_id = case["customer_id"]
        ground_truth = case["ground_truth"]

        try:
            risk = compute_risk_score(customer_id, log_result=False)
        except Exception as exc:
            skipped_cases.append({
                "customer_id": customer_id,
                "reason": str(exc),
            })
            continue

        risk_score = float(risk["risk_score"])
        risk_tier = risk["risk_tier"]

        predicted_fraud = risk_score >= FRAUD_SCORE_THRESHOLD

        if ground_truth == 1 and predicted_fraud:
            tp += 1
        elif ground_truth == 0 and not predicted_fraud:
            tn += 1
        elif ground_truth == 0 and predicted_fraud:
            fp += 1
        elif ground_truth == 1 and not predicted_fraud:
            fn += 1

        evaluated_cases.append({
            "customer_id": customer_id,
            "ground_truth": "FRAUD" if ground_truth else "LEGITIMATE",
            "risk_score": risk_score,
            "risk_tier": risk_tier,
            "predicted_fraud": predicted_fraud,
        })

    metrics = calculate_metrics(tp, tn, fp, fn)

    total = tp + tn + fp + fn

    return {
        "evaluation_dataset": {
            "total_cases": len(EVALUATION_CASES),
            "evaluated_cases": total,
            "skipped_cases": len(skipped_cases),
            "fraud_cases": sum(
                1 for c in EVALUATION_CASES
                if c["ground_truth"] == 1
            ),
            "legitimate_cases": sum(
                1 for c in EVALUATION_CASES
                if c["ground_truth"] == 0
            ),
            "fraud_score_threshold": FRAUD_SCORE_THRESHOLD,
        },

        "confusion_matrix": {
            "true_positive": tp,
            "true_negative": tn,
            "false_positive": fp,
            "false_negative": fn,
        },

        "metrics": metrics,

        "cases": evaluated_cases,

        "skipped_cases": skipped_cases,

        "ground_truth": {
            "available": True,
            "source": "synthetic_scenario_labels",
            "note": (
                "Labels originate from the synthetic evaluation "
                "scenario definitions and are not inferred from "
                "TrustMesh predictions or analyst outcomes."
            ),
        },
    }


if __name__ == "__main__":
    import json

    report = evaluate_model()

    print(
        json.dumps(
            report,
            indent=2,
            default=str,
        )
    )