import { Fragment, useState } from "react";

const entries = [
  { id: "TP-001", entity: "CUS-11221", name: "Priya Nair", tier: "GOLD", granted: ["Express Checkout", "High-value Orders", "Coupon Stack", "Agent Checkout"], expires: "Dec 31, 2026", risk: 12, status: "ACTIVE" },
  { id: "TP-002", entity: "CUS-21005", name: "Karthik M.", tier: "SILVER", granted: ["Express Checkout", "Coupon Stack"], expires: "Oct 15, 2026", risk: 24, status: "ACTIVE" },
  { id: "TP-003", entity: "CUS-38405", name: "Anjali S.", tier: "GOLD", granted: ["Express Checkout", "High-value Orders"], expires: "Nov 30, 2026", risk: 8, status: "ACTIVE" },
  { id: "TP-004", entity: "CUS-44201", name: "Rohit K.", tier: "BRONZE", granted: ["Express Checkout"], expires: "Sep 5, 2026", risk: 38, status: "EXPIRING" },
  { id: "TP-005", entity: "CUS-38821", name: "Ravi S.", tier: "REVOKED", granted: [], expires: "—", risk: 94, status: "REVOKED" },
  { id: "TP-006", entity: "CUS-50112", name: "Meera P.", tier: "SILVER", granted: ["Express Checkout", "High-value Orders"], expires: "Jan 10, 2027", risk: 19, status: "ACTIVE" },
];

const allPerms = ["Express Checkout", "High-value Orders", "Coupon Stack", "Agent Checkout", "Bulk Orders", "Priority Queue"];

const tierColor: Record<string, string> = {
  GOLD: "#f59e0b",
  SILVER: "#94a3b8",
  BRONZE: "#b45309",
  REVOKED: "#ef4444",
};

const statusBadge: Record<string, string> = {
  ACTIVE: "badge-low",
  EXPIRING: "badge-medium",
  REVOKED: "badge-critical",
};

export default function TrustPassRegistry() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = entries.filter(e => {
    if (tierFilter !== "ALL" && e.tier !== tierFilter) return false;
    if (search && !e.entity.includes(search.toUpperCase()) && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-full scroll-area p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e2e8f0] font-display">TrustPass Registry</h1>
          <p className="text-sm text-[#64748b]">Manage entity permissions and trust levels</p>
        </div>
        <button className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold">+ Issue TrustPass</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Issued", value: "284", color: "#6366f1" },
          { label: "Active", value: "261", color: "#10b981" },
          { label: "Expiring Soon", value: "12", color: "#f59e0b" },
          { label: "Revoked", value: "11", color: "#ef4444" },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-4 liquid-wave-card">
            <div className="text-2xl font-bold font-display" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-[#64748b] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-3 flex gap-3 items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search entity or name…"
          className="bg-[rgba(13,18,40,0.8)] border border-[rgba(99,102,241,0.2)] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0] placeholder:text-[#64748b] focus:outline-none focus:border-[rgba(99,102,241,0.4)] w-52"
        />
        {["ALL", "GOLD", "SILVER", "BRONZE", "REVOKED"].map(t => (
          <button
            key={t}
            onClick={() => setTierFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tierFilter === t
                ? "bg-[rgba(99,102,241,0.2)] text-[#6366f1] border border-[rgba(99,102,241,0.3)]"
                : "text-[#64748b] hover:text-[#94a3b8]"
            }`}
            style={tierFilter === t && t !== "ALL" ? { color: tierColor[t], borderColor: tierColor[t] + "44", background: tierColor[t] + "11" } : {}}
          >{t}</button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[rgba(99,102,241,0.15)]">
              {["ID", "Entity", "Name", "Tier", "Permissions", "Risk", "Expires", "Status", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <Fragment key={e.id}>
                <tr
                  onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                  className={`border-b border-[rgba(99,102,241,0.07)] hover:bg-[rgba(99,102,241,0.04)] cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-[rgba(13,18,40,0.3)]"}`}
                >
                  <td className="px-4 py-3 font-mono text-[#6366f1] text-[10px]">{e.id}</td>
                  <td className="px-4 py-3 font-mono text-[#94a3b8] text-[10px]">{e.entity}</td>
                  <td className="px-4 py-3 text-[#e2e8f0]">{e.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold font-mono" style={{ color: tierColor[e.tier] }}>{e.tier}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {e.granted.slice(0, 2).map(p => (
                        <span key={p} className="bg-[rgba(99,102,241,0.1)] text-[#94a3b8] text-[9px] px-1.5 py-0.5 rounded border border-[rgba(99,102,241,0.15)]">{p}</span>
                      ))}
                      {e.granted.length > 2 && <span className="text-[#64748b] text-[9px]">+{e.granted.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono font-bold text-xs ${e.risk > 60 ? "text-[#ef4444]" : e.risk > 30 ? "text-[#f59e0b]" : "text-[#10b981]"}`}>{e.risk}</span>
                  </td>
                  <td className="px-4 py-3 text-[#64748b] text-[10px]">{e.expires}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono ${statusBadge[e.status]}`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <svg className={`w-3.5 h-3.5 text-[#64748b] transition-transform ${expanded === e.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </td>
                </tr>
                {expanded === e.id && (
                  <tr className="bg-[rgba(99,102,241,0.04)]">
                    <td colSpan={9} className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-2">All Permissions</div>
                          <div className="grid grid-cols-2 gap-2">
                            {allPerms.map(p => (
                              <label key={p} className="flex items-center gap-2 cursor-pointer text-xs text-[#94a3b8]">
                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${e.granted.includes(p) ? "bg-[#6366f1] border-[#6366f1]" : "border-[rgba(99,102,241,0.3)]"}`}>
                                  {e.granted.includes(p) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                {p}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {e.status !== "REVOKED" && (
                            <button className="btn-ghost rounded-lg px-3 py-1.5 text-xs text-[#ef4444] border-[rgba(239,68,68,0.2)] hover:bg-[rgba(239,68,68,0.08)]">Revoke</button>
                          )}
                          <button className="btn-ghost rounded-lg px-3 py-1.5 text-xs">Edit Permissions</button>
                          <button className="btn-primary rounded-lg px-3 py-1.5 text-xs">Renew</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}