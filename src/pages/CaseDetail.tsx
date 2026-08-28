import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const contributions = [
  { label: "Ring Overlap", score: 38, color: "#ef4444" },
  { label: "Velocity Spike", score: 24, color: "#f97316" },
  { label: "Device Match", score: 18, color: "#f59e0b" },
  { label: "Coupon Abuse", score: 9, color: "#8b5cf6" },
  { label: "Address Reuse", score: 5, color: "#06b6d4" },
];

const entities = [
  { type: "Customer", id: "CUS-38821", value: "Ravi S. (masked)", flag: true },
  { type: "Device", id: "DEV-fp-a4c3", value: "Chrome/Android · IN", flag: true },
  { type: "Address", id: "ADDR-221b", value: "221B, MG Road, Bangalore", flag: false },
  { type: "Coupon", id: "CPN-SAVE40", value: "SAVE40 · Used 9/day-cap 3", flag: true },
  { type: "Payment", id: "PAY-rzp-9821", value: "****4421 · Razorpay UPI", flag: false },
];

const similarCases = [
  { id: "ALT-9716", similarity: 91, ring: "RING-047", outcome: "BLOCKED" },
  { id: "ALT-9680", similarity: 84, ring: "RING-047", outcome: "BLOCKED" },
  { id: "ALT-9502", similarity: 77, ring: "RING-031", outcome: "OTP_REQ" },
];

const timeline = [
  { time: "08:42:11", event: "Alert created by ML model v2.4", actor: "System", color: "#6366f1" },
  { time: "08:43:02", event: "Auto-assigned to Arjun R.", actor: "System", color: "#06b6d4" },
  { time: "08:47:38", event: "Reviewed by analyst — opened case", actor: "Arjun R.", color: "#94a3b8" },
  { time: "08:51:22", event: "Evidence path highlighted — Ring #47 core", actor: "Arjun R.", color: "#f59e0b" },
];

const actions = [
  { label: "Allow", color: "#10b981", icon: "✓", needsReason: false },
  { label: "Request OTP", color: "#06b6d4", icon: "🔐", needsReason: false },
  { label: "Restrict Coupon", color: "#f59e0b", icon: "✂️", needsReason: true },
  { label: "Hold Order", color: "#f97316", icon: "⏸", needsReason: true },
  { label: "Escalate", color: "#8b5cf6", icon: "↑", needsReason: true },
  { label: "Mark Abuse", color: "#ef4444", icon: "🚫", needsReason: true },
  { label: "False Positive", color: "#64748b", icon: "✗", needsReason: true },
];

const nodeTypeColor: Record<string, string> = {
  Customer: "#3b82f6",
  Device: "#8b5cf6",
  Address: "#f97316",
  Coupon: "#10b981",
  Payment: "#64748b",
};

