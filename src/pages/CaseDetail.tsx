import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAlert, takeAlertAction, getAlertGraph } from "../api/client";
import EntityGraph from "../components/EntityGraph";

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

type GraphNode = {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
};

type GraphEdge = {
  source: string;
  target: string;
  relationship: string;
  properties: Record<string, unknown>;
};

type AlertGraph = {
  alert_id: string;
  customer_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    node_count: number;
    edge_count: number;
    shared_customer_count: number;
    ring_id: string | null;
  };
};

const actions = [
  {
    label: "Allow",
    backendAction: "ALLOW",
    icon: "✓",
    needsReason: false,
  },
  {
    label: "Request OTP",
    backendAction: "OTP",
    icon: "🔐",
    needsReason: false,
  },
  {
    label: "Hold Order",
    backendAction: "HOLD",
    icon: "⏸",
    needsReason: true,
  },
  {
    label: "Escalate",
    backendAction: "ESCALATE",
    icon: "↑",
    needsReason: true,
  },
  {
    label: "Mark Abuse",
    backendAction: "MARK_ABUSE",
    icon: "🚫",
    needsReason: true,
  },
  {
    label: "False Positive",
    backendAction: "FALSE_POSITIVE",
    icon: "✗",
    needsReason: true,
  },
];

const nodeTypeColor: Record<string, string> = {
  Customer: "#3b82f6",
  Device: "#8b5cf6",
  Address: "#f97316",
  Coupon: "#10b981",
  Payment: "#64748b",
};

const riskColor = (score: number) => {
  if (score >= 85) return "#ef4444";
  if (score >= 65) return "#f97316";
  if (score >= 35) return "#f59e0b";
  return "#10b981";
};

const tierBadge = (tier: string) => {
  const normalized = tier.toUpperCase();

  if (normalized === "CRITICAL") return "badge-critical";
  if (normalized === "HIGH") return "badge-high";
  if (normalized === "MEDIUM") return "badge-medium";

  return "badge-low";
};

