import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const trendData = [
  { day: "Aug 1", orders: 2840, gmv: 42, rings: 4, alerts: 12 },
  { day: "Aug 5", orders: 3120, gmv: 58, rings: 6, alerts: 18 },
  { day: "Aug 9", orders: 2760, gmv: 51, rings: 5, alerts: 9 },
  { day: "Aug 13", orders: 4200, gmv: 76, rings: 8, alerts: 24 },
  { day: "Aug 17", orders: 3850, gmv: 69, rings: 7, alerts: 21 },
  { day: "Aug 21", orders: 5100, gmv: 94, rings: 11, alerts: 31 },
  { day: "Aug 27", orders: 4780, gmv: 88, rings: 9, alerts: 27 },
];

const interventionData = [
  { name: "Allowed", value: 4320, color: "#10b981" },
  { name: "OTP Req.", value: 1240, color: "#06b6d4" },
  { name: "Held", value: 820, color: "#f59e0b" },
  { name: "Blocked", value: 340, color: "#ef4444" },
  { name: "False Pos.", value: 290, color: "#64748b" },
];

const kpis = [
  { label: "Monitored Orders", value: "48,291", delta: "+12.4%", up: true, color: "#6366f1", icon: "📦" },
  { label: "GMV Screened", value: "₹8.84Cr", delta: "+9.1%", up: true, color: "#06b6d4", icon: "💰" },
  { label: "Active Rings", value: "47", delta: "+3", up: false, color: "#ef4444", icon: "🔗" },
  { label: "Critical Alerts", value: "23", delta: "-5 vs yesterday", up: true, color: "#f97316", icon: "🚨" },
  { label: "Total Exposure", value: "₹2.14Cr", delta: "+₹18L", up: false, color: "#8b5cf6", icon: "⚠️" },
  { label: "Loss Prevented", value: "₹74.2L", delta: "+₹6.8L", up: true, color: "#10b981", icon: "🛡️" },
  { label: "Pending Review", value: "142", delta: "+18", up: false, color: "#f59e0b", icon: "⏳" },
  { label: "FP Cost", value: "₹3.2L", delta: "-₹40K", up: true, color: "#64748b", icon: "📉" },
];

const rings = [
  { id: "RING-047", nodes: 28, exposure: "₹42.1L", risk: "CRITICAL", trend: "growing", added: "2h ago" },
  { id: "RING-031", nodes: 15, exposure: "₹18.7L", risk: "HIGH", trend: "stable", added: "6h ago" },
  { id: "RING-052", nodes: 9, exposure: "₹7.4L", risk: "MEDIUM", trend: "shrinking", added: "1d ago" },
];