export default function CaseDetail() {
  const { alertId } = useParams<{ alertId: string }>();
  const navigate = useNavigate();
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"evidence" | "entities" | "similar">("evidence");

  const chosen = actions.find(a => a.label === selectedAction);

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setSelectedAction(null); setReason(""); }, 2000);
  };

  return (
    <div className="h-full scroll-area p-6 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => navigate("/alerts")} className="text-[#6366f1] hover:text-[#818cf8] transition-colors flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Alert Queue
        </button>
        <span className="text-[#64748b]">/</span>
        <span className="text-[#e2e8f0] font-mono font-semibold">{alertId}</span>
        <span className="badge-critical text-[9px] px-2 py-0.5 rounded font-mono font-bold ml-2">CRITICAL · 94</span>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: Order summary + risk */}
        <div className="col-span-2 space-y-4">
          {/* Order summary */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#e2e8f0] mb-4">Order Summary</h2>
            <div className="grid grid-cols-3 gap-4 text-xs">
              {[
                { l: "Order ID", v: "ORD-4421" },
                { l: "Merchant", v: "ZapShop India" },
                { l: "Amount", v: "₹82,400" },
                { l: "Coupon", v: "SAVE40 (40% off)" },
                { l: "Payment", v: "Razorpay UPI ****4421" },
                { l: "Payment State", v: "Authorized" },
                { l: "Ring", v: "RING-047" },
                { l: "Agent-led", v: "Yes · AI Buyer v3" },
                { l: "Created", v: "Aug 27, 08:41:53" },
              ].map(({ l, v }) => (
                <div key={l}>
                  <div className="text-[#64748b]">{l}</div>
                  <div className="text-[#e2e8f0] font-mono mt-0.5">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk score + contributions */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-[rgba(239,68,68,0.15)] border-2 border-[#ef4444] flex items-center justify-center">
                <span className="text-2xl font-bold text-[#ef4444] font-mono">94</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-[#e2e8f0]">Risk Score</div>
                <div className="text-xs text-[#64748b]">ML ensemble · v2.4.1 · 94th percentile</div>
                <div className="text-xs text-[#ef4444] mt-1">↑ Escalating — Ring expanding</div>
              </div>
            </div>
            <div className="space-y-2.5">
              {contributions.map(c => (
                <div key={c.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#94a3b8]">{c.label}</span>
                    <span className="font-mono" style={{ color: c.color }}>{c.score} pts</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(c.score / 38) * 100}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs: Evidence / Entities / Similar */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex border-b border-[rgba(99,102,241,0.15)]">
              {(["evidence", "entities", "similar"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 text-xs font-semibold capitalize transition-colors ${
                    activeTab === tab ? "text-[#6366f1] border-b-2 border-[#6366f1] bg-[rgba(99,102,241,0.05)]" : "text-[#64748b] hover:text-[#94a3b8]"
                  }`}
                >{tab === "similar" ? "Similar Cases" : tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
              ))}
            </div>
            <div className="p-5">
              {activeTab === "evidence" && (
                <div className="space-y-3 text-xs text-[#94a3b8] leading-relaxed">
                  <p>This order exhibits <span className="text-[#ef4444] font-semibold">3 of 4 critical ring indicators</span>. Customer CUS-38821 is a <span className="text-[#f97316]">core node in RING-047</span>, connected to 14 other accounts via shared device fingerprint DEV-fp-a4c3.</p>
                  <p>Coupon <span className="text-[#10b981] font-mono">SAVE40</span> has been redeemed 9 times today against a cap of 3, across accounts sharing address ADDR-221b — a known abuse pattern.</p>
                  <p>The <span className="text-[#8b5cf6] font-semibold">AI buyer agent</span> placed this order via structured API calls, bypassing normal storefront rate limits. Velocity is <span className="text-[#ef4444]">14× above baseline</span>.</p>
                  <p className="text-[#6366f1] font-semibold">Recommendation: BLOCK and restrict coupon SAVE40 for this entity cluster. Escalate RING-047 for full review.</p>
                </div>
              )}
              {activeTab === "entities" && (
                <div className="space-y-2">
                  {entities.map(e => (
                    <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(13,18,40,0.5)]">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: nodeTypeColor[e.type] }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-semibold" style={{ color: nodeTypeColor[e.type] }}>{e.type}</span>
                          <span className="text-[#6366f1] font-mono text-[10px]">{e.id}</span>
                        </div>
                        <div className="text-[#94a3b8] text-[11px] truncate">{e.value}</div>
                      </div>
                      {e.flag && <span className="text-[#ef4444] text-xs">⚑</span>}
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "similar" && (
                <div className="space-y-2">
                  {similarCases.map(c => (
                    <div key={c.id} className="flex items-center gap-4 p-3 rounded-lg bg-[rgba(13,18,40,0.5)]">
                      <span className="text-[#6366f1] font-mono text-xs font-semibold">{c.id}</span>
                      <div className="flex-1">
                        <div className="h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                          <div className="h-full bg-[#6366f1] rounded-full" style={{ width: `${c.similarity}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-mono text-[#94a3b8]">{c.similarity}%</span>
                      <span className="text-[9px] font-mono text-[#64748b]">{c.ring}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${c.outcome === "BLOCKED" ? "badge-critical" : "badge-medium"}`}>{c.outcome}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Mini graph + Actions + Timeline */}
        <div className="space-y-4">
          {/* Mini graph */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-xs font-semibold text-[#e2e8f0] mb-3">Entity Graph — Shortest Path</h3>
            <div className="relative h-48 bg-[rgba(13,18,40,0.6)] rounded-lg overflow-hidden">
              <svg width="100%" height="100%" viewBox="0 0 200 180">
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                {/* Edges */}
                {[
                  [100, 90, 50, 50], [100, 90, 150, 50], [100, 90, 50, 140],
                  [100, 90, 150, 140], [50, 50, 25, 100], [150, 50, 175, 100],
                ].map(([x1, y1, x2, y2], i) => (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(99,102,241,0.3)" strokeWidth={1} />
                ))}
                {/* Highlighted path */}
                <line x1={100} y1={90} x2={50} y2={50} stroke="#ef4444" strokeWidth={2} filter="url(#glow)" />
                <line x1={50} y1={50} x2={25} y2={100} stroke="#ef4444" strokeWidth={2} filter="url(#glow)" />
                {/* Nodes */}
                {[
                  { cx: 100, cy: 90, r: 10, fill: "#3b82f6", label: "CUS" },
                  { cx: 50, cy: 50, r: 7, fill: "#8b5cf6", label: "DEV" },
                  { cx: 150, cy: 50, r: 7, fill: "#f97316", label: "ADDR" },
                  { cx: 50, cy: 140, r: 7, fill: "#10b981", label: "CPN" },
                  { cx: 150, cy: 140, r: 6, fill: "#64748b", label: "ORD" },
                  { cx: 25, cy: 100, r: 7, fill: "#ef4444", label: "REF" },
                  { cx: 175, cy: 100, r: 6, fill: "#ec4899", label: "AGT" },
                ].map((n, i) => (
                  <g key={i}>
                    <circle cx={n.cx} cy={n.cy} r={n.r} fill={n.fill} filter="url(#glow)" opacity={0.9} />
                    <text x={n.cx} y={n.cy + n.r + 8} textAnchor="middle" fill="#94a3b8" fontSize="6">{n.label}</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Action Panel */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-xs font-semibold text-[#e2e8f0] mb-3">Analyst Actions</h3>
            {submitted ? (
              <div className="py-4 text-center text-[#10b981] text-sm font-semibold">✓ Action submitted</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {actions.map(a => (
                    <button
                      key={a.label}
                      onClick={() => setSelectedAction(a.label)}
                      className={`px-2 py-2 rounded-lg text-[11px] font-semibold text-left transition-all border ${
                        selectedAction === a.label
                          ? "border-[rgba(99,102,241,0.5)] bg-[rgba(99,102,241,0.15)]"
                          : "border-[rgba(99,102,241,0.1)] bg-[rgba(13,18,40,0.5)] hover:border-[rgba(99,102,241,0.25)]"
                      }`}
                      style={{ color: selectedAction === a.label ? "#e2e8f0" : "#94a3b8" }}
                    >
                      <span className="mr-1">{a.icon}</span> {a.label}
                    </button>
                  ))}
                </div>
                {chosen?.needsReason && (
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Reason required for this action…"
                    className="w-full bg-[rgba(13,18,40,0.8)] border border-[rgba(99,102,241,0.2)] rounded-lg p-2.5 text-xs text-[#e2e8f0] placeholder:text-[#64748b] focus:outline-none focus:border-[rgba(99,102,241,0.4)] resize-none h-16 mb-2"
                  />
                )}
                {selectedAction && (
                  <button
                    onClick={handleSubmit}
                    disabled={chosen?.needsReason && !reason.trim()}
                    className="w-full btn-primary rounded-lg py-2 text-xs font-semibold disabled:opacity-40"
                  >
                    Submit: {selectedAction}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Audit Timeline */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-xs font-semibold text-[#e2e8f0] mb-3">Audit Timeline</h3>
            <div className="space-y-3">
              {timeline.map((t, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ background: t.color }} />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-[rgba(99,102,241,0.15)] mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="text-[10px] font-mono text-[#64748b]">{t.time} · {t.actor}</div>
                    <div className="text-xs text-[#94a3b8] mt-0.5">{t.event}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}