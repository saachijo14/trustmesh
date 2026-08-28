import { useState, useEffect, useRef } from "react";

const messages = [
  { role: "agent", content: "Hi! I'd like to purchase the Wireless Earbuds Pro (₹8,400) + Smart Watch Series 5 (₹24,200). I have coupon SAVE40. My budget is ₹25,000." },
  { role: "system", content: "Processing request… Applying coupon SAVE40. Cart total: ₹19,560 after discount." },
  { role: "agent", content: "Great! Please proceed with payment via UPI." },
  { role: "system", content: "🔍 Risk check in progress…" },
];

const riskSteps = [
  { label: "Identity verification", status: "pass", detail: "CUS-38821 · Verified" },
  { label: "Device fingerprint", status: "warn", detail: "DEV-fp-a4c3 · Seen on 5 accounts" },
  { label: "Coupon validation", status: "fail", detail: "SAVE40 exceeded daily cap (9/3)" },
  { label: "Ring association", status: "fail", detail: "RING-047 · Critical risk" },
  { label: "Velocity check", status: "warn", detail: "14× baseline" },
  { label: "TrustPass lookup", status: "pass", detail: "No TrustPass record" },
];

const cartItems = [
  { name: "Wireless Earbuds Pro", qty: 1, price: 8400, img: "🎧" },
  { name: "Smart Watch Series 5", qty: 1, price: 24200, img: "⌚" },
];

