import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";

import { getMetrics, getAlerts } from "../api/client";

type MetricsData = {
  generated_at: string;
  orders: {
    monitored_orders: number;
    gmv_screened_inr: number;
    average_order_value_inr: number;
    max_order_value_inr: number;
  };
  rings: {
    active_rings: number;
    customers_in_rings: number;
    distribution: {
      ring_id: string;
      nodes: number;
    }[];
  };
  alerts: {
    total_alerts: number;
    open: number;
    reviewing: number;
    resolved: number;
    closed: number;
    escalated: number;
    resolution_rate_percent: number;
    escalation_rate_percent: number;
  };
  risk_distribution: {
    risk_tier: string;
    count: number;
  }[];
  action_distribution: {
    action: string;
    count: number;
  }[];
  exposure: {
    total_exposure_inr: number;
    pending_exposure_inr: number;
  };
  outcomes: {
    outcome: string;
    count: number;
  }[];
  evaluation: {
    ground_truth_available: boolean;
    label_source: string;
    evaluation_dataset: {
      total_cases: number;
      evaluated_cases: number;
      skipped_cases: number;
      fraud_cases: number;
      legitimate_cases: number;
      fraud_score_threshold: number;
    };
    confusion_matrix: {
      true_positive: number;
      true_negative: number;
      false_positive: number;
      false_negative: number;
    };
    precision: number;
    recall: number;
    f1_score: number;
    false_positive_rate: number;
    accuracy: number;
    note: string;
  };
};

