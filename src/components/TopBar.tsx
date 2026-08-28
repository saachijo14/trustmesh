import { useState } from "react";

interface TopBarProps {
  onSearch?: (q: string) => void;
}

export default function TopBar({ onSearch }: TopBarProps) {
  const [search, setSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <div className="glass flex items-center gap-4 px-6 py-3 border-b border-[rgba(99,102,241,0.2)] relative z-20">
      {/* Search */}
      <div className="relative flex-1 max-w-lg">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
        </svg>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); onSearch?.(e.target.value); }}
          placeholder="Search alerts, orders, rings, entities…"
          className="w-full bg-[rgba(13,18,40,0.8)] border border-[rgba(99,102,241,0.2)] rounded-lg pl-10 pr-4 py-2 text-sm text-[#e2e8f0] placeholder:text-[#64748b] focus:outline-none focus:border-[rgba(99,102,241,0.5)] focus:bg-[rgba(13,18,55,0.9)] transition-all"
        />
        {search && (
          <div className="absolute top-full mt-1 left-0 w-full glass rounded-lg border border-[rgba(99,102,241,0.3)] z-50 py-1">
            {["ALT-9821 · Ring #47 fraud chain", "ORD-4421 · ₹82,400", "RING-047 · 23 nodes", "ENT-mask·****3421"].map(s => (
              <div key={s} className="px-4 py-2 text-sm text-[#94a3b8] hover:bg-[rgba(99,102,241,0.1)] cursor-pointer transition-colors font-mono">{s}</div>
            ))}
          </div>
        )}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-2 bg-[rgba(13,18,40,0.6)] border border-[rgba(99,102,241,0.2)] rounded-lg px-3 py-2 text-xs text-[#94a3b8] cursor-pointer hover:border-[rgba(99,102,241,0.4)] transition-all">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Aug 1 – Aug 27
      </div>

      {/* Test mode badge */}
      <div className="flex items-center gap-1.5 bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.35)] rounded-full px-3 py-1">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs text-amber-400 font-semibold font-mono tracking-wide">TEST MODE</span>
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-[rgba(13,18,40,0.6)] border border-[rgba(99,102,241,0.2)] hover:border-[rgba(99,102,241,0.4)] transition-all"
        >
          <svg className="w-4 h-4 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ef4444] rounded-full text-[9px] text-white flex items-center justify-center font-bold">7</span>
        </button>
        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 glass rounded-xl border border-[rgba(99,102,241,0.3)] z-50 py-2 shadow-2xl">
            <div className="px-4 py-2 text-xs font-semibold text-[#6366f1] uppercase tracking-widest border-b border-[rgba(99,102,241,0.15)]">Notifications</div>
            {[
              { t: "Critical ring detected", s: "Ring #47 expanded to 28 nodes", c: "#ef4444", time: "2m ago" },
              { t: "Policy breach", s: "Coupon WELCOME50 hit daily cap", c: "#f97316", time: "8m ago" },
              { t: "Agent checkout flagged", s: "AI buyer pattern detected", c: "#8b5cf6", time: "15m ago" },
              { t: "TrustPass revoked", s: "Entity ENT-8821 access removed", c: "#ef4444", time: "42m ago" },
            ].map((n, i) => (
              <div key={i} className="px-4 py-3 flex gap-3 hover:bg-[rgba(99,102,241,0.07)] cursor-pointer transition-colors">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: n.c }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#e2e8f0]">{n.t}</div>
                  <div className="text-xs text-[#64748b] mt-0.5">{n.s}</div>
                </div>
                <span className="text-xs text-[#64748b] shrink-0">{n.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User profile */}
      <div className="flex items-center gap-2 cursor-pointer group">
        <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-xs font-bold text-white">AR</div>
        <div className="text-xs">
          <div className="text-[#e2e8f0] font-medium">Arjun R.</div>
          <div className="text-[#64748b]">Lead Analyst</div>
        </div>
        <svg className="w-3.5 h-3.5 text-[#64748b] group-hover:text-[#e2e8f0] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