const latestAlerts = [
  { id: "ALT-9821", order: "ORD-4421", risk: 94, tier: "CRITICAL", reason: "Ring overlap + velocity spike", status: "OPEN", time: "4m ago" },
  { id: "ALT-9820", order: "ORD-4418", risk: 81, tier: "HIGH", reason: "Coupon abuse pattern", status: "REVIEWING", time: "12m ago" },
  { id: "ALT-9819", order: "ORD-4410", risk: 67, tier: "HIGH", reason: "Device fingerprint match", status: "OPEN", time: "28m ago" },
  { id: "ALT-9818", order: "ORD-4402", risk: 52, tier: "MEDIUM", reason: "Address reuse >3x", status: "RESOLVED", time: "1h ago" },
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [injecting, setInjecting] = useState(false);

  const handleInject = () => {
    setInjecting(true);
    setTimeout(() => setInjecting(false), 2000);
  };

  return (
    <div className="h-full scroll-area p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e2e8f0] font-display">Risk Dashboard</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Real-time merchant risk overview · Aug 27, 2026</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleInject}
            className={`btn-ghost rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 ${injecting ? "opacity-60" : ""}`}
          >
            {injecting ? (
              <>
                <div className="w-3 h-3 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin" />
                Injecting…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                </svg>
                Inject Scenario
              </>
            )}
          </button>
          <button className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">Export Report</button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="glass-card liquid-wave-card rounded-xl p-4 cursor-pointer hover:scale-[1.01] transition-transform">
            <div className="flex items-start justify-between mb-3">
              <div className="text-lg">{k.icon}</div>
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${k.up ? "text-[#10b981] bg-[rgba(16,185,129,0.1)]" : "text-[#ef4444] bg-[rgba(239,68,68,0.1)]"}`}>
                {k.delta}
              </span>
            </div>
            <div className="text-2xl font-bold font-display" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-[#64748b] mt-1">{k.label}</div>
            <div className="mt-3 h-1 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${40 + i * 7}%`, background: k.color, opacity: 0.7 }} />
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
              <h3 className="text-sm font-semibold text-[#e2e8f0]">Orders & GMV Trend</h3>
              <p className="text-xs text-[#64748b]">Past 27 days</p>
            </div>
            <div className="flex gap-3 text-xs text-[#64748b]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#6366f1] inline-block" />Orders</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#06b6d4] inline-block" />GMV (₹L)</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="orders" stroke="#6366f1" fill="url(#ordersGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="gmv" stroke="#06b6d4" fill="url(#gmvGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Intervention outcomes */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-1">Intervention Outcomes</h3>
          <p className="text-xs text-[#64748b] mb-4">Last 7 days</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={interventionData} layout="vertical">
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={3}>
                {interventionData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {interventionData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-[#94a3b8]">{d.name}</span>
                </div>
                <span className="font-mono text-[#e2e8f0]">{d.value.toLocaleString()}</span>
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
            <h3 className="text-sm font-semibold text-[#e2e8f0]">Active Rings</h3>
            <button onClick={() => navigate("/rings")} className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors">View All →</button>
          </div>
          <div className="space-y-3">
            {rings.map(r => (
              <div key={r.id} className="flex items-center gap-4 p-3 rounded-lg bg-[rgba(13,18,40,0.5)] border border-[rgba(99,102,241,0.1)] hover:border-[rgba(99,102,241,0.25)] transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-[rgba(99,102,241,0.15)] flex items-center justify-center">
                  <span className="text-lg">🔗</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-[#e2e8f0]">{r.id}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                      r.risk === "CRITICAL" ? "badge-critical" : r.risk === "HIGH" ? "badge-high" : "badge-medium"
                    }`}>{r.risk}</span>
                  </div>
                  <div className="text-xs text-[#64748b] mt-0.5">{r.nodes} nodes · Added {r.added}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-[#e2e8f0]">{r.exposure}</div>
                  <div className={`text-xs mt-0.5 ${r.trend === "growing" ? "text-[#ef4444]" : r.trend === "stable" ? "text-[#f59e0b]" : "text-[#10b981]"}`}>
                    {r.trend === "growing" ? "↑ Growing" : r.trend === "stable" ? "→ Stable" : "↓ Shrinking"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Alerts */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#e2e8f0]">Latest Alerts</h3>
            <button onClick={() => navigate("/alerts")} className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors">View Queue →</button>
          </div>
          <div className="space-y-2">
            {latestAlerts.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(13,18,40,0.5)] border border-[rgba(99,102,241,0.1)] hover:border-[rgba(99,102,241,0.25)] transition-all cursor-pointer">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold font-mono ${
                    a.risk > 80 ? "bg-[rgba(239,68,68,0.15)] text-[#ef4444]" : a.risk > 60 ? "bg-[rgba(249,115,22,0.15)] text-[#f97316]" : "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]"
                  }`}>{a.risk}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#6366f1]">{a.id}</span>
                    <span className="text-xs text-[#64748b]">·</span>
                    <span className="text-xs font-mono text-[#94a3b8]">{a.order}</span>
                  </div>
                  <div className="text-xs text-[#64748b] mt-0.5 truncate">{a.reason}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    a.status === "OPEN" ? "badge-critical" : a.status === "REVIEWING" ? "badge-medium" : "badge-low"
                  }`}>{a.status}</span>
                  <div className="text-[10px] text-[#64748b] mt-1">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}