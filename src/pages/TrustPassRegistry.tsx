import { Fragment, useEffect, useMemo, useState } from "react";
import { getTrustPasses } from "../api/client";

type TrustPass = {
  trustpass_id: string;
  customer_id?: string;
  subject_type?: string;
  subject_id?: string;
  risk_tier?: string;
  decision?: string;
  allowed_actions?: string[];
  blocked_actions?: string[];
  max_permitted_amount_inr?: number;
  coupon_cap_inr?: number;
  status?: string;
  issued_at?: string;
  expires_at?: string;
};

const tierColor: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

const statusBadge: Record<string, string> = {
  active: "badge-low",
  expired: "badge-medium",
  revoked: "badge-critical",
};

const formatDate = (value?: string) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatAmount = (value?: number) => {
  if (value === undefined || value === null) return "—";

  return `₹${value.toLocaleString("en-IN")}`;
};

export default function TrustPassRegistry() {
  const [entries, setEntries] = useState<TrustPass[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTrustPasses = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getTrustPasses();

        setEntries(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load TrustPasses."
        );
      } finally {
        setLoading(false);
      }
    };

    loadTrustPasses();
  }, []);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const status = (entry.status || "").toUpperCase();

      if (
        statusFilter !== "ALL" &&
        status !== statusFilter
      ) {
        return false;
      }

      const query = search.trim().toLowerCase();

      if (!query) return true;

      return (
        entry.trustpass_id.toLowerCase().includes(query) ||
        (entry.customer_id || "")
          .toLowerCase()
          .includes(query) ||
        (entry.subject_id || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [entries, search, statusFilter]);

  const stats = useMemo(() => {
    const active = entries.filter(
      (e) => (e.status || "").toLowerCase() === "active"
    ).length;

    const expired = entries.filter(
      (e) => (e.status || "").toLowerCase() === "expired"
    ).length;

    const revoked = entries.filter(
      (e) => (e.status || "").toLowerCase() === "revoked"
    ).length;

    return {
      total: entries.length,
      active,
      expired,
      revoked,
    };
  }, [entries]);

  return (
    <div className="h-full scroll-area p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e2e8f0] font-display">
            TrustPass Registry
          </h1>

          <p className="text-sm text-[#64748b]">
            Live TrustPass permissions and authorization registry
          </p>
        </div>

        <button
          disabled
          title="TrustPass issuance is currently handled by the checkout evaluation pipeline"
          className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold opacity-50 cursor-not-allowed"
        >
          + Issue TrustPass
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Total Issued",
            value: stats.total,
            color: "#6366f1",
          },
          {
            label: "Active",
            value: stats.active,
            color: "#10b981",
          },
          {
            label: "Expired",
            value: stats.expired,
            color: "#f59e0b",
          },
          {
            label: "Revoked",
            value: stats.revoked,
            color: "#ef4444",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-xl p-4 liquid-wave-card"
          >
            <div
              className="text-2xl font-bold font-display"
              style={{ color: stat.color }}
            >
              {stat.value}
            </div>

            <div className="text-xs text-[#64748b] mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-3 flex gap-3 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search TrustPass or customer…"
          className="bg-[rgba(13,18,40,0.8)] border border-[rgba(99,102,241,0.2)] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0] placeholder:text-[#64748b] focus:outline-none focus:border-[rgba(99,102,241,0.4)] w-64"
        />

        {["ALL", "ACTIVE", "EXPIRED", "REVOKED"].map(
          (status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === status
                  ? "bg-[rgba(99,102,241,0.2)] text-[#6366f1] border border-[rgba(99,102,241,0.3)]"
                  : "text-[#64748b] hover:text-[#94a3b8]"
              }`}
            >
              {status}
            </button>
          )
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card rounded-xl p-4 border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.05)]">
          <div className="text-sm font-semibold text-[#ef4444]">
            Unable to load TrustPass registry
          </div>

          <div className="text-xs text-[#64748b] mt-1">
            {error}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-[#64748b]">
              <div className="w-4 h-4 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin" />
              Loading TrustPass registry…
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-center">
            <div>
              <div className="text-3xl mb-2">🛡️</div>

              <div className="text-sm font-semibold text-[#e2e8f0]">
                No TrustPasses found
              </div>

              <div className="text-xs text-[#64748b] mt-1">
                Try changing the search or status filter.
              </div>
            </div>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(99,102,241,0.15)]">
                {[
                  "TrustPass",
                  "Customer",
                  "Subject",
                  "Risk",
                  "Permissions",
                  "Max Amount",
                  "Expires",
                  "Status",
                  "",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left text-[10px] font-semibold text-[#64748b] uppercase tracking-wider"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map((entry, index) => {
                const status = (
                  entry.status || "unknown"
                ).toUpperCase();

                const tier = (
                  entry.risk_tier || "unknown"
                ).toLowerCase();

                const permissions =
                  entry.allowed_actions || [];

                return (
                  <Fragment
                    key={entry.trustpass_id}
                  >
                    <tr
                      onClick={() =>
                        setExpanded(
                          expanded === entry.trustpass_id
                            ? null
                            : entry.trustpass_id
                        )
                      }
                      className={`border-b border-[rgba(99,102,241,0.07)] hover:bg-[rgba(99,102,241,0.04)] cursor-pointer transition-colors ${
                        index % 2 === 0
                          ? ""
                          : "bg-[rgba(13,18,40,0.3)]"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-[#6366f1] text-[10px]">
                          {entry.trustpass_id}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-mono text-[#94a3b8] text-[10px]">
                          {entry.customer_id || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-[#e2e8f0]">
                          {entry.subject_type || "—"}
                        </div>

                        <div className="text-[9px] text-[#64748b] font-mono mt-0.5">
                          {entry.subject_id || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className="text-[10px] font-bold font-mono uppercase"
                          style={{
                            color:
                              tierColor[tier] ||
                              "#94a3b8",
                          }}
                        >
                          {tier}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {permissions
                            .slice(0, 2)
                            .map((permission) => (
                              <span
                                key={permission}
                                className="bg-[rgba(99,102,241,0.1)] text-[#94a3b8] text-[9px] px-1.5 py-0.5 rounded border border-[rgba(99,102,241,0.15)]"
                              >
                                {permission}
                              </span>
                            ))}

                          {permissions.length > 2 && (
                            <span className="text-[#64748b] text-[9px]">
                              +{permissions.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-[#e2e8f0] text-[10px]">
                          {formatAmount(
                            entry.max_permitted_amount_inr
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-[#64748b] text-[10px]">
                        {formatDate(entry.expires_at)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono ${
                            statusBadge[
                              status.toLowerCase()
                            ] || "text-[#94a3b8]"
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <svg
                          className={`w-3.5 h-3.5 text-[#64748b] transition-transform ${
                            expanded ===
                            entry.trustpass_id
                              ? "rotate-180"
                              : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </td>
                    </tr>

                    {expanded ===
                      entry.trustpass_id && (
                      <tr className="bg-[rgba(99,102,241,0.04)]">
                        <td
                          colSpan={9}
                          className="px-6 py-4"
                        >
                          <div className="grid grid-cols-2 gap-6">
                            {/* Permissions */}
                            <div>
                              <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-2">
                                Allowed Actions
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {permissions.length >
                                0 ? (
                                  permissions.map(
                                    (permission) => (
                                      <span
                                        key={
                                          permission
                                        }
                                        className="text-[10px] px-2 py-1 rounded border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.06)] text-[#10b981]"
                                      >
                                        ✓ {permission}
                                      </span>
                                    )
                                  )
                                ) : (
                                  <span className="text-xs text-[#64748b]">
                                    No autonomous
                                    actions permitted.
                                  </span>
                                )}
                              </div>

                              <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mt-4 mb-2">
                                Blocked Actions
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {(entry.blocked_actions ||
                                  []).length >
                                0 ? (
                                  (
                                    entry.blocked_actions ||
                                    []
                                  ).map((action) => (
                                    <span
                                      key={action}
                                      className="text-[10px] px-2 py-1 rounded border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] text-[#ef4444]"
                                    >
                                      ✕ {action}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-[#64748b]">
                                    None
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Details */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 rounded-lg bg-[rgba(13,18,40,0.4)]">
                                <div className="text-[9px] text-[#64748b] uppercase">
                                  Decision
                                </div>

                                <div className="text-xs font-mono text-[#e2e8f0] mt-1">
                                  {entry.decision ||
                                    "—"}
                                </div>
                              </div>

                              <div className="p-3 rounded-lg bg-[rgba(13,18,40,0.4)]">
                                <div className="text-[9px] text-[#64748b] uppercase">
                                  Coupon Cap
                                </div>

                                <div className="text-xs font-mono text-[#e2e8f0] mt-1">
                                  {formatAmount(
                                    entry.coupon_cap_inr
                                  )}
                                </div>
                              </div>

                              <div className="p-3 rounded-lg bg-[rgba(13,18,40,0.4)]">
                                <div className="text-[9px] text-[#64748b] uppercase">
                                  Issued
                                </div>

                                <div className="text-xs text-[#e2e8f0] mt-1">
                                  {formatDate(
                                    entry.issued_at
                                  )}
                                </div>
                              </div>

                              <div className="p-3 rounded-lg bg-[rgba(13,18,40,0.4)]">
                                <div className="text-[9px] text-[#64748b] uppercase">
                                  Expires
                                </div>

                                <div className="text-xs text-[#e2e8f0] mt-1">
                                  {formatDate(
                                    entry.expires_at
                                  )}
                                </div>
                              </div>

                              <div className="col-span-2 p-3 rounded-lg bg-[rgba(13,18,40,0.4)]">
                                <div className="text-[9px] text-[#64748b] uppercase">
                                  Maximum Permitted
                                  Amount
                                </div>

                                <div className="text-sm font-mono font-semibold text-[#06b6d4] mt-1">
                                  {formatAmount(
                                    entry.max_permitted_amount_inr
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}