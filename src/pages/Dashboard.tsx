import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getDashboard } from "../api/client";

type DashboardData = {
  summary: {
    monitored_orders: number;
    gmv_screened_inr: number;
    active_rings: number;
    critical_alerts: number;
    total_exposure_inr: number;
    loss_prevented_inr: number;
    pending_review: number;
    fp_cost_inr: number;
  };
  orders_gmv_trend: {
    date: string;
    orders: number;
    gmv_inr: number;
  }[];
  intervention_outcomes: {
    outcome: string;
    count: number;
  }[];
  active_rings: {
    ring_id: string;
    nodes: number;
  }[];
  latest_alerts: {
    alert_id: string;
    order_id: string;
    risk_score: number;
    risk_tier: string;
    exposure_inr: number;
    top_reasons: string[];
    rec_action: string;
    status: string;
    assignee: string | null;
    created_at: string;
  }[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass rounded-lg p-3 border border-[rgba(99,102,241,0.3)] text-xs">
      <div className="text-[#94a3b8] mb-1 font-mono">{label}</div>

      {// eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: p.color || p.stroke }}
          />

          <span className="text-[#64748b]">{p.name}:</span>

          <span className="text-[#e2e8f0] font-semibold">
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const formatINR = (value: number) => {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)}Cr`;
  }

  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L`;
  }

  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }

  return `₹${Math.round(value).toLocaleString("en-IN")}`;
};

