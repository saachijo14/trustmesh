import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAlerts } from "../api/client";

type Alert = {
  alert_id: string;
  order_id: string;
  customer_id?: string;
  risk_score: number;
  risk_tier: string;
  exposure_inr: number;
  top_reasons: string[];
  rec_action: string;
  status: string;
  assignee: string | null;
  created_at: string;
};

const tierBadge = (tier: string) => {
  if (tier.toUpperCase() === "CRITICAL") return "badge-critical";
  if (tier.toUpperCase() === "HIGH") return "badge-high";
  if (tier.toUpperCase() === "MEDIUM") return "badge-medium";
  return "badge-low";
};

const statusColor = (s: string) => {
  if (s === "OPEN") {
    return "text-[#ef4444] bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.25)]";
  }

  if (s === "REVIEWING") {
    return "text-[#f59e0b] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.25)]";
  }

  if (s === "ESCALATED") {
    return "text-[#8b5cf6] bg-[rgba(139,92,246,0.1)] border-[rgba(139,92,246,0.25)]";
  }

  if (s === "RESOLVED") {
    return "text-[#10b981] bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.25)]";
  }

  return "text-[#64748b] bg-[rgba(100,116,139,0.1)] border-[rgba(100,116,139,0.25)]";
};

const actionStyle = (action: string) => {
  if (action === "BLOCK") {
    return "bg-[rgba(239,68,68,0.15)] text-[#ef4444]";
  }

  if (action === "OTP") {
    return "bg-[rgba(6,182,212,0.15)] text-[#06b6d4]";
  }

  if (action === "HOLD") {
    return "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]";
  }

  return "bg-[rgba(16,185,129,0.15)] text-[#10b981]";
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

export default function Alerts() {
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const [tier, setTier] = useState(
    searchParams.get("risk_tier")?.toUpperCase() || "ALL"
  );

  const [status, setStatus] = useState(
    searchParams.get("status")?.toUpperCase() || "ALL"
  );

  const [search, setSearch] = useState(
    searchParams.get("search") || ""
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateFilters = (
    nextTier: string,
    nextStatus: string,
    nextSearch: string
  ) => {
    const params = new URLSearchParams();

    if (nextTier !== "ALL") {
      params.set("risk_tier", nextTier);
    }

    if (nextStatus !== "ALL") {
      params.set("status", nextStatus);
    }

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }

    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getAlerts();

        setAlerts(result as Alert[]);
      } catch (err) {
        console.error("Alerts API error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load alerts."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, []);

  const filtered = useMemo(() => {
    const searchValue = search.trim().toUpperCase();

    return alerts.filter((a) => {
      if (
        tier !== "ALL" &&
        a.risk_tier.toUpperCase() !== tier
      ) {
        return false;
      }

      if (
        status !== "ALL" &&
        a.status.toUpperCase() !== status
      ) {
        return false;
      }

      if (
        searchValue &&
        !a.alert_id.toUpperCase().includes(searchValue) &&
        !a.order_id.toUpperCase().includes(searchValue) &&
        !(a.customer_id || "")
          .toUpperCase()
          .includes(searchValue)
      ) {
        return false;
      }

      return true;
    });
  }, [alerts, tier, status, search]);

  /*
   * Export the currently filtered alerts as CSV.
   */
  const exportCSV = () => {
    if (!filtered.length) {
      return;
    }

    const headers = [
      "Alert ID",
      "Order ID",
      "Customer ID",
      "Risk Score",
      "Risk Tier",
      "Exposure INR",
      "Recommended Action",
      "Status",
      "Assignee",
      "Created At",
    ];

    const rows = filtered.map((a) => [
      a.alert_id,
      a.order_id,
      a.customer_id || "",
      a.risk_score,
      a.risk_tier,
      a.exposure_inr,
      a.rec_action,
      a.status,
      a.assignee || "",
      a.created_at,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `trustmesh-alerts-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e2e8f0] font-display">
            Alert Queue
          </h1>

          <p className="text-sm text-[#64748b]">
            {loading
              ? "Loading alerts…"
              : `${filtered.length} alerts · Analyst view`}
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={!filtered.length}
          className="btn-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"
            />
          </svg>

          <input
            value={search}
            onChange={(e) => {
              const value = e.target.value;

              setSearch(value);

              updateFilters(
                tier,
                status,
                value
              );
            }}
            placeholder="ALT-, ORD- or customer"
            className="bg-[rgba(13,18,40,0.8)] border border-[rgba(99,102,241,0.2)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#e2e8f0] placeholder:text-[#64748b] focus:outline-none focus:border-[rgba(99,102,241,0.4)] w-44"
          />
        </div>

        <FilterSelect
          label="Risk Tier"
          value={tier}
          onChange={(value) => {
            setTier(value);

            updateFilters(
              value,
              status,
              search
            );
          }}
          options={[
            "ALL",
            "CRITICAL",
            "HIGH",
            "MEDIUM",
            "LOW",
          ]}
        />

        <FilterSelect
          label="Status"
          value={status}
          onChange={(value) => {
            setStatus(value);

            updateFilters(
              tier,
              value,
              search
            );
          }}
          options={[
            "ALL",
            "OPEN",
            "REVIEWING",
            "ESCALATED",
            "RESOLVED",
            "CLOSED",
          ]}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="glass rounded-xl p-4 border border-[rgba(239,68,68,0.2)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#ef4444]">
                Unable to load alerts
              </div>

              <div className="text-xs text-[#64748b] mt-1">
                {error}
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="btn-ghost rounded-lg px-3 py-1.5 text-xs"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 glass rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(99,102,241,0.15)]">
                {[
                  "Alert ID",
                  "Order",
                  "Risk",
                  "Exposure",
                  "Top Reasons",
                  "Rec. Action",
                  "Status",
                  "Assignee",
                  "Time",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-semibold text-[#64748b] uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center"
                  >
                    <div className="flex items-center justify-center gap-3 text-[#64748b]">
                      <div className="w-4 h-4 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin" />
                      Loading alert queue…
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center"
                  >
                    <div className="text-2xl mb-2">
                      🔎
                    </div>

                    <div className="text-sm text-[#94a3b8]">
                      No alerts match the current filters.
                    </div>

                    <div className="text-xs text-[#64748b] mt-1">
                      Try changing the risk tier, status,
                      or search term.
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((a, i) => (
                  <tr
                    key={a.alert_id}
                    onClick={() =>
                      navigate(`/alerts/${a.alert_id}`)
                    }
                    className={`border-b border-[rgba(99,102,241,0.07)] hover:bg-[rgba(99,102,241,0.06)] cursor-pointer transition-colors ${
                      i % 2 === 0
                        ? ""
                        : "bg-[rgba(13,18,40,0.3)]"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-[#6366f1] font-semibold">
                      {a.alert_id}
                    </td>

                    <td className="px-4 py-3 font-mono text-[#94a3b8]">
                      {a.order_id}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`text-sm font-bold font-mono ${
                            a.risk_score > 80
                              ? "text-[#ef4444]"
                              : a.risk_score > 60
                                ? "text-[#f97316]"
                                : a.risk_score > 40
                                  ? "text-[#f59e0b]"
                                  : "text-[#10b981]"
                          }`}
                        >
                          {Math.round(a.risk_score)}
                        </div>

                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${tierBadge(
                            a.risk_tier
                          )}`}
                        >
                          {a.risk_tier.toUpperCase()}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-[#e2e8f0]">
                      {formatINR(a.exposure_inr)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {a.top_reasons.map((reason) => (
                          <span
                            key={reason}
                            className="bg-[rgba(99,102,241,0.1)] text-[#94a3b8] border border-[rgba(99,102,241,0.15)] text-[9px] px-1.5 py-0.5 rounded"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`font-mono text-[9px] font-bold px-2 py-1 rounded ${actionStyle(
                          a.rec_action
                        )}`}
                      >
                        {a.rec_action}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono ${statusColor(
                          a.status
                        )}`}
                      >
                        {a.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-[#94a3b8]">
                      {a.assignee || "Unassigned"}
                    </td>

                    <td className="px-4 py-3 text-[#64748b]">
                      {formatTimeAgo(a.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[rgba(13,18,40,0.8)] border border-[rgba(99,102,241,0.2)] rounded-lg px-3 py-1.5 text-xs text-[#94a3b8] focus:outline-none focus:border-[rgba(99,102,241,0.4)] cursor-pointer"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o === "ALL" ? `${label}: All` : o}
        </option>
      ))}
    </select>
  );
}