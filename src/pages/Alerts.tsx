import { useState } from "react";
import { useNavigate } from "react-router-dom";

const alerts = [
  { id: "ALT-9821", order: "ORD-4421", risk: 94, tier: "CRITICAL", exposure: "₹42,400", ring: "RING-047", coupon: "SAVE40", amount: "₹82,400", paymentState: "Authorized", agentLed: true, reasons: ["Ring overlap", "Velocity spike", "Device match"], action: "BLOCK", status: "OPEN", assignee: "Arjun R.", time: "4m ago" },
  { id: "ALT-9820", order: "ORD-4418", risk: 81, tier: "HIGH", exposure: "₹18,700", ring: "RING-031", coupon: "WELCOME50", amount: "₹24,200", paymentState: "Pending", agentLed: false, reasons: ["Coupon abuse", "Multi-account"], action: "OTP", status: "REVIEWING", assignee: "Priya M.", time: "12m ago" },
  { id: "ALT-9819", order: "ORD-4410", risk: 67, tier: "HIGH", exposure: "₹9,800", ring: "—", coupon: "FLAT200", amount: "₹14,500", paymentState: "Authorized", agentLed: true, reasons: ["Device FP match", "New address"], action: "HOLD", status: "OPEN", assignee: "—", time: "28m ago" },
  { id: "ALT-9818", order: "ORD-4402", risk: 52, tier: "MEDIUM", exposure: "₹4,200", ring: "RING-052", coupon: "—", amount: "₹9,100", paymentState: "Captured", agentLed: false, reasons: ["Address reuse ×3", "Refund pattern"], action: "REVIEW", status: "RESOLVED", assignee: "Arjun R.", time: "1h ago" },
  { id: "ALT-9817", order: "ORD-4399", risk: 48, tier: "MEDIUM", exposure: "₹3,100", ring: "—", coupon: "SAVE40", amount: "₹7,200", paymentState: "Authorized", agentLed: false, reasons: ["Email variation"], action: "ALLOW", status: "CLOSED", assignee: "Priya M.", time: "2h ago" },
  { id: "ALT-9816", order: "ORD-4390", risk: 91, tier: "CRITICAL", exposure: "₹38,000", ring: "RING-047", coupon: "WELCOME50", amount: "₹72,100", paymentState: "Pending", agentLed: true, reasons: ["Ring core node", "High value", "OTP bypass attempt"], action: "BLOCK", status: "ESCALATED", assignee: "Rahul K.", time: "3h ago" },
  { id: "ALT-9815", order: "ORD-4385", risk: 35, tier: "LOW", exposure: "₹800", ring: "—", coupon: "—", amount: "₹2,400", paymentState: "Captured", agentLed: false, reasons: ["First-time buyer"], action: "ALLOW", status: "CLOSED", assignee: "Auto", time: "4h ago" },
];

const tierBadge = (tier: string) => {
  if (tier === "CRITICAL") return "badge-critical";
  if (tier === "HIGH") return "badge-high";
  if (tier === "MEDIUM") return "badge-medium";
  return "badge-low";
};

const statusColor = (s: string) => {
  if (s === "OPEN") return "text-[#ef4444] bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.25)]";
  if (s === "REVIEWING") return "text-[#f59e0b] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.25)]";
  if (s === "ESCALATED") return "text-[#8b5cf6] bg-[rgba(139,92,246,0.1)] border-[rgba(139,92,246,0.25)]";
  if (s === "RESOLVED") return "text-[#10b981] bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.25)]";
  return "text-[#64748b] bg-[rgba(100,116,139,0.1)] border-[rgba(100,116,139,0.25)]";
};

export default function Alerts() {
  const navigate = useNavigate();
  const [tier, setTier] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [agentLed, setAgentLed] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = alerts.filter(a => {
    if (tier !== "ALL" && a.tier !== tier) return false;
    if (status !== "ALL" && a.status !== status) return false;
    if (agentLed && !a.agentLed) return false;
    if (search && !a.id.includes(search.toUpperCase()) && !a.order.includes(search.toUpperCase())) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e2e8f0] font-display">Alert Queue</h1>
          <p className="text-sm text-[#64748b]">{filtered.length} alerts · Analyst view</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost rounded-lg px-3 py-2 text-xs">Assign Batch</button>
          <button className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">Export CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ALT- or ORD-"
            className="bg-[rgba(13,18,40,0.8)] border border-[rgba(99,102,241,0.2)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#e2e8f0] placeholder:text-[#64748b] focus:outline-none focus:border-[rgba(99,102,241,0.4)] w-36"
          />
        </div>
        <FilterSelect label="Risk Tier" value={tier} onChange={setTier} options={["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"]} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={["ALL", "OPEN", "REVIEWING", "ESCALATED", "RESOLVED", "CLOSED"]} />
        <label className="flex items-center gap-2 cursor-pointer text-xs text-[#94a3b8]">
          <div
            onClick={() => setAgentLed(!agentLed)}
            className={`w-8 h-4 rounded-full relative transition-colors cursor-pointer ${agentLed ? "bg-[#6366f1]" : "bg-[rgba(99,102,241,0.15)]"}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${agentLed ? "left-4" : "left-0.5"}`} />
          </div>
          Agent-led Only
        </label>
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
            More Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 glass rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(99,102,241,0.15)]">
                {["Alert ID", "Order", "Risk", "Exposure", "Top Reasons", "Rec. Action", "Status", "Assignee", "Time"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[#64748b] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/alerts/${a.id}`)}
                  className={`border-b border-[rgba(99,102,241,0.07)] hover:bg-[rgba(99,102,241,0.06)] cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-[rgba(13,18,40,0.3)]"}`}
                >
                  <td className="px-4 py-3 font-mono text-[#6366f1] font-semibold">{a.id}</td>
                  <td className="px-4 py-3 font-mono text-[#94a3b8]">{a.order}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-bold font-mono ${a.risk > 80 ? "text-[#ef4444]" : a.risk > 60 ? "text-[#f97316]" : a.risk > 40 ? "text-[#f59e0b]" : "text-[#10b981]"}`}>{a.risk}</div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${tierBadge(a.tier)}`}>{a.tier}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[#e2e8f0]">{a.exposure}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {a.reasons.map(r => (
                        <span key={r} className="bg-[rgba(99,102,241,0.1)] text-[#94a3b8] border border-[rgba(99,102,241,0.15)] text-[9px] px-1.5 py-0.5 rounded">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-[9px] font-bold px-2 py-1 rounded ${
                      a.action === "BLOCK" ? "bg-[rgba(239,68,68,0.15)] text-[#ef4444]" :
                      a.action === "OTP" ? "bg-[rgba(6,182,212,0.15)] text-[#06b6d4]" :
                      a.action === "HOLD" ? "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]" :
                      "bg-[rgba(16,185,129,0.15)] text-[#10b981]"
                    }`}>{a.action}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono ${statusColor(a.status)}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8]">{a.assignee}</td>
                  <td className="px-4 py-3 text-[#64748b]">{a.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-[rgba(13,18,40,0.8)] border border-[rgba(99,102,241,0.2)] rounded-lg px-3 py-1.5 text-xs text-[#94a3b8] focus:outline-none focus:border-[rgba(99,102,241,0.4)] cursor-pointer"
    >
      {options.map(o => <option key={o} value={o}>{o === "ALL" ? label + ": All" : o}</option>)}
    </select>
  );
}