import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAlerts, getRings } from "../api/client";

interface TopBarProps {
  onSearch?: (q: string) => void;
}

type AlertItem = {
  alert_id: string;
  order_id: string;
  customer_id: string;
  risk_score: number;
  risk_tier: string;
  exposure_inr: number;
  top_reasons: string[];
  status: string;
};

type RingItem = {
  ring_id: string;
  customer_ids?: string[];
};

export default function TopBar({ onSearch }: TopBarProps) {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [rings, setRings] = useState<RingItem[]>([]);

  const [dateRange, setDateRange] = useState("Aug 1 – Aug 27");

  useEffect(() => {
    const loadTopBarData = async () => {
      try {
        const [alertData, ringData] = await Promise.all([
          getAlerts(),
          getRings(),
        ]);

        setAlerts(alertData as AlertItem[]);
        setRings(ringData as RingItem[]);
      } catch {
        // Header data is supplementary.
        // Keep the rest of the application usable if the API is unavailable.
      }
    };

    void loadTopBarData();
  }, []);

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return [];
    }

    const alertResults = alerts
      .filter((alert) =>
        [
          alert.alert_id,
          alert.order_id,
          alert.customer_id,
          alert.risk_tier,
          alert.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 4)
      .map((alert) => ({
        type: "alert" as const,
        id: alert.alert_id,
        title: `${alert.alert_id} · ${alert.risk_tier.toUpperCase()} risk`,
        subtitle: `${alert.order_id} · ₹${Number(
          alert.exposure_inr || 0
        ).toLocaleString("en-IN")}`,
      }));

    const ringResults = rings
      .filter((ring) =>
        ring.ring_id.toLowerCase().includes(query)
      )
      .slice(0, 3)
      .map((ring) => ({
        type: "ring" as const,
        id: ring.ring_id,
        title: `${ring.ring_id} · Fraud ring`,
        subtitle: `${ring.customer_ids?.length || 0} customers`,
      }));

    return [...alertResults, ...ringResults].slice(0, 6);
  }, [search, alerts, rings]);

  const activeAlertCount = alerts.filter(
    (alert) =>
      alert.status === "OPEN" ||
      alert.status === "REVIEWING" ||
      alert.status === "ESCALATED"
  ).length;

  const notifications = alerts.slice(0, 4);

  const closeMenus = () => {
    setNotifOpen(false);
    setProfileOpen(false);
    setDateOpen(false);
  };

  const openSearchResult = (
    type: "alert" | "ring",
    id: string
  ) => {
    setSearch("");
    onSearch?.("");
    closeMenus();

    if (type === "alert") {
      navigate(`/alerts/${encodeURIComponent(id)}`);
    } else {
      navigate(`/rings/${encodeURIComponent(id)}`);
    }
  };

  const openNotification = (alertId: string) => {
    setNotifOpen(false);
    navigate(`/alerts/${encodeURIComponent(alertId)}`);
  };

  const selectDateRange = (range: string) => {
    setDateRange(range);
    setDateOpen(false);
  };

  return (
    <div className="glass flex items-center gap-4 px-6 py-3 border-b border-[rgba(99,102,241,0.2)] relative z-20">

      {/* Search */}
      <div className="relative flex-1 max-w-lg">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"
          />
        </svg>

        <input
          value={search}
          onChange={(e) => {
            const value = e.target.value;
            setSearch(value);
            onSearch?.(value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setSearch("");
              onSearch?.("");
            }

            if (
              e.key === "Enter" &&
              searchResults.length > 0
            ) {
              openSearchResult(
                searchResults[0].type,
                searchResults[0].id
              );
            }
          }}
          placeholder="Search alerts, orders, rings, entities…"
          className="w-full bg-[rgba(13,18,40,0.8)] border border-[rgba(99,102,241,0.2)] rounded-lg pl-10 pr-4 py-2 text-sm text-[#e2e8f0] placeholder:text-[#64748b] focus:outline-none focus:border-[rgba(99,102,241,0.5)] focus:bg-[rgba(13,18,55,0.9)] transition-all"
        />

        {search && (
          <div className="absolute top-full mt-1 left-0 w-full glass rounded-lg border border-[rgba(99,102,241,0.3)] z-50 py-1 shadow-2xl">
            {searchResults.length > 0 ? (
              searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  onClick={() =>
                    openSearchResult(
                      result.type,
                      result.id
                    )
                  }
                  className="w-full text-left px-4 py-2.5 hover:bg-[rgba(99,102,241,0.1)] transition-colors"
                >
                  <div className="text-sm text-[#e2e8f0] font-medium">
                    {result.title}
                  </div>

                  <div className="text-xs text-[#64748b] mt-0.5 font-mono">
                    {result.subtitle}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-[#64748b]">
                No matching alerts or rings found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Date range */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setDateOpen(!dateOpen);
            setNotifOpen(false);
            setProfileOpen(false);
          }}
          className="flex items-center gap-2 bg-[rgba(13,18,40,0.6)] border border-[rgba(99,102,241,0.2)] rounded-lg px-3 py-2 text-xs text-[#94a3b8] hover:border-[rgba(99,102,241,0.4)] transition-all"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>

          {dateRange}

          <svg
            className="w-3 h-3 text-[#64748b]"
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
        </button>

        {dateOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 glass rounded-xl border border-[rgba(99,102,241,0.3)] z-50 py-2 shadow-2xl">
            <div className="px-4 py-2 text-xs font-semibold text-[#6366f1] uppercase tracking-widest border-b border-[rgba(99,102,241,0.15)]">
              Date Range
            </div>

            {[
              "Aug 1 – Aug 27",
              "Aug 1 – Aug 31",
              "Last 7 days",
              "Last 30 days",
            ].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => selectDateRange(range)}
                className="w-full text-left px-4 py-2.5 text-sm text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[rgba(99,102,241,0.08)] transition-colors"
              >
                {range}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Test mode */}
      <div className="flex items-center gap-1.5 bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.35)] rounded-full px-3 py-1">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />

        <span className="text-xs text-amber-400 font-semibold font-mono tracking-wide">
          TEST MODE
        </span>
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setNotifOpen(!notifOpen);
            setDateOpen(false);
            setProfileOpen(false);
          }}
          className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-[rgba(13,18,40,0.6)] border border-[rgba(99,102,241,0.2)] hover:border-[rgba(99,102,241,0.4)] transition-all"
        >
          <svg
            className="w-4 h-4 text-[#94a3b8]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>

          {activeAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-[#ef4444] rounded-full text-[9px] text-white flex items-center justify-center font-bold">
              {activeAlertCount > 99
                ? "99+"
                : activeAlertCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 glass rounded-xl border border-[rgba(99,102,241,0.3)] z-50 py-2 shadow-2xl">
            <div className="px-4 py-2 text-xs font-semibold text-[#6366f1] uppercase tracking-widest border-b border-[rgba(99,102,241,0.15)]">
              Notifications
            </div>

            {notifications.length > 0 ? (
              notifications.map((alert) => (
                <button
                  key={alert.alert_id}
                  type="button"
                  onClick={() =>
                    openNotification(alert.alert_id)
                  }
                  className="w-full text-left px-4 py-3 flex gap-3 hover:bg-[rgba(99,102,241,0.07)] transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      alert.risk_tier === "critical"
                        ? "bg-red-500"
                        : alert.risk_tier === "high"
                        ? "bg-orange-500"
                        : alert.risk_tier === "medium"
                        ? "bg-yellow-400"
                        : "bg-emerald-400"
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#e2e8f0]">
                      {alert.alert_id} ·{" "}
                      {alert.risk_tier.toUpperCase()} risk
                    </div>

                    <div className="text-xs text-[#64748b] mt-0.5">
                      {alert.order_id} · {alert.status}
                    </div>
                  </div>

                  <span className="text-xs text-[#64748b] shrink-0">
                    {alert.risk_score.toFixed(0)}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-4 text-sm text-[#64748b]">
                No alerts available.
              </div>
            )}
          </div>
        )}
      </div>

      {/* User profile */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setProfileOpen(!profileOpen);
            setNotifOpen(false);
            setDateOpen(false);
          }}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-xs font-bold text-white">
            AR
          </div>

          <div className="text-xs text-left">
            <div className="text-[#e2e8f0] font-medium">
              Arjun R.
            </div>

            <div className="text-[#64748b]">
              Lead Analyst
            </div>
          </div>

          <svg
            className={`w-3.5 h-3.5 text-[#64748b] group-hover:text-[#e2e8f0] transition-transform ${
              profileOpen ? "rotate-180" : ""
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
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 glass rounded-xl border border-[rgba(99,102,241,0.3)] z-50 py-2 shadow-2xl">
            <div className="px-4 py-3 border-b border-[rgba(99,102,241,0.15)]">
              <div className="text-sm font-medium text-[#e2e8f0]">
                Arjun R.
              </div>

              <div className="text-xs text-[#64748b] mt-0.5">
                Lead Analyst
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                navigate("/metrics");
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[rgba(99,102,241,0.08)] transition-colors"
            >
              View analytics
            </button>

            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                navigate("/policies");
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[rgba(99,102,241,0.08)] transition-colors"
            >
              Policy Studio
            </button>

            <button
              type="button"
              onClick={() => setProfileOpen(false)}
              className="w-full text-left px-4 py-2.5 text-sm text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[rgba(99,102,241,0.08)] transition-colors"
            >
              Close menu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}