const formatDate = (date: string) => {
  const d = new Date(`${date}T00:00:00`);

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatTimeAgo = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);

  return `${diffDays}d ago`;
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getDashboard();

        setData(result as DashboardData);
      } catch (err) {
        console.error("Dashboard API error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#94a3b8]">
          <div className="w-4 h-4 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin" />
          Loading risk dashboard…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="glass-card rounded-xl p-6 text-center max-w-md">
          <div className="text-3xl mb-3">⚠️</div>

          <h2 className="text-sm font-semibold text-[#e2e8f0]">
            Unable to load dashboard
          </h2>

          <p className="text-xs text-[#64748b] mt-2">
            {error || "No dashboard data was returned by the backend."}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="btn-primary rounded-lg px-4 py-2 text-sm font-medium mt-4"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary } = data;

  const trendData = data.orders_gmv_trend.map((item) => ({
    day: formatDate(item.date),
    orders: item.orders,
    gmv: Number((item.gmv_inr / 100000).toFixed(2)),
  }));

  const interventionData = data.intervention_outcomes.map((item) => {
    const colorMap: Record<string, string> = {
      Allowed: "#10b981",
      "OTP Required": "#06b6d4",
      Held: "#f59e0b",
      Blocked: "#ef4444",
      "False Positive": "#64748b",
    };

    return {
      name:
        item.outcome === "OTP Required"
          ? "OTP Req."
          : item.outcome === "False Positive"
            ? "False Pos."
            : item.outcome,
      value: item.count,
      color: colorMap[item.outcome] || "#6366f1",
    };
  });

  const kpis = [
    {
      label: "Monitored Orders",
      value: summary.monitored_orders.toLocaleString("en-IN"),
      delta: null,
      up: true,
      color: "#6366f1",
      icon: "📦",
    },
    {
      label: "GMV Screened",
      value: formatINR(summary.gmv_screened_inr),
      delta: null,
      up: true,
      color: "#06b6d4",
      icon: "💰",
    },
    {
      label: "Active Rings",
      value: summary.active_rings.toLocaleString("en-IN"),
      delta: null,
      up: false,
      color: "#ef4444",
      icon: "🔗",
    },
    {
      label: "Critical Alerts",
      value: summary.critical_alerts.toLocaleString("en-IN"),
      delta: null,
      up: false,
      color: "#f97316",
      icon: "🚨",
    },
    {
      label: "Total Exposure",
      value: formatINR(summary.total_exposure_inr),
      delta: null,
      up: false,
      color: "#8b5cf6",
      icon: "⚠️",
    },
    {
      label: "Loss Prevented",
      value: formatINR(summary.loss_prevented_inr),
      delta: null,
      up: true,
      color: "#10b981",
      icon: "🛡️",
    },
    {
      label: "Pending Review",
      value: summary.pending_review.toLocaleString("en-IN"),
      delta: null,
      up: false,
      color: "#f59e0b",
      icon: "⏳",
    },
    {
      label: "FP Cost",
      value: formatINR(summary.fp_cost_inr),
      delta: null,
      up: true,
      color: "#64748b",
      icon: "📉",
    },
  ];

  return (
    <div className="h-full scroll-area p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e2e8f0] font-display">
            Risk Dashboard
          </h1>

          <p className="text-sm text-[#64748b] mt-0.5">
            Real-time merchant risk overview · Live backend data
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              const report = {
                generated_at: new Date().toISOString(),
                summary: data.summary,
                orders_gmv_trend: data.orders_gmv_trend,
                intervention_outcomes: data.intervention_outcomes,
                active_rings: data.active_rings,
                latest_alerts: data.latest_alerts,
              };

              const blob = new Blob(
                [JSON.stringify(report, null, 2)],
                { type: "application/json" }
              );

              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");

              link.href = url;
              link.download = `trustmesh-dashboard-report-${new Date()
                .toISOString()
                .slice(0, 10)}.json`;

              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              URL.revokeObjectURL(url);
            }}
            className="btn-primary rounded-lg px-4 py-2 text-sm font-medium"
          >
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div
            key={i}
            className="glass-card liquid-wave-card rounded-xl p-4 cursor-pointer hover:scale-[1.01] transition-transform"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-lg">{k.icon}</div>

              {k.delta && (
                <span
                  className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                    k.up
                      ? "text-[#10b981] bg-[rgba(16,185,129,0.1)]"
                      : "text-[#ef4444] bg-[rgba(239,68,68,0.1)]"
                  }`}
                >
                  {k.delta}
                </span>
              )}
            </div>

            <div
              className="text-2xl font-bold font-display"
              style={{ color: k.color }}
            >
              {k.value}
            </div>

            <div className="text-xs text-[#64748b] mt-1">
              {k.label}
            </div>

            <div className="mt-3 h-1 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${40 + i * 7}%`,
                  background: k.color,
                  opacity: 0.7,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Orders & GMV trend */}
        <div className="col-span-2 glass-card rounded-xl p-5 scan-line">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#e2e8f0]">
                Orders & GMV Trend
              </h3>

              <p className="text-xs text-[#64748b]">
                Historical order activity
              </p>
            </div>

            <div className="flex gap-3 text-xs text-[#64748b]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#6366f1] inline-block" />
                Orders
              </span>

              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#06b6d4] inline-block" />
                GMV (₹L)
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient
                  id="ordersGrad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#6366f1"
                    stopOpacity={0.3}
                  />

                  <stop
                    offset="95%"
                    stopColor="#6366f1"
                    stopOpacity={0}
                  />
                </linearGradient>

                <linearGradient
                  id="gmvGrad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#06b6d4"
                    stopOpacity={0.3}
                  />

                  <stop
                    offset="95%"
                    stopColor="#06b6d4"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(99,102,241,0.08)"
              />

              <XAxis
                dataKey="day"
                tick={{
                  fill: "#64748b",
                  fontSize: 10,
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{
                  fill: "#64748b",
                  fontSize: 10,
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="orders"
                stroke="#6366f1"
                fill="url(#ordersGrad)"
                strokeWidth={2}
              />

              <Area
                type="monotone"
                dataKey="gmv"
                stroke="#06b6d4"
                fill="url(#gmvGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Intervention outcomes */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-1">
            Intervention Outcomes
          </h3>

          <p className="text-xs text-[#64748b] mb-4">
            Current backend outcomes
          </p>

          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={interventionData} layout="vertical">
              <XAxis
                type="number"
                tick={{
                  fill: "#64748b",
                  fontSize: 9,
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                dataKey="name"
                type="category"
                tick={{
                  fill: "#94a3b8",
                  fontSize: 10,
                }}
                axisLine={false}
                tickLine={false}
                width={65}
              />

              <Tooltip content={<CustomTooltip />} />

              <Bar dataKey="value" radius={3}>
                {interventionData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-3 space-y-1.5">
            {interventionData.map((d) => (
              <div
                key={d.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: d.color }}
                  />

                  <span className="text-[#94a3b8]">
                    {d.name}
                  </span>
                </div>

                <span className="font-mono text-[#e2e8f0]">
                  {d.value.toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Active Rings */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#e2e8f0]">
              Active Rings
            </h3>

            <button
              onClick={() => navigate("/rings")}
              className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors"
            >
              View All →
            </button>
          </div>

          <div className="space-y-3">
            {data.active_rings.length === 0 ? (
              <div className="text-xs text-[#64748b] py-4 text-center">
                No active rings detected.
              </div>
            ) : (
              data.active_rings.map((r) => (
                <div
                  key={r.ring_id}
                  onClick={() => navigate(`/rings/${r.ring_id}`)}
                  className="flex items-center gap-4 p-3 rounded-lg bg-[rgba(13,18,40,0.5)] border border-[rgba(99,102,241,0.1)] hover:border-[rgba(99,102,241,0.25)] transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[rgba(99,102,241,0.15)] flex items-center justify-center">
                    <span className="text-lg">🔗</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold text-[#e2e8f0]">
                        {r.ring_id}
                      </span>

                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono badge-high">
                        DETECTED
                      </span>
                    </div>

                    <div className="text-xs text-[#64748b] mt-0.5">
                      {r.nodes} customers
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-[#e2e8f0]">
                      {r.nodes} nodes
                    </div>

                    <div className="text-xs mt-0.5 text-[#6366f1]">
                      View →
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Latest Alerts */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#e2e8f0]">
              Latest Alerts
            </h3>

            <button
              onClick={() => navigate("/alerts")}
              className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors"
            >
              View Queue →
            </button>
          </div>

          <div className="space-y-2">
            {data.latest_alerts.length === 0 ? (
              <div className="text-xs text-[#64748b] py-4 text-center">
                No alerts found.
              </div>
            ) : (
              data.latest_alerts.map((a) => (
                <div
                  key={a.alert_id}
                  onClick={() => navigate(`/alerts/${a.alert_id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(13,18,40,0.5)] border border-[rgba(99,102,241,0.1)] hover:border-[rgba(99,102,241,0.25)] transition-all cursor-pointer"
                >
                  <div className="relative">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold font-mono ${
                        a.risk_score > 80
                          ? "bg-[rgba(239,68,68,0.15)] text-[#ef4444]"
                          : a.risk_score > 60
                            ? "bg-[rgba(249,115,22,0.15)] text-[#f97316]"
                            : "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]"
                      }`}
                    >
                      {Math.round(a.risk_score)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#6366f1]">
                        {a.alert_id}
                      </span>

                      <span className="text-xs text-[#64748b]">·</span>

                      <span className="text-xs font-mono text-[#94a3b8]">
                        {a.order_id}
                      </span>
                    </div>

                    <div className="text-xs text-[#64748b] mt-0.5 truncate">
                      {a.top_reasons.join(" + ")}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        a.status === "OPEN"
                          ? "badge-critical"
                          : a.status === "REVIEWING"
                            ? "badge-medium"
                            : a.status === "ESCALATED"
                              ? "badge-high"
                              : "badge-low"
                      }`}
                    >
                      {a.status}
                    </span>

                    <div className="text-[10px] text-[#64748b] mt-1">
                      {formatTimeAgo(a.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}