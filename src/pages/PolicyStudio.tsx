import { useState } from "react";

const versions = [
  { id: "v2.4.1", active: true, date: "Aug 25, 2026", changes: "Tightened ring threshold to 15 nodes" },
  { id: "v2.4.0", active: false, date: "Aug 18, 2026", changes: "Added agent checkout policy" },
  { id: "v2.3.2", active: false, date: "Aug 10, 2026", changes: "Coupon cap reduced to 3/day" },
];

export default function PolicyStudio() {
  const [tab, setTab] = useState<"thresholds" | "rules" | "coupons" | "simulation" | "versions">("thresholds");
  const [ringThreshold, setRingThreshold] = useState(15);
  const [velocityMultiplier, setVelocityMultiplier] = useState(5);
  const [couponCap, setCouponCap] = useState(3);
  const [maxOrderValue, setMaxOrderValue] = useState(50000);
  const [otpOnHigh, setOtpOnHigh] = useState(true);
  const [agentCheckout, setAgentCheckout] = useState(true);
  const [blockCritical, setBlockCritical] = useState(true);
  const [simRisk, setSimRisk] = useState(50);
  const [simResult, setSimResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const simulate = () => {
    const outcomes = [
      simRisk > 80 ? "BLOCK — Critical risk threshold exceeded" :
      simRisk > 60 ? "HOLD + OTP — High risk detected" :
      simRisk > 40 ? "OTP challenge — Medium risk" :
      "ALLOW — Low risk"
    ];
    setSimResult(outcomes[0]);
  };

  const save = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1500);
  };

  const tabs = ["thresholds", "rules", "coupons", "simulation", "versions"] as const;

  return (
    <div className="h-full scroll-area p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e2e8f0] font-display">Policy Studio</h1>
          <p className="text-sm text-[#64748b]">Configure risk thresholds, rules, and permissions · v2.4.1</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost rounded-lg px-4 py-2 text-sm">Discard</button>
          <button onClick={save} className={`btn-primary rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 ${saving ? "opacity-60" : ""}`}>
            {saving ? <><div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />Saving…</> : "Save Policy"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl p-1 flex gap-1">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
              tab === t ? "bg-[rgba(99,102,241,0.2)] text-[#6366f1] border border-[rgba(99,102,241,0.3)]" : "text-[#64748b] hover:text-[#94a3b8]"
            }`}
          >{t}</button>
        ))}
      </div>

      <div className="glass-card rounded-xl p-6">
        {tab === "thresholds" && (
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <SliderControl label="Ring Node Threshold" value={ringThreshold} min={5} max={50} onChange={setRingThreshold}
                description="Alert when ring exceeds this many nodes" unit=" nodes" color="#ef4444" />
              <SliderControl label="Velocity Multiplier" value={velocityMultiplier} min={2} max={20} onChange={setVelocityMultiplier}
                description="Flag orders exceeding baseline velocity by this factor" unit="×" color="#f97316" />
              <SliderControl label="Max Order Value" value={maxOrderValue} min={1000} max={200000} onChange={setMaxOrderValue}
                description="Block orders above this amount without additional verification" unit="₹" color="#8b5cf6" step={1000} prefix />
            </div>
            <div className="space-y-6">
              <SliderControl label="Coupon Daily Cap" value={couponCap} min={1} max={10} onChange={setCouponCap}
                description="Maximum coupon uses per entity per day" unit=" uses" color="#10b981" />
              <SliderControl label="ML Score Block Threshold" value={85} min={50} max={100} onChange={() => {}}
                description="Auto-block orders above this risk score" unit="" color="#6366f1" />
              <SliderControl label="FP Review Cooldown" value={24} min={1} max={168} onChange={() => {}}
                description="Hours before a false-positive entity is auto-cleared" unit="h" color="#06b6d4" />
            </div>
          </div>
        )}

        {tab === "rules" && (
          <div className="space-y-3">
            {[
              { name: "Auto-block on critical ring", desc: "Immediately block orders from CRITICAL ring nodes", state: blockCritical, set: setBlockCritical, impact: "HIGH" },
              { name: "OTP challenge on HIGH risk", desc: "Require OTP for orders with risk score 60–80", state: otpOnHigh, set: setOtpOnHigh, impact: "MEDIUM" },
              { name: "Allow agent-led checkout", desc: "Permit orders placed by AI buyer agents", state: agentCheckout, set: setAgentCheckout, impact: "HIGH" },
              { name: "Cascade ring block", desc: "Block entire ring when 3+ nodes hit CRITICAL", state: true, set: () => {}, impact: "HIGH" },
              { name: "Auto-assign analyst", desc: "Assign unreviewed alerts to available analyst", state: true, set: () => {}, impact: "LOW" },
              { name: "Escalate after 30min", desc: "Auto-escalate OPEN critical alerts after 30 minutes", state: false, set: () => {}, impact: "MEDIUM" },
            ].map(r => (
              <div key={r.name} className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(13,18,40,0.5)] border border-[rgba(99,102,241,0.1)] hover:border-[rgba(99,102,241,0.2)] transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#e2e8f0]">{r.name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${r.impact === "HIGH" ? "badge-high" : r.impact === "MEDIUM" ? "badge-medium" : "badge-low"}`}>{r.impact}</span>
                  </div>
                  <div className="text-xs text-[#64748b] mt-0.5">{r.desc}</div>
                </div>
                <div
                  onClick={() => r.set(!r.state)}
                  className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer shrink-0 ${r.state ? "bg-[#6366f1]" : "bg-[rgba(99,102,241,0.15)]"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${r.state ? "left-5" : "left-0.5"}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "coupons" && (
          <div className="space-y-4">
            <div className="text-sm text-[#94a3b8] mb-4">Configure coupon-level risk policies and usage caps.</div>
            {[
              { code: "SAVE40", cap: 3, value: "40%", status: "ACTIVE", uses: 9, risk: "HIGH" },
              { code: "WELCOME50", cap: 1, value: "50%", status: "RESTRICTED", uses: 12, risk: "CRITICAL" },
              { code: "FLAT200", cap: 5, value: "₹200", status: "ACTIVE", uses: 2, risk: "LOW" },
              { code: "REFERRAL10", cap: 10, value: "10%", status: "ACTIVE", uses: 1, risk: "LOW" },
            ].map(c => (
              <div key={c.code} className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(13,18,40,0.5)] border border-[rgba(99,102,241,0.1)]">
                <div className="font-mono text-[#10b981] font-bold text-sm w-28">{c.code}</div>
                <div className="flex-1 grid grid-cols-3 gap-4 text-xs">
                  <div><span className="text-[#64748b]">Value: </span><span className="text-[#e2e8f0] font-mono">{c.value}</span></div>
                  <div><span className="text-[#64748b]">Cap/day: </span><span className="text-[#e2e8f0] font-mono">{c.cap}</span></div>
                  <div><span className="text-[#64748b]">Today: </span><span className={`font-mono font-bold ${c.uses > c.cap ? "text-[#ef4444]" : "text-[#10b981]"}`}>{c.uses}</span></div>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${c.risk === "CRITICAL" ? "badge-critical" : c.risk === "HIGH" ? "badge-high" : "badge-low"}`}>{c.risk}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${c.status === "RESTRICTED" ? "badge-critical" : "badge-low"}`}>{c.status}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "simulation" && (
          <div className="max-w-lg mx-auto space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#e2e8f0] font-medium">Simulated Risk Score</span>
                <span className="font-mono font-bold text-[#6366f1]">{simRisk}</span>
              </div>
              <input type="range" min={0} max={100} value={simRisk} onChange={e => setSimRisk(+e.target.value)}
                className="w-full accent-[#6366f1]" />
              <div className="flex justify-between text-[10px] text-[#64748b] mt-1">
                <span>Low</span><span>Medium</span><span>High</span><span>Critical</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(13,18,40,0.5)] cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-[#6366f1]" />
                <span className="text-[#94a3b8]">Ring association</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(13,18,40,0.5)] cursor-pointer">
                <input type="checkbox" className="accent-[#6366f1]" />
                <span className="text-[#94a3b8]">Agent-led order</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(13,18,40,0.5)] cursor-pointer">
                <input type="checkbox" className="accent-[#6366f1]" />
                <span className="text-[#94a3b8]">Coupon cap exceeded</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(13,18,40,0.5)] cursor-pointer">
                <input type="checkbox" className="accent-[#6366f1]" />
                <span className="text-[#94a3b8]">New address</span>
              </label>
            </div>
            <button onClick={simulate} className="w-full btn-primary rounded-xl py-3 font-semibold">Run Simulation</button>
            {simResult && (
              <div className={`p-4 rounded-xl border text-sm font-semibold text-center ${
                simResult.startsWith("BLOCK") ? "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)] text-[#ef4444]" :
                simResult.startsWith("HOLD") ? "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)] text-[#f59e0b]" :
                simResult.startsWith("OTP") ? "bg-[rgba(6,182,212,0.1)] border-[rgba(6,182,212,0.3)] text-[#06b6d4]" :
                "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)] text-[#10b981]"
              }`}>{simResult}</div>
            )}
          </div>
        )}

        {tab === "versions" && (
          <div className="space-y-3">
            {versions.map(v => (
              <div key={v.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${v.active ? "bg-[rgba(99,102,241,0.08)] border-[rgba(99,102,241,0.3)]" : "bg-[rgba(13,18,40,0.5)] border-[rgba(99,102,241,0.1)]"}`}>
                <div className="font-mono text-[#6366f1] font-bold text-sm w-16">{v.id}</div>
                <div className="flex-1">
                  <div className="text-xs text-[#e2e8f0]">{v.changes}</div>
                  <div className="text-[10px] text-[#64748b] mt-0.5">{v.date}</div>
                </div>
                {v.active
                  ? <span className="badge-low text-[9px] font-bold px-2 py-0.5 rounded font-mono">ACTIVE</span>
                  : <button className="btn-ghost rounded-lg px-3 py-1.5 text-xs">Rollback</button>
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SliderControl({ label, value, min, max, onChange, description, unit, color, step = 1, prefix = false }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
  description: string; unit: string; color: string; step?: number; prefix?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <div className="text-sm font-medium text-[#e2e8f0]">{label}</div>
        <div className="font-mono text-sm font-bold" style={{ color }}>
          {prefix ? unit : ""}{value.toLocaleString()}{!prefix ? unit : ""}
        </div>
      </div>
      <input
        type="range" min={min} max={max} value={value} step={step}
        onChange={e => onChange(+e.target.value)}
        className="w-full"
        style={{ accentColor: color }}
      />
      <div className="text-[10px] text-[#64748b] mt-0.5">{description}</div>
    </div>
  );
}