type Alert = {
  alert_id: string;
  order_id: string;
  customer_id: string;
  risk_score: number;
  risk_tier: string;
  exposure_inr: number;
  top_reasons: string[];
  rec_action: string;
  status: string;
  assignee: string;
  created_at: string;
};

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const formatPercent = (value: number) =>
  `${(value * 100).toFixed(1)}%`;

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass rounded-lg p-3 border border-[rgba(99,102,241,0.3)] text-xs">
      <div className="text-[#94a3b8] mb-2 font-mono">{label}</div>

      {// eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.map((item: any) => (
        <div key={item.name} className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: item.color || item.fill || item.stroke,
            }}
          />

          <span className="text-[#64748b]">
            {item.name}:
          </span>

          <span className="text-[#e2e8f0] font-semibold">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function Metrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError("");

      const [metricsData, alertsData] = await Promise.all([
        getMetrics(),
        getAlerts(),
      ]);

      setMetrics(metricsData as MetricsData);
      setAlerts((alertsData as Alert[]) || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load metrics"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // The async loader updates state after the API response arrives.
  // This is intentional because the effect synchronizes the page with backend policy state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMetrics();
  }, []);

  const radarData = useMemo(() => {
    if (!metrics) return [];

    return [
      {
        metric: "Precision",
        value: Number(formatPercent(metrics.evaluation.precision).replace("%", "")),
      },
      {
        metric: "Recall",
        value: Number(formatPercent(metrics.evaluation.recall).replace("%", "")),
      },
      {
        metric: "F1 Score",
        value: Number(formatPercent(metrics.evaluation.f1_score).replace("%", "")),
      },
      {
        metric: "Accuracy",
        value: Number(formatPercent(metrics.evaluation.accuracy).replace("%", "")),
      },
      {
        metric: "FP Control",
        value: Math.max(
          0,
          100 -
            Number(
              formatPercent(metrics.evaluation.false_positive_rate).replace(
                "%",
                ""
              )
            )
        ),
      },
    ];
  }, [metrics]);

  const riskChartData = useMemo(() => {
    if (!metrics) return [];

    return metrics.risk_distribution.map((item) => ({
      tier: item.risk_tier.toUpperCase(),
      count: item.count,
    }));
  }, [metrics]);

  const actionChartData = useMemo(() => {
    if (!metrics) return [];

    return metrics.action_distribution.map((item) => ({
      action: item.action,
      count: item.count,
    }));
  }, [metrics]);

  const ringChartData = useMemo(() => {
    if (!metrics) return [];

    return metrics.rings.distribution.map((item) => ({
      ring: item.ring_id,
      customers: item.nodes,
    }));
  }, [metrics]);

  const exportLedger = () => {
    if (!alerts.length) return;

    const headers = [
      "Alert ID",
      "Order ID",
      "Customer ID",
      "Risk Score",
      "Risk Tier",
      "Recommended Action",
      "Status",
      "Assignee",
      "Exposure INR",
      "Created At",
    ];

    const rows = alerts.map((alert) => [
      alert.alert_id,
      alert.order_id,
      alert.customer_id,
      alert.risk_score,
      alert.risk_tier,
      alert.rec_action,
      alert.status,
      alert.assignee,
      alert.exposure_inr,
      alert.created_at,
    ]);

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `trustmesh-decision-ledger-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="h-full scroll-area p-6 flex items-center justify-center">
        <div className="text-sm text-[#64748b] font-mono">
          Loading live metrics...
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="h-full scroll-area p-6">
        <div className="glass-card rounded-xl p-6 border border-red-500/20">
          <h2 className="text-sm font-semibold text-[#ef4444] mb-2">
            Metrics unavailable
          </h2>

          <p className="text-xs text-[#94a3b8] mb-4">
            {error || "Unable to load metrics."}
          </p>

          <button
            onClick={() => void loadMetrics()}
            className="btn-ghost rounded-lg px-4 py-2 text-xs"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full scroll-area p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e2e8f0] font-display">
            Metrics & Analytics
          </h1>

          <p className="text-sm text-[#64748b]">
            Live TrustMesh operational and model intelligence
          </p>
        </div>

        <div className="text-[10px] text-[#64748b] font-mono">
          Updated {formatDateTime(metrics.generated_at)}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-5 gap-4">
        {[
          {
            label: "Precision",
            value: formatPercent(metrics.evaluation.precision),
            delta: `${metrics.evaluation.confusion_matrix.true_positive} TP`,
            color: "#6366f1",
          },
          {
            label: "Recall",
            value: formatPercent(metrics.evaluation.recall),
            delta: `${metrics.evaluation.confusion_matrix.false_negative} FN`,
            color: "#06b6d4",
          },
          {
            label: "F1 Score",
            value: formatPercent(metrics.evaluation.f1_score),
            delta: `${metrics.evaluation.evaluation_dataset.evaluated_cases} evaluated`,
            color: "#10b981",
          },
          {
            label: "GMV Screened",
            value: formatINR(metrics.orders.gmv_screened_inr),
            delta: `${metrics.orders.monitored_orders} orders`,
            color: "#f59e0b",
          },
          {
            label: "Pending Exposure",
            value: formatINR(metrics.exposure.pending_exposure_inr),
            delta: `${metrics.alerts.open} open alert${
              metrics.alerts.open === 1 ? "" : "s"
            }`,
            color: "#8b5cf6",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="glass-card rounded-xl p-4 liquid-wave-card"
          >
            <div
              className="text-2xl font-bold font-display mb-1"
              style={{ color: kpi.color }}
            >
              {kpi.value}
            </div>

            <div className="text-xs text-[#64748b]">
              {kpi.label}
            </div>

            <div className="text-[10px] text-[#10b981] mt-1 font-mono">
              {kpi.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Model + Risk */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-[#e2e8f0]">
                Evaluation Performance
              </h3>

              <p className="text-xs text-[#64748b]">
                Current labelled evaluation results
              </p>
            </div>

            <span className="text-[10px] text-[#64748b] font-mono">
              Threshold:{" "}
              {metrics.evaluation.evaluation_dataset.fraud_score_threshold}
            </span>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={[
                {
                  metric: "Precision",
                  value: metrics.evaluation.precision * 100,
                },
                {
                  metric: "Recall",
                  value: metrics.evaluation.recall * 100,
                },
                {
                  metric: "F1",
                  value: metrics.evaluation.f1_score * 100,
                },
                {
                  metric: "Accuracy",
                  value: metrics.evaluation.accuracy * 100,
                },
              ]}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(99,102,241,0.08)"
              />

              <XAxis
                dataKey="metric"
                tick={{
                  fill: "#64748b",
                  fontSize: 10,
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                domain={[0, 100]}
                tick={{
                  fill: "#64748b",
                  fontSize: 10,
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<CustomTooltip />} />

              <Bar
                dataKey="value"
                name="Score %"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-1">
            Model Health
          </h3>

          <p className="text-xs text-[#64748b] mb-2">
            Live evaluation metrics
          </p>

          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(99,102,241,0.15)" />

              <PolarAngleAxis
                dataKey="metric"
                tick={{
                  fill: "#64748b",
                  fontSize: 9,
                }}
              />

              <Radar
                dataKey="value"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.15}
                strokeWidth={1.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operational charts */}
      <div className="grid grid-cols-3 gap-5">
        {/* Risk distribution */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-1">
            Risk Distribution
          </h3>

          <p className="text-xs text-[#64748b] mb-4">
            Current alert population by tier
          </p>

          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={riskChartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(99,102,241,0.08)"
              />

              <XAxis
                dataKey="tier"
                tick={{
                  fill: "#64748b",
                  fontSize: 9,
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                allowDecimals={false}
                tick={{
                  fill: "#64748b",
                  fontSize: 10,
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<CustomTooltip />} />

              <Bar
                dataKey="count"
                name="Alerts"
                fill="#8b5cf6"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Actions */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-1">
            Action Distribution
          </h3>

          <p className="text-xs text-[#64748b] mb-4">
            Recommended actions from live alerts
          </p>

          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={actionChartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(99,102,241,0.08)"
              />

              <XAxis
                dataKey="action"
                tick={{
                  fill: "#64748b",
                  fontSize: 9,
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                allowDecimals={false}
                tick={{
                  fill: "#64748b",
                  fontSize: 10,
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<CustomTooltip />} />

              <Bar
                dataKey="count"
                name="Actions"
                fill="#06b6d4"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rings */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-1">
            Active Ring Distribution
          </h3>

          <p className="text-xs text-[#64748b] mb-4">
            Customers detected inside each ring
          </p>

          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ringChartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(99,102,241,0.08)"
              />

              <XAxis
                dataKey="ring"
                tick={{
                  fill: "#64748b",
                  fontSize: 9,
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                allowDecimals={false}
                tick={{
                  fill: "#64748b",
                  fontSize: 10,
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<CustomTooltip />} />

              <Bar
                dataKey="customers"
                name="Customers"
                fill="#10b981"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operational summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Average Order",
            value: formatINR(metrics.orders.average_order_value_inr),
          },
          {
            label: "Largest Order",
            value: formatINR(metrics.orders.max_order_value_inr),
          },
          {
            label: "Customers in Rings",
            value: metrics.rings.customers_in_rings.toLocaleString("en-IN"),
          },
          {
            label: "Resolution Rate",
            value: `${metrics.alerts.resolution_rate_percent.toFixed(1)}%`,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="glass-card rounded-xl p-4"
          >
            <div className="text-[10px] uppercase tracking-wider text-[#64748b] mb-2">
              {item.label}
            </div>

            <div className="text-lg font-bold text-[#e2e8f0] font-mono">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Confusion matrix */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#e2e8f0]">
              Evaluation Confusion Matrix
            </h3>

            <p className="text-xs text-[#64748b] mt-1">
              {metrics.evaluation.evaluation_dataset.evaluated_cases} evaluated
              cases ·{" "}
              {metrics.evaluation.evaluation_dataset.fraud_cases} fraud ·{" "}
              {metrics.evaluation.evaluation_dataset.legitimate_cases} legitimate
            </p>
          </div>

          <span className="text-[10px] text-[#64748b] font-mono">
            {metrics.evaluation.label_source}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: "True Positive",
              value:
                metrics.evaluation.confusion_matrix.true_positive,
            },
            {
              label: "True Negative",
              value:
                metrics.evaluation.confusion_matrix.true_negative,
            },
            {
              label: "False Positive",
              value:
                metrics.evaluation.confusion_matrix.false_positive,
            },
            {
              label: "False Negative",
              value:
                metrics.evaluation.confusion_matrix.false_negative,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg bg-[rgba(13,18,40,0.45)] border border-[rgba(99,102,241,0.1)] p-4"
            >
              <div className="text-[10px] text-[#64748b] uppercase tracking-wider">
                {item.label}
              </div>

              <div className="text-2xl font-bold text-[#e2e8f0] font-mono mt-1">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decision ledger */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[rgba(99,102,241,0.15)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#e2e8f0]">
              Live Decision Ledger
            </h3>

            <p className="text-[10px] text-[#64748b] mt-1">
              Sourced from current TrustMesh alerts
            </p>
          </div>

          <button
            onClick={exportLedger}
            disabled={!alerts.length}
            className="btn-ghost rounded-lg px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-[#64748b]">
            No alerts available for the decision ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[rgba(99,102,241,0.1)]">
                  {[
                    "Alert ID",
                    "Order",
                    "Customer",
                    "Risk",
                    "Action",
                    "Status",
                    "Assignee",
                    "Exposure",
                    "Created",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-[10px] font-semibold text-[#64748b] uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {alerts.map((alert, index) => (
                  <tr
                    key={alert.alert_id}
                    className={`border-b border-[rgba(99,102,241,0.07)] hover:bg-[rgba(99,102,241,0.04)] transition-colors ${
                      index % 2 === 0
                        ? ""
                        : "bg-[rgba(13,18,40,0.3)]"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-[#6366f1] text-[10px]">
                      {alert.alert_id}
                    </td>

                    <td className="px-4 py-3 font-mono text-[#94a3b8]">
                      {alert.order_id}
                    </td>

                    <td className="px-4 py-3 font-mono text-[#94a3b8]">
                      {alert.customer_id}
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-[#f59e0b] font-semibold">
                        {alert.risk_score}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono badge-medium">
                        {alert.rec_action}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono text-[#c4b5fd] bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)]">
                        {alert.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-[#94a3b8]">
                      {alert.assignee}
                    </td>

                    <td className="px-4 py-3 font-mono text-[#e2e8f0]">
                      {formatINR(alert.exposure_inr)}
                    </td>

                    <td className="px-4 py-3 text-[#64748b]">
                      {formatDateTime(alert.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Evaluation note */}
      <div className="text-[10px] text-[#475569] px-1 pb-4">
        {metrics.evaluation.note}
      </div>
    </div>
  );
}