const statusColor = (status: string) => {
  const normalized = status.toUpperCase();

  if (normalized === "OPEN") {
    return "text-[#ef4444] bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.25)]";
  }

  if (normalized === "REVIEWING") {
    return "text-[#f59e0b] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.25)]";
  }

  if (normalized === "ESCALATED") {
    return "text-[#8b5cf6] bg-[rgba(139,92,246,0.1)] border-[rgba(139,92,246,0.25)]";
  }

  if (normalized === "RESOLVED") {
    return "text-[#10b981] bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.25)]";
  }

  return "text-[#64748b] bg-[rgba(100,116,139,0.1)] border-[rgba(100,116,139,0.25)]";
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

const formatDateTime = (timestamp: string) => {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString("en-IN");
};

export default function CaseDetail() {
  const { alertId } = useParams<{ alertId: string }>();
  const navigate = useNavigate();

  const [alert, setAlert] = useState<Alert | null>(null);

  const [selectedAction, setSelectedAction] =
    useState<string | null>(null);

  const [reason, setReason] = useState("");

  const [submitted, setSubmitted] = useState(false);

  const [activeTab, setActiveTab] =
    useState<"evidence" | "entities" | "similar">("evidence");

  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [actionError, setActionError] =
    useState<string | null>(null);

  const chosen = actions.find(
    (action) => action.label === selectedAction
  );

const [graph, setGraph] = useState<AlertGraph | null>(null);

const [graphLoading, setGraphLoading] = useState(true);

const [graphError, setGraphError] = useState<string | null>(null);

  /*
   * Load the real alert from FastAPI.
   */
  useEffect(() => {
    const loadAlert = async () => {
      if (!alertId) {
        setError("No alert ID was provided.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await getAlert(alertId);

        setAlert(result as Alert);
      } catch (err) {
        console.error("Alert detail API error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load alert."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAlert();
  }, [alertId]);

useEffect(() => {
  const loadGraph = async () => {
    if (!alertId) {
      return;
    }

    try {
      setGraphLoading(true);
      setGraphError(null);

      const result = await getAlertGraph(alertId);

      setGraph(result as AlertGraph);
    } catch (err) {
      console.error("Alert graph API error:", err);

      setGraphError(
        err instanceof Error
          ? err.message
          : "Failed to load entity graph."
      );
    } finally {
      setGraphLoading(false);
    }
  };

  loadGraph();
}, [alertId]);

  /*
   * Submit an actual analyst action to FastAPI.
   */
  const handleSubmit = async () => {
    if (!alertId || !chosen || !alert) {
      return;
    }

    if (chosen.needsReason && !reason.trim()) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);

      await takeAlertAction(
        alertId,
        chosen.backendAction,
        "Arjun R.",
        reason.trim()
      );

      /*
       * Fetch the alert again so the UI reflects the
       * actual state stored by the backend.
       */
      const updatedAlert = await getAlert(alertId);

      setAlert(updatedAlert as Alert);

      setSubmitted(true);
      setSelectedAction(null);
      setReason("");

      setTimeout(() => {
        setSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error("Analyst action error:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to submit analyst action."
      );
    } finally {
      setActionLoading(false);
    }
  };


  
  /*
   * Loading state.
   */
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#94a3b8]">
          <div className="w-4 h-4 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin" />
          Loading alert details…
        </div>
      </div>
    );
  }

  /*
   * Error / missing alert state.
   */
  if (error || !alert) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="glass-card rounded-xl p-6 text-center max-w-md">
          <div className="text-3xl mb-3">⚠️</div>

          <h2 className="text-sm font-semibold text-[#e2e8f0]">
            Unable to load alert
          </h2>

          <p className="text-xs text-[#64748b] mt-2">
            {error || "Alert not found."}
          </p>

          <button
            onClick={() => navigate("/alerts")}
            className="btn-primary rounded-lg px-4 py-2 text-sm font-medium mt-4"
          >
            Back to Alert Queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full scroll-area p-6 space-y-5">
      {/* =========================================================
          Breadcrumb
      ========================================================= */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate("/alerts")}
          className="text-[#6366f1] hover:text-[#818cf8] transition-colors flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>

          Alert Queue
        </button>

        <span className="text-[#64748b]">/</span>

        <span className="text-[#e2e8f0] font-mono font-semibold">
          {alert.alert_id}
        </span>

        <span
          className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ml-2 ${tierBadge(
            alert.risk_tier
          )}`}
        >
          {alert.risk_tier.toUpperCase()} ·{" "}
          {Math.round(alert.risk_score)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* =======================================================
            LEFT COLUMN
        ======================================================= */}
        <div className="col-span-2 space-y-4">
          {/* =====================================================
              Alert Summary
          ===================================================== */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#e2e8f0]">
                Alert Summary
              </h2>

              <span
                className={`text-[9px] font-bold px-2 py-1 rounded border font-mono ${statusColor(
                  alert.status
                )}`}
              >
                {alert.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-[#64748b]">Alert ID</div>
                <div className="text-[#e2e8f0] font-mono mt-0.5">
                  {alert.alert_id}
                </div>
              </div>

              <div>
                <div className="text-[#64748b]">Order ID</div>
                <div className="text-[#e2e8f0] font-mono mt-0.5">
                  {alert.order_id}
                </div>
              </div>

              <div>
                <div className="text-[#64748b]">Customer</div>
                <div className="text-[#e2e8f0] font-mono mt-0.5">
                  {alert.customer_id || "—"}
                </div>
              </div>

              <div>
                <div className="text-[#64748b]">Risk Tier</div>
                <div className="text-[#e2e8f0] font-mono mt-0.5">
                  {alert.risk_tier.toUpperCase()}
                </div>
              </div>

              <div>
                <div className="text-[#64748b]">Risk Score</div>
                <div
                  className="font-mono font-semibold mt-0.5"
                  style={{
                    color: riskColor(alert.risk_score),
                  }}
                >
                  {Math.round(alert.risk_score)}
                </div>
              </div>

              <div>
                <div className="text-[#64748b]">
                  Exposure
                </div>
                <div className="text-[#e2e8f0] font-mono mt-0.5">
                  {formatINR(alert.exposure_inr)}
                </div>
              </div>

              <div>
                <div className="text-[#64748b]">
                  Recommended Action
                </div>
                <div className="text-[#06b6d4] font-mono mt-0.5">
                  {alert.rec_action}
                </div>
              </div>

              <div>
                <div className="text-[#64748b]">
                  Assignee
                </div>
                <div className="text-[#e2e8f0] font-mono mt-0.5">
                  {alert.assignee || "Unassigned"}
                </div>
              </div>

              <div>
                <div className="text-[#64748b]">
                  Created
                </div>
                <div className="text-[#e2e8f0] font-mono mt-0.5">
                  {formatDateTime(alert.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================
              Risk Score + Signals
          ===================================================== */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-4 mb-5">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: `${riskColor(
                    alert.risk_score
                  )}26`,
                  border: `2px solid ${riskColor(
                    alert.risk_score
                  )}`,
                }}
              >
                <span
                  className="text-2xl font-bold font-mono"
                  style={{
                    color: riskColor(alert.risk_score),
                  }}
                >
                  {Math.round(alert.risk_score)}
                </span>
              </div>

              <div>
                <div className="text-sm font-semibold text-[#e2e8f0]">
                  Risk Score
                </div>

                <div className="text-xs text-[#64748b]">
                  TrustMesh risk scoring engine
                </div>

                <div className="text-xs text-[#94a3b8] mt-1">
                  Tier: {alert.risk_tier.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {alert.top_reasons.length === 0 ? (
                <div className="text-xs text-[#64748b]">
                  No specific risk signals recorded.
                </div>
              ) : (
                alert.top_reasons.map((reasonItem, index) => (
                  <div key={reasonItem}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#94a3b8]">
                        {reasonItem}
                      </span>

                      <span className="font-mono text-[#6366f1]">
                        Signal {index + 1}
                      </span>
                    </div>

                    <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#6366f1] transition-all duration-700"
                        style={{
                          width: `${Math.max(
                            25,
                            100 - index * 20
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* =====================================================
              Tabs
          ===================================================== */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex border-b border-[rgba(99,102,241,0.15)]">
              {(
                ["evidence", "entities", "similar"] as const
              ).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 text-xs font-semibold capitalize transition-colors ${
                    activeTab === tab
                      ? "text-[#6366f1] border-b-2 border-[#6366f1] bg-[rgba(99,102,241,0.05)]"
                      : "text-[#64748b] hover:text-[#94a3b8]"
                  }`}
                >
                  {tab === "similar"
                    ? "Similar Cases"
                    : tab.charAt(0).toUpperCase() +
                      tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* =================================================
                  Evidence
              ================================================= */}
              {activeTab === "evidence" && (
                <div className="space-y-4 text-xs text-[#94a3b8] leading-relaxed">
                  <div>
                    <div className="text-[#6366f1] font-semibold mb-2">
                      Risk Assessment
                    </div>

                    <p>
                      This alert was generated for customer{" "}
                      <span className="text-[#6366f1] font-mono">
                        {alert.customer_id || "unknown"}
                      </span>{" "}
                      with a risk score of{" "}
                      <span
                        className="font-semibold"
                        style={{
                          color: riskColor(
                            alert.risk_score
                          ),
                        }}
                      >
                        {Math.round(alert.risk_score)}
                      </span>
                      .
                    </p>
                  </div>

                  <div>
                    <div className="text-[#6366f1] font-semibold mb-2">
                      Detected Signals
                    </div>

                    {alert.top_reasons.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {alert.top_reasons.map(
                          (reasonItem) => (
                            <span
                              key={reasonItem}
                              className="bg-[rgba(99,102,241,0.1)] text-[#94a3b8] border border-[rgba(99,102,241,0.15)] text-[9px] px-2 py-1 rounded"
                            >
                              {reasonItem}
                            </span>
                          )
                        )}
                      </div>
                    ) : (
                      <p>No signals recorded.</p>
                    )}
                  </div>

                  <div>
                    <div className="text-[#6366f1] font-semibold mb-2">
                      Decision
                    </div>

                    <p>
                      The current recommended intervention is{" "}
                      <span className="text-[#06b6d4] font-semibold">
                        {alert.rec_action}
                      </span>
                      .
                    </p>

                    <p className="mt-2">
                      The associated exposure is{" "}
                      <span className="text-[#f97316] font-semibold">
                        {formatINR(
                          alert.exposure_inr
                        )}
                      </span>
                      .
                    </p>
                  </div>
                </div>
              )}

              {/* =================================================
                  Entities
              ================================================= */}
              {activeTab === "entities" && (
                <div className="space-y-3">
                  <div className="text-xs text-[#64748b] mb-3">
                    Entity-level evidence will be connected to
                    the graph backend in the next integration
                    step.
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(13,18,40,0.5)]">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          nodeTypeColor.Customer,
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[9px] font-semibold"
                          style={{
                            color:
                              nodeTypeColor.Customer,
                          }}
                        >
                          Customer
                        </span>

                        <span className="text-[#6366f1] font-mono text-[10px]">
                          {alert.customer_id ||
                            "UNKNOWN"}
                        </span>
                      </div>

                      <div className="text-[#94a3b8] text-[11px]">
                        Alert subject
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-dashed border-[rgba(99,102,241,0.15)] text-xs text-[#64748b]">
                    Device, coupon, refund destination and
                    other graph entities will appear here once
                    the corresponding evidence endpoint is
                    exposed by the backend.
                  </div>
                </div>
              )}

              {/* =================================================
                  Similar Cases
              ================================================= */}
              {activeTab === "similar" && (
                <div className="p-4 rounded-lg border border-dashed border-[rgba(99,102,241,0.15)] text-center">
                  <div className="text-[#94a3b8] text-xs">
                    Similar-case analysis is not connected yet.
                  </div>

                  <div className="text-[#64748b] text-[10px] mt-1">
                    This will be powered by historical alert
                    similarity in a later backend step.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =======================================================
            RIGHT COLUMN
        ======================================================= */}
        <div className="space-y-4">
          {/* =====================================================
              Entity Graph
          ===================================================== */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold text-[#e2e8f0]">
                  Entity Graph — Shortest Path
                </h3>

                <div className="text-[9px] text-[#64748b] mt-1">
                  Customer-centered fraud evidence
                </div>
              </div>

              {graph?.summary.ring_id && (
                <span className="text-[8px] font-mono px-2 py-1 rounded border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] text-[#f59e0b]">
                  {graph.summary.ring_id}
                </span>
              )}
            </div>

            {graphLoading ? (
              <div className="h-130 rounded-lg bg-[#060a18] flex items-center justify-center">
                <div className="flex items-center gap-2 text-xs text-[#64748b]">
                  <div className="w-4 h-4 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin" />

                  Loading graph evidence…
                </div>
              </div>
            ) : graphError ? (
              <div className="h-130 rounded-lg bg-[#060a18] flex items-center justify-center">
                <div className="text-center max-w-sm px-5">
                  <div className="text-2xl mb-2">
                    ⚠️
                  </div>

                  <div className="text-xs text-[#e2e8f0] font-semibold">
                    Graph unavailable
                  </div>

                  <div className="text-[10px] text-[#64748b] mt-1">
                    {graphError}
                  </div>
                </div>
              </div>
            ) : graph ? (
              <EntityGraph graph={graph} />
            ) : (
              <div className="h-130 rounded-lg bg-[#060a18] flex items-center justify-center">
                <div className="text-xs text-[#64748b]">
                  No graph evidence available.
                </div>
              </div>
            )}
          </div>

          {/* =====================================================
              Analyst Actions
          ===================================================== */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[#e2e8f0]">
                Analyst Actions
              </h3>

              <span
                className={`text-[8px] font-bold px-1.5 py-0.5 rounded border font-mono ${statusColor(
                  alert.status
                )}`}
              >
                {alert.status}
              </span>
            </div>

            {submitted ? (
              <div className="py-4 text-center">
                <div className="text-[#10b981] text-sm font-semibold">
                  ✓ Action submitted
                </div>

                <div className="text-[10px] text-[#64748b] mt-1">
                  Alert status updated to{" "}
                  {alert.status}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        setSelectedAction(
                          action.label
                        );
                        setActionError(null);
                      }}
                      disabled={actionLoading}
                      className={`px-2 py-2 rounded-lg text-[11px] font-semibold text-left transition-all border ${
                        selectedAction ===
                        action.label
                          ? "border-[rgba(99,102,241,0.5)] bg-[rgba(99,102,241,0.15)]"
                          : "border-[rgba(99,102,241,0.1)] bg-[rgba(13,18,40,0.5)] hover:border-[rgba(99,102,241,0.25)]"
                      } ${
                        actionLoading
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      style={{
                        color:
                          selectedAction ===
                          action.label
                            ? "#e2e8f0"
                            : "#94a3b8",
                      }}
                    >
                      <span className="mr-1">
                        {action.icon}
                      </span>

                      {action.label}
                    </button>
                  ))}
                </div>

                {chosen?.needsReason && (
                  <textarea
                    value={reason}
                    onChange={(event) =>
                      setReason(event.target.value)
                    }
                    placeholder="Reason required for this action…"
                    disabled={actionLoading}
                    className="w-full bg-[rgba(13,18,40,0.8)] border border-[rgba(99,102,241,0.2)] rounded-lg p-2.5 text-xs text-[#e2e8f0] placeholder:text-[#64748b] focus:outline-none focus:border-[rgba(99,102,241,0.4)] resize-none h-16 mb-2 disabled:opacity-50"
                  />
                )}

                {selectedAction && (
                  <button
                    onClick={handleSubmit}
                    disabled={
                      actionLoading ||
                      Boolean(
                        chosen?.needsReason &&
                          !reason.trim()
                      )
                    }
                    className="w-full btn-primary rounded-lg py-2 text-xs font-semibold disabled:opacity-40"
                  >
                    {actionLoading
                      ? "Submitting…"
                      : `Submit: ${selectedAction}`}
                  </button>
                )}

                {actionError && (
                  <div className="mt-2 text-[10px] text-[#ef4444]">
                    {actionError}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}