export default function AgentCheckout() {
  const [step, setStep] = useState(0);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [gateDenied, setGateDenied] = useState(false);
  const [razorpayOpen, setRazorpayOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState(messages.slice(0, 1));
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step < messages.length - 1) {
      const t = setTimeout(() => {
        setChatMessages(prev => [...prev, messages[step + 1]]);
        setStep(s => s + 1);
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [step]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages]);

  const handleOtpChange = (i: number, v: string) => {
    if (v.length > 1) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
  };

  const handleProceed = () => {
    const failCount = riskSteps.filter(r => r.status === "fail").length;
    if (failCount >= 2) setGateDenied(true);
    else setOtpOpen(true);
  };

  const discount = cartItems.reduce((s, i) => s + i.price, 0) * 0.4;
  const total = cartItems.reduce((s, i) => s + i.price, 0) - discount;

  return (
    <div className="h-full scroll-area p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#e2e8f0] font-display">Agent Checkout Simulator</h1>
          <p className="text-sm text-[#64748b]">AI buyer simulation with real-time risk evaluation</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-high text-[10px] px-2 py-0.5 rounded font-mono font-bold">AI BUYER AGENT v3</span>
          <span className="badge-critical text-[10px] px-2 py-0.5 rounded font-mono font-bold">RISK: 94</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Chat + Policy */}
        <div className="space-y-4">
          {/* Chat */}
          <div className="glass-card rounded-xl flex flex-col h-72">
            <div className="px-4 py-3 border-b border-[rgba(99,102,241,0.15)] flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#ec4899] animate-pulse" />
              <span className="text-xs font-semibold text-[#e2e8f0]">Agent Conversation</span>
            </div>
            <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "agent" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    m.role === "agent"
                      ? "bg-[rgba(236,72,153,0.12)] border border-[rgba(236,72,153,0.2)] text-[#94a3b8]"
                      : "bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.2)] text-[#94a3b8]"
                  }`}>
                    {m.role === "agent" && <span className="text-[#ec4899] font-semibold font-mono text-[9px] block mb-0.5">AGENT</span>}
                    {m.role === "system" && <span className="text-[#6366f1] font-semibold font-mono text-[9px] block mb-0.5">SYSTEM</span>}
                    {m.content}
                  </div>
                </div>
              ))}
              {step < messages.length - 1 && (
                <div className="flex justify-end">
                  <div className="bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] rounded-xl px-3 py-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Policy snapshot */}
          <div className="glass-card rounded-xl p-4">
            <div className="text-xs font-semibold text-[#e2e8f0] mb-3">Policy Snapshot</div>
            {[
              { rule: "Max coupon per day", limit: "3", current: "9", fail: true },
              { rule: "Max order value", limit: "₹50,000", current: "₹32,600", fail: false },
              { rule: "Agent checkout", limit: "Allowed", current: "Flagged", fail: true },
              { rule: "Ring block threshold", limit: "CRITICAL", current: "CRITICAL", fail: true },
            ].map(r => (
              <div key={r.rule} className={`flex items-center gap-2 py-1.5 px-2 rounded text-xs mb-1 ${r.fail ? "bg-[rgba(239,68,68,0.05)]" : ""}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${r.fail ? "bg-[#ef4444]" : "bg-[#10b981]"}`} />
                <span className="text-[#94a3b8] flex-1">{r.rule}</span>
                <span className="font-mono text-[#64748b]">{r.limit}</span>
                <span className={`font-mono font-semibold ${r.fail ? "text-[#ef4444]" : "text-[#10b981]"}`}>{r.current}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cart + Risk Steps */}
        <div className="space-y-4">
          {/* Cart */}
          <div className="glass-card rounded-xl p-4">
            <div className="text-xs font-semibold text-[#e2e8f0] mb-3">Cart</div>
            <div className="space-y-2 mb-4">
              {cartItems.map(item => (
                <div key={item.name} className="flex items-center gap-3 p-2 rounded-lg bg-[rgba(13,18,40,0.4)]">
                  <div className="text-2xl">{item.img}</div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-[#e2e8f0]">{item.name}</div>
                    <div className="text-[10px] text-[#64748b]">Qty: {item.qty}</div>
                  </div>
                  <div className="text-xs font-mono font-semibold text-[#e2e8f0]">₹{item.price.toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-[rgba(99,102,241,0.15)] pt-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-[#64748b]">Subtotal</span><span className="font-mono text-[#e2e8f0]">₹{cartItems.reduce((s,i)=>s+i.price,0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[#10b981]">Coupon SAVE40</span><span className="font-mono text-[#10b981]">-₹{discount.toLocaleString()}</span></div>
              <div className="flex justify-between font-semibold"><span className="text-[#e2e8f0]">Total</span><span className="font-mono text-[#06b6d4] text-sm">₹{total.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Risk steps */}
          <div className="glass-card rounded-xl p-4">
            <div className="text-xs font-semibold text-[#e2e8f0] mb-3">Risk Evaluation Steps</div>
            <div className="space-y-2">
              {riskSteps.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                    r.status === "pass" ? "bg-[rgba(16,185,129,0.2)] text-[#10b981]" :
                    r.status === "warn" ? "bg-[rgba(245,158,11,0.2)] text-[#f59e0b]" :
                    "bg-[rgba(239,68,68,0.2)] text-[#ef4444]"
                  }`}>
                    {r.status === "pass" ? "✓" : r.status === "warn" ? "!" : "✗"}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-[#e2e8f0]">{r.label}</div>
                    <div className="text-[10px] text-[#64748b]">{r.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TrustPass + Payment gate */}
        <div className="space-y-4">
          {/* TrustPass card */}
          <div className="glass-card rounded-xl p-4">
            <div className="text-xs font-semibold text-[#e2e8f0] mb-3">TrustPass Status</div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)]">
              <div className="w-10 h-10 rounded-full bg-[rgba(239,68,68,0.15)] flex items-center justify-center text-xl">🚫</div>
              <div>
                <div className="text-xs font-semibold text-[#ef4444]">No TrustPass</div>
                <div className="text-[10px] text-[#64748b]">CUS-38821 not registered</div>
                <div className="text-[10px] text-[#64748b]">High-risk profile · Blocked from express checkout</div>
              </div>
            </div>
            <div className="mt-3 text-[10px] text-[#64748b]">TrustPass allows verified customers to skip friction checks. This entity is ineligible due to ring association.</div>
          </div>

          {/* Payment gate */}
          <div className="glass-card rounded-xl p-4">
            <div className="text-xs font-semibold text-[#e2e8f0] mb-3">Payment Gate</div>
            {gateDenied ? (
              <div className="p-4 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-center">
                <div className="text-3xl mb-2">🚫</div>
                <div className="text-sm font-bold text-[#ef4444]">Order Blocked</div>
                <div className="text-xs text-[#94a3b8] mt-1">Multiple critical policy violations detected</div>
                <div className="text-xs text-[#64748b] mt-1">Ring-047 · Coupon cap exceeded · Agent pattern</div>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4 text-xs text-[#94a3b8]">
                  {[
                    { icon: "⚠️", text: "Coupon SAVE40 cap exceeded — restricted" },
                    { icon: "⚠️", text: "Ring-047 association — high risk" },
                    { icon: "ℹ️", text: "OTP challenge may be issued" },
                  ].map((w, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded bg-[rgba(245,158,11,0.05)]">
                      <span>{w.icon}</span>
                      <span>{w.text}</span>
                    </div>
                  ))}
                </div>
                <button onClick={handleProceed} className="w-full btn-primary rounded-xl py-2.5 text-sm font-semibold">
                  Proceed to Payment →
                </button>
              </>
            )}
          </div>

          {/* Razorpay mock */}
          {razorpayOpen && (
            <div className="glass-card rounded-xl p-4">
              <div className="text-xs font-semibold text-[#e2e8f0] mb-3">Razorpay Checkout</div>
              <div className="p-3 rounded-lg bg-[rgba(13,18,40,0.6)] text-center mb-3">
                <div className="text-2xl mb-1">💳</div>
                <div className="text-xs text-[#94a3b8]">Test Mode · ₹{total.toLocaleString()}</div>
                <input placeholder="UPI ID or Card" className="mt-2 w-full bg-[rgba(13,18,40,0.8)] border border-[rgba(99,102,241,0.2)] rounded px-2 py-1.5 text-xs text-[#e2e8f0] placeholder:text-[#64748b] focus:outline-none" />
              </div>
              <button className="w-full btn-primary rounded-lg py-2 text-xs font-semibold">Pay ₹{total.toLocaleString()}</button>
            </div>
          )}
        </div>
      </div>

      {/* OTP Modal */}
      {otpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-8 w-96 gradient-border">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🔐</div>
              <h2 className="text-lg font-bold text-[#e2e8f0] font-display">OTP Verification</h2>
              <p className="text-xs text-[#64748b] mt-1">OTP sent to +91 ****1234 · Expires in 5:00</p>
            </div>
            <div className="flex gap-2 justify-center mb-6">
              {otp.map((v, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  value={v}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  maxLength={1}
                  className="w-10 h-12 text-center text-lg font-bold font-mono bg-[rgba(13,18,40,0.8)] border border-[rgba(99,102,241,0.3)] rounded-lg text-[#6366f1] focus:outline-none focus:border-[rgba(99,102,241,0.6)]"
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setOtpOpen(false)} className="flex-1 btn-ghost rounded-xl py-2.5 text-sm">Cancel</button>
              <button
                onClick={() => { setOtpOpen(false); setRazorpayOpen(true); }}
                className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-semibold"
              >Verify & Proceed</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
