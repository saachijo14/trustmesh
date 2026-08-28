import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";

const performanceData = [
  { month: "Mar", precision: 88, recall: 79, f1: 83 },
  { month: "Apr", precision: 89, recall: 81, f1: 85 },
  { month: "May", precision: 91, recall: 82, f1: 86 },
  { month: "Jun", precision: 90, recall: 85, f1: 87 },
  { month: "Jul", precision: 93, recall: 86, f1: 89 },
  { month: "Aug", precision: 94, recall: 88, f1: 91 },
];

const fraudValueData = [
  { week: "W1", detected: 82, missed: 14, fp: 8 },
  { week: "W2", detected: 91, missed: 9, fp: 6 },
  { week: "W3", detected: 78, missed: 18, fp: 12 },
  { week: "W4", detected: 95, missed: 5, fp: 7 },
];

const ringOutcomes = [
  { ring: "RING-047", detected: "Aug 12", resolved: "—", exposure: "₹42.1L", outcome: "ACTIVE", actions: 24 },
  { ring: "RING-031", detected: "Aug 8", resolved: "—", exposure: "₹18.7L", outcome: "ACTIVE", actions: 11 },
  { ring: "RING-022", detected: "Jul 28", resolved: "Aug 14", exposure: "₹31.2L", outcome: "DISMANTLED", actions: 34 },
  { ring: "RING-018", detected: "Jul 15", resolved: "Aug 2", exposure: "₹9.4L", outcome: "DISMANTLED", actions: 19 },
];

const radarData = [
  { metric: "Precision", value: 94 },
  { metric: "Recall", value: 88 },
  { metric: "F1 Score", value: 91 },
  { metric: "Coverage", value: 85 },
  { metric: "Speed", value: 78 },
  { metric: "FP Rate", value: 82 },
];

const ledger = [
  { id: "DEC-18821", alert: "ALT-9821", decision: "BLOCK", model: "94", analyst: "Arjun R.", outcome: "TP", value: "₹42,400", time: "4m ago" },
  { id: "DEC-18820", alert: "ALT-9820", decision: "OTP", model: "81", analyst: "Priya M.", outcome: "TP", value: "₹18,700", time: "12m ago" },
  { id: "DEC-18819", alert: "ALT-9819", decision: "ALLOW", model: "67", analyst: "Auto", outcome: "FP", value: "₹9,800", time: "28m ago" },
  { id: "DEC-18818", alert: "ALT-9818", decision: "BLOCK", model: "52", analyst: "Arjun R.", outcome: "TP", value: "₹4,200", time: "1h ago" },
  { id: "DEC-18817", alert: "ALT-9817", decision: "ALLOW", model: "35", analyst: "Priya M.", outcome: "TN", value: "—", time: "2h ago" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg p-3 border border-[rgba(99,102,241,0.3)] text-xs">
      <div className="text-[#94a3b8] mb-1 font-mono">{label}</div>
      {// eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.stroke }} />
          <span className="text-[#64748b]">{p.name}:</span>
          <span className="text-[#e2e8f0] font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Metrics() {
  return (
    <div className="h-full scroll-area p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#e2e8f0] font-display">Metrics & Analytics</h1>
        <p className="text-sm text-[#64748b]">Model performance, fraud value, and decision intelligence</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Precision", value: "94.2%", delta: "+1.1%", color: "#6366f1" },
          { label: "Recall", value: "88.1%", delta: "+2.3%", color: "#06b6d4" },
          { label: "F1 Score", value: "91.0%", delta: "+1.7%", color: "#10b981" },
          { label: "Fraud Value Caught", value: "₹74.2L", delta: "+₹6.8L", color: "#f59e0b" },
          { label: "FP Cost (Aug)", value: "₹3.2L", delta: "-₹40K", color: "#8b5cf6" },
        ].map(k => (
          <div key={k.label} className="glass-card rounded-xl p-4 liquid-wave-card">
            <div className="text-2xl font-bold font-display mb-1" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-[#64748b]">{k.label}</div>
            <div className="text-[10px] text-[#10b981] mt-1 font-mono">{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Precision / Recall / F1 over time */}
        <div className="col-span-2 glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-1">Model Performance Trend</h3>
          <div className="flex gap-4 text-xs text-[#64748b] mb-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#6366f1] inline-block" />Precision</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#06b6d4] inline-block" />Recall</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981] inline-block" />F1</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 100]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="precision" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 3 }} />
              <Line type="monotone" dataKey="recall" stroke="#06b6d4" strokeWidth={2} dot={{ fill: "#06b6d4", r: 3 }} />
              <Line type="monotone" dataKey="f1" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Model Health Radar</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(99,102,241,0.15)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 9 }} />
              <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Fraud value breakdown */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-1">Fraud Detection by Week</h3>
          <p className="text-xs text-[#64748b] mb-4">% of orders: detected, missed, false-positive</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={fraudValueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
              <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="detected" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="missed" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="fp" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ring outcomes */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Ring Outcomes</h3>
          <div className="space-y-2">
            {ringOutcomes.map(r => (
              <div key={r.ring} className="flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(13,18,40,0.4)] text-xs">
                <span className="font-mono text-[#6366f1] font-semibold w-20">{r.ring}</span>
                <span className="text-[#64748b] w-16">{r.detected}</span>
                <span className="font-mono text-[#e2e8f0] w-16">{r.exposure}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${r.outcome === "ACTIVE" ? "badge-critical" : "badge-low"}`}>{r.outcome}</span>
                <span className="text-[#64748b] ml-auto">{r.actions} actions</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decision ledger */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[rgba(99,102,241,0.15)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Decision Ledger</h3>
          <button className="btn-ghost rounded-lg px-3 py-1.5 text-xs">Export</button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[rgba(99,102,241,0.1)]">
              {["Decision ID", "Alert", "Decision", "Model Score", "Analyst", "Outcome", "Value", "Time"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ledger.map((d, i) => (
              <tr key={d.id} className={`border-b border-[rgba(99,102,241,0.07)] hover:bg-[rgba(99,102,241,0.04)] transition-colors ${i % 2 === 0 ? "" : "bg-[rgba(13,18,40,0.3)]"}`}>
                <td className="px-4 py-3 font-mono text-[#6366f1] text-[10px]">{d.id}</td>
                <td className="px-4 py-3 font-mono text-[#94a3b8]">{d.alert}</td>
                <td className="px-4 py-3">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    d.decision === "BLOCK" ? "badge-critical" : d.decision === "OTP" ? "text-[#06b6d4] bg-[rgba(6,182,212,0.1)] border border-[rgba(6,182,212,0.2)]" : "badge-low"
                  }`}>{d.decision}</span>
                </td>
                <td className="px-4 py-3 font-mono text-[#e2e8f0]">{d.model}</td>
                <td className="px-4 py-3 text-[#94a3b8]">{d.analyst}</td>
                <td className="px-4 py-3">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    d.outcome === "TP" ? "badge-low" : d.outcome === "FP" ? "badge-medium" : "text-[#64748b] bg-[rgba(100,116,139,0.1)] border border-[rgba(100,116,139,0.2)]"
                  }`}>{d.outcome}</span>
                </td>
                <td className="px-4 py-3 font-mono text-[#e2e8f0]">{d.value}</td>
                <td className="px-4 py-3 text-[#64748b]">{d.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
