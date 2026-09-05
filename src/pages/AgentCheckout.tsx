import { useState, useEffect, useRef } from "react";
import {evaluateCheckout,createPaymentOrder,verifyPayment} from "../api/client";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpayPaymentResponse) => void;
};

type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: string,
    handler: (response: unknown) => void
  ) => void;
};

type CheckoutResult = {
  risk: {
    customer_id: string;
    risk_score: number;
    risk_tier: string;
    features?: {
      D?: number;
      R?: number;
      V?: number;
      C?: number;
      B?: number;
      F?: number;
    };
  };
  policy: {
    decision: string;
    allowed_actions: string[];
    blocked_actions: string[];
    reason_codes: string[];
    recommended_action: string;
    requires_human_approval: boolean;
  };
  trustpass: {
    trustpass_id: string;
    status: string;
    allowed_actions: string[];
    blocked_actions: string[];
    max_permitted_amount_inr: number;
    coupon_cap_inr: number;
  };
};



const cartItems = [
  {
    name: "Wireless Earbuds Pro",
    qty: 1,
    price: 8400,
    img: "🎧",
  },
  {
    name: "Smart Watch Series 5",
    qty: 1,
    price: 24200,
    img: "⌚",
  },
];

export default function AgentCheckout() {
  
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [gateDenied, setGateDenied] = useState(false);
  const [razorpayOpen, setRazorpayOpen] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [checkoutResult, setCheckoutResult] =
    useState<CheckoutResult | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
  "idle" | "processing" | "success" | "failed"
  >("idle");
  const [paymentMessage, setPaymentMessage] = useState("");

  const [chatMessages, setChatMessages] = useState<
  { role: "agent" | "system"; content: string }[]
>([]);

  const chatRef = useRef<HTMLDivElement>(null);

  const customerId = "ringA_customer_0";
  const cartId = "cart_test_1";

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const discount = subtotal * 0.4;
  const total = subtotal - discount;

useEffect(() => {
  const itemSummary = cartItems
    .map(
      (item) =>
        `${item.name} (₹${item.price.toLocaleString("en-IN")})`
    )
    .join(" + ");
// The async loader updates state after the API response arrives.
  // This is intentional because the effect synchronizes the page with backend policy state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setChatMessages([
    {
      role: "agent",
      content:
        `I'd like to purchase ${itemSummary}. ` +
        `I have coupon SAVE40. My budget is ₹25,000.`,
    },
  ]);
}, []);

  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chatMessages]);

  const handleOtpChange = (i: number, v: string) => {
    if (v.length > 1) return;

    const next = [...otp];
    next[i] = v;
    setOtp(next);

    if (v && i < 5) {
      document.getElementById(`otp-${i + 1}`)?.focus();
    }
  };

  const openRazorpayCheckout = async () => {
  if (!checkoutResult) {
    setCheckoutError("Checkout evaluation is required first.");
    return;
  }

  setPaymentLoading(true);
  setPaymentStatus("processing");
  setPaymentMessage("");
  setCheckoutError("");

  try {
    if (!window.Razorpay) {
      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );

      if (!existingScript) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");

          script.src =
            "https://checkout.razorpay.com/v1/checkout.js";

          script.onload = () => resolve();
          script.onerror = () =>
            reject(
              new Error(
                "Unable to load Razorpay Checkout."
              )
            );

          document.body.appendChild(script);
        });
      }
    }

    if (!window.Razorpay) {
      throw new Error(
        "Razorpay Checkout could not be loaded."
      );
    }

    const trustpassId =
      checkoutResult.trustpass.trustpass_id;

    const order = await createPaymentOrder(
      customerId,
      cartId,
      total,
      trustpassId
    );

    const options: RazorpayOptions = {
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: "TrustMesh",
      description: "TrustMesh Agent Checkout",
      order_id: order.order_id,

      prefill: {
        name: "TrustMesh Test Customer",
        contact: "9999999999",
      },

      theme: {
        color: "#6366f1",
      },

      modal: {
        ondismiss: () => {
          setPaymentLoading(false);
          setPaymentStatus("idle");
          setPaymentMessage(
            "Payment window was closed."
          );
        },
      },

      handler: async (
        response: RazorpayPaymentResponse
      ) => {
        try {
          setPaymentMessage(
            "Verifying payment with TrustMesh…"
          );

          const verification =
            await verifyPayment(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature
            );

          if (
              verification.verified &&
              verification.paid
            ) {
              setPaymentStatus("success");
              setPaymentMessage(
                "Payment verified successfully."
              );

              setChatMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content:
                    `Payment verified successfully · ₹${total.toLocaleString(
                      "en-IN"
                    )} captured by Razorpay.`,
                },
                {
                  role: "agent",
                  content:
                    "Payment confirmed. The checkout is complete.",
                },
              ]);
            } else {
            setPaymentStatus("failed");
            setPaymentMessage(
              verification.message ||
                "Payment could not be confirmed."
            );
          }
        } catch (error) {
          setPaymentStatus("failed");
          setPaymentMessage(
            error instanceof Error
              ? error.message
              : "Payment verification failed."
          );
        } finally {
          setPaymentLoading(false);
        }
      },
    };

    const razorpay = new window.Razorpay(options);

    razorpay.on(
      "payment.failed",
      (response: unknown) => {
        const failed = response as {
          error?: {
            description?: string;
          };
        };

        setPaymentStatus("failed");
        setPaymentMessage(
          failed.error?.description ||
            "Payment failed."
        );
        setPaymentLoading(false);
      }
    );

    razorpay.open();
  } catch (error) {
    setPaymentStatus("failed");
    setPaymentMessage(
      error instanceof Error
        ? error.message
        : "Unable to start payment."
    );
    setPaymentLoading(false);
  }
};

  const runCheckoutEvaluation = async () => {
    setEvaluating(true);
    setCheckoutError("");
    setGateDenied(false);
    setRazorpayOpen(false);
    setPaymentStatus("idle");
    setPaymentMessage("");

    setChatMessages((prev) => [
    ...prev,
    {
      role: "system",
      content:
        `Processing checkout request… Applying SAVE40. ` +
        `Cart total: ₹${total.toLocaleString("en-IN")} after discount.`,
    },
    {
      role: "agent",
      content:
        "The cart is ready. Please evaluate the checkout risk before payment.",
    },
    {
      role: "system",
      content: "🔍 Risk evaluation in progress…",
    },
  ]);

    try {
      const result = await evaluateCheckout(
        customerId,
        cartId,
        total,
        100
      );

      setCheckoutResult(result);

const decision = result.policy.decision;
const score = Math.round(result.risk.risk_score);
const tier = result.risk.risk_tier.toUpperCase();

setChatMessages((prev) => [
  ...prev,
  {
    role: "system",
    content:
      `Risk evaluation completed · Score: ${score} · Tier: ${tier}.`,
  },
]);

if (result.policy.reason_codes.length > 0) {
  setChatMessages((prev) => [
    ...prev,
    {
      role: "system",
      content:
        `Risk signals: ${result.policy.reason_codes
          .slice(0, 3)
          .join(" · ")}`,
    },
  ]);
}

setChatMessages((prev) => [
  ...prev,
  {
    role: "system",
    content:
      `Policy decision: ${decision.replaceAll("_", " ")}.`,
  },
]);

      if (
  decision === "DENY_AUTONOMOUS_ACTION" ||
  decision === "HOLD_FOR_REVIEW"
) {
  setChatMessages((prev) => [
    ...prev,
    {
      role: "system",
      content:
        decision === "HOLD_FOR_REVIEW"
          ? "Checkout is held for analyst review."
          : "Autonomous checkout is blocked by policy.",
    },
  ]);

  setGateDenied(true);
  return;
}

if (decision === "STEP_UP_REQUIRED") {
  setChatMessages((prev) => [
    ...prev,
    {
      role: "system",
      content:
        "Additional verification is required before payment.",
    },
    {
      role: "system",
      content:
        `TrustPass issued: ${result.trustpass.trustpass_id}`,
    },
  ]);

  setOtpOpen(true);
  return;
}

if (decision === "ALLOW") {
  setChatMessages((prev) => [
    ...prev,
    {
      role: "system",
      content:
        `Checkout approved. TrustPass issued: ${result.trustpass.trustpass_id}`,
    },
  ]);

  setRazorpayOpen(true);
}
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Checkout evaluation failed."
      );
    } finally {
      setEvaluating(false);
    }
  };

  const riskScore = checkoutResult?.risk.risk_score ?? 0;
  const riskTier = checkoutResult?.risk.risk_tier ?? "pending";
  const decision = checkoutResult?.policy.decision ?? "PENDING";

  const featureValues = checkoutResult?.risk.features;

  const riskSteps = [
    {
      label: "Identity verification",
      status: "pass",
      detail: `${customerId} · Evaluated`,
    },
    {
      label: "Device fingerprint",
      status:
        featureValues?.D && featureValues.D >= 50 ? "warn" : "pass",
      detail:
        featureValues?.D !== undefined
          ? `Shared-device score ${featureValues.D}`
          : "Awaiting evaluation",
    },
    {
      label: "Coupon validation",
      status:
        featureValues?.C && featureValues.C >= 50 ? "fail" : "pass",
      detail:
        featureValues?.C !== undefined
          ? `Coupon concentration score ${featureValues.C}`
          : "Awaiting evaluation",
    },
    {
      label: "Ring association",
      status:
        featureValues?.B && featureValues.B >= 50 ? "fail" : "pass",
      detail:
        featureValues?.B !== undefined
          ? `Ring association score ${featureValues.B}`
          : "Awaiting evaluation",
    },
    {
      label: "Velocity check",
      status:
        featureValues?.V && featureValues.V >= 50 ? "warn" : "pass",
      detail:
        featureValues?.V !== undefined
          ? `Velocity score ${featureValues.V}`
          : "Awaiting evaluation",
    },
    {
      label: "TrustPass lookup",
      status: checkoutResult ? "pass" : "warn",
      detail: checkoutResult
        ? checkoutResult.trustpass.trustpass_id
        : "Not evaluated",
    },
  ];

  const getRiskColor = () => {
    if (riskTier === "critical") return "#ef4444";
    if (riskTier === "high") return "#f97316";
    if (riskTier === "medium") return "#f59e0b";
    if (riskTier === "low") return "#10b981";
    return "#64748b";
  };

  return (
    <div className="h-full scroll-area p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#e2e8f0] font-display">
            Agent Checkout Simulator
          </h1>

          <p className="text-sm text-[#64748b]">
            AI buyer simulation with real-time risk evaluation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge-high text-[10px] px-2 py-0.5 rounded font-mono font-bold">
            AI BUYER AGENT v3
          </span>

          <span
            className="text-[10px] px-2 py-0.5 rounded font-mono font-bold"
            style={{
              color: getRiskColor(),
              background: `${getRiskColor()}18`,
              border: `1px solid ${getRiskColor()}35`,
            }}
          >
            RISK:{" "}
            {checkoutResult ? Math.round(riskScore) : "PENDING"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* =====================================================
            Chat + Policy
        ===================================================== */}
        <div className="space-y-4">
          {/* Chat */}
          <div className="glass-card rounded-xl flex flex-col h-72">
            <div className="px-4 py-3 border-b border-[rgba(99,102,241,0.15)] flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#ec4899] animate-pulse" />

              <span className="text-xs font-semibold text-[#e2e8f0]">
                Agent Conversation
              </span>
            </div>

            <div
              ref={chatRef}
              className="flex-1 overflow-y-auto p-3 space-y-3"
            >
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.role === "agent"
                      ? "justify-start"
                      : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      m.role === "agent"
                        ? "bg-[rgba(236,72,153,0.12)] border border-[rgba(236,72,153,0.2)] text-[#94a3b8]"
                        : "bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.2)] text-[#94a3b8]"
                    }`}
                  >
                    {m.role === "agent" && (
                      <span className="text-[#ec4899] font-semibold font-mono text-[9px] block mb-0.5">
                        AGENT
                      </span>
                    )}

                    {m.role === "system" && (
                      <span className="text-[#6366f1] font-semibold font-mono text-[9px] block mb-0.5">
                        SYSTEM
                      </span>
                    )}

                    {m.content}
                  </div>
                </div>
              ))}

              
            </div>
          </div>

          {/* Policy Snapshot */}
          <div className="glass-card rounded-xl p-4">
            <div className="text-xs font-semibold text-[#e2e8f0] mb-3">
              Policy Snapshot
            </div>

            {[
              {
                  rule: "Coupon cap",
                  limit: "₹100",
                  current: checkoutResult
                    ? `₹${checkoutResult.trustpass.coupon_cap_inr}`
                    : "₹100",
                  fail: Boolean(
                    checkoutResult?.policy.reason_codes.some((r) =>
                      r.toLowerCase().includes("coupon")
                    )
                  ),
                },
              {
                rule: "Max order value",
                limit: "₹50,000",
                current: `₹${total.toLocaleString("en-IN")}`,
                fail: total > 50000,
              },
              {
                rule: "Agent checkout",
                limit: checkoutResult
                  ? checkoutResult.policy.decision
                  : "Pending",
                current: checkoutResult
                  ? checkoutResult.policy.recommended_action
                  : "Pending",
                fail:
                  checkoutResult?.policy.requires_human_approval ?? false,
              },
              {
                rule: "Ring association",
                limit: "Risk signal",
                current:
                  featureValues?.B !== undefined
                    ? featureValues.B
                    : "Pending",
                fail: Boolean(
                  featureValues?.B && featureValues.B >= 50
                ),
              },
            ].map((r) => (
              <div
                key={r.rule}
                className={`flex items-center gap-2 py-1.5 px-2 rounded text-xs mb-1 ${
                  r.fail
                    ? "bg-[rgba(239,68,68,0.05)]"
                    : ""
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    r.fail
                      ? "bg-[#ef4444]"
                      : "bg-[#10b981]"
                  }`}
                />

                <span className="text-[#94a3b8] flex-1">
                  {r.rule}
                </span>

                <span className="font-mono text-[#64748b]">
                  {r.limit}
                </span>

                <span
                  className={`font-mono font-semibold ${
                    r.fail
                      ? "text-[#ef4444]"
                      : "text-[#10b981]"
                  }`}
                >
                  {r.current}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* =====================================================
            Cart + Risk Steps
        ===================================================== */}
        <div className="space-y-4">
          {/* Cart */}
          <div className="glass-card rounded-xl p-4">
            <div className="text-xs font-semibold text-[#e2e8f0] mb-3">
              Cart
            </div>

            <div className="space-y-2 mb-4">
              {cartItems.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 p-2 rounded-lg bg-[rgba(13,18,40,0.4)]"
                >
                  <div className="text-2xl">{item.img}</div>

                  <div className="flex-1">
                    <div className="text-xs font-medium text-[#e2e8f0]">
                      {item.name}
                    </div>

                    <div className="text-[10px] text-[#64748b]">
                      Qty: {item.qty}
                    </div>
                  </div>

                  <div className="text-xs font-mono font-semibold text-[#e2e8f0]">
                    ₹{item.price.toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[rgba(99,102,241,0.15)] pt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748b]">
                  Subtotal
                </span>

                <span className="font-mono text-[#e2e8f0]">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#10b981]">
                  Coupon SAVE40
                </span>

                <span className="font-mono text-[#10b981]">
                  -₹{discount.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between font-semibold">
                <span className="text-[#e2e8f0]">
                  Total
                </span>

                <span className="font-mono text-[#06b6d4] text-sm">
                  ₹{total.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Risk Steps */}
          <div className="glass-card rounded-xl p-4">
            <div className="text-xs font-semibold text-[#e2e8f0] mb-3">
              Risk Evaluation Steps
            </div>

            <div className="space-y-2">
              {riskSteps.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                      r.status === "pass"
                        ? "bg-[rgba(16,185,129,0.2)] text-[#10b981]"
                        : r.status === "warn"
                        ? "bg-[rgba(245,158,11,0.2)] text-[#f59e0b]"
                        : "bg-[rgba(239,68,68,0.2)] text-[#ef4444]"
                    }`}
                  >
                    {r.status === "pass"
                      ? "✓"
                      : r.status === "warn"
                      ? "!"
                      : "✗"}
                  </div>

                  <div className="flex-1">
                    <div className="text-xs text-[#e2e8f0]">
                      {r.label}
                    </div>

                    <div className="text-[10px] text-[#64748b]">
                      {r.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =====================================================
            TrustPass + Payment Gate
        ===================================================== */}
        <div className="space-y-4">
          {/* TrustPass */}
          <div className="glass-card rounded-xl p-4">
            <div className="text-xs font-semibold text-[#e2e8f0] mb-3">
              TrustPass Status
            </div>

            <div
              className={`flex items-center gap-3 p-3 rounded-xl ${
                checkoutResult?.trustpass.status === "active"
                  ? "bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)]"
                  : "bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)]"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-[rgba(99,102,241,0.15)] flex items-center justify-center text-xl">
                {checkoutResult?.trustpass.status === "active"
                  ? "🛡️"
                  : "🚫"}
              </div>

              <div>
                <div
                  className={`text-xs font-semibold ${
                    checkoutResult?.trustpass.status === "active"
                      ? "text-[#10b981]"
                      : "text-[#ef4444]"
                  }`}
                >
                  {checkoutResult
                    ? checkoutResult.trustpass.status ===
                      "active"
                      ? "TrustPass Issued"
                      : "TrustPass Restricted"
                    : "Not Evaluated"}
                </div>

                <div className="text-[10px] text-[#64748b]">
                  {checkoutResult
                    ? checkoutResult.trustpass.trustpass_id
                    : "Run checkout evaluation"}
                </div>

                {checkoutResult && (
                  <div className="text-[10px] text-[#64748b]">
                    Max permitted: ₹
                    {checkoutResult.trustpass.max_permitted_amount_inr.toLocaleString(
                      "en-IN"
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 text-[10px] text-[#64748b]">
              TrustPass is generated by the backend policy
              engine and contains bounded checkout permissions.
            </div>
          </div>

          {/* Payment Gate */}
          <div className="glass-card rounded-xl p-4">
            <div className="text-xs font-semibold text-[#e2e8f0] mb-3">
              Payment Gate
            </div>

            {gateDenied ? (
              <div className="p-4 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-center">
                <div className="text-3xl mb-2">🚫</div>

                <div className="text-sm font-bold text-[#ef4444]">
                  {decision === "HOLD_FOR_REVIEW"
                    ? "Order Held for Review"
                    : "Order Blocked"}
                </div>

                <div className="text-xs text-[#94a3b8] mt-1">
                  {checkoutResult?.policy.reason_codes.join(
                    " · "
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4 text-xs text-[#94a3b8]">
                  {checkoutResult ? (
                      checkoutResult.policy.decision === "ALLOW" ? (
                        checkoutResult.policy.reason_codes.length > 0 ? (
                          checkoutResult.policy.reason_codes
                            .slice(0, 4)
                            .map((reason, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 p-2 rounded bg-[rgba(16,185,129,0.05)]"
                              >
                                <span>✓</span>
                                <span>{reason}</span>
                              </div>
                            ))
                        ) : (
                          <div className="p-2 rounded bg-[rgba(16,185,129,0.05)]">
                            ✓ Checkout approved by policy
                          </div>
                        )
                      ) : (
                        <>
                          <div className="flex items-start gap-2 p-2 rounded bg-[rgba(245,158,11,0.08)]">
                            <span>⚠️</span>

                            <span>
                              {checkoutResult.policy.decision ===
                              "STEP_UP_REQUIRED"
                                ? "Additional verification is required before payment."
                                : checkoutResult.policy.decision ===
                                  "HOLD_FOR_REVIEW"
                                ? "This order is held for analyst review."
                                : "Autonomous checkout is blocked by policy."}
                            </span>
                          </div>

                          {checkoutResult.policy.reason_codes
                            .slice(0, 4)
                            .map((reason, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 p-2 rounded bg-[rgba(245,158,11,0.05)]"
                              >
                                <span>⚠️</span>
                                <span>{reason}</span>
                              </div>
                            ))}
                        </>
                      )
                    ) : (
                    <>
                      <div className="flex items-start gap-2 p-2 rounded bg-[rgba(245,158,11,0.05)]">
                        <span>ℹ️</span>
                        <span>
                          Checkout evaluation will run before
                          payment.
                        </span>
                      </div>

                      <div className="flex items-start gap-2 p-2 rounded bg-[rgba(99,102,241,0.05)]">
                        <span>🔍</span>
                        <span>
                          Risk, policy and TrustPass will be
                          evaluated by the backend.
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {checkoutError && (
                  <div className="mb-3 p-2 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[10px] text-[#ef4444]">
                    {checkoutError}
                  </div>
                )}

                <button
                  onClick={runCheckoutEvaluation}
                  disabled={evaluating}
                  className="w-full btn-primary rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {evaluating
                    ? "Evaluating Risk…"
                    : "Proceed to Payment →"}
                </button>
              </>
            )}
          </div>

          {/* Real Razorpay Checkout */}
          {razorpayOpen && (
            <div className="glass-card rounded-xl p-4">
              <div className="text-xs font-semibold text-[#e2e8f0] mb-3">
                Razorpay Checkout
              </div>

              {paymentStatus === "success" ? (
                <div className="p-4 rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.25)] text-center">
                  <div className="text-3xl mb-2">✅</div>

                  <div className="text-sm font-bold text-[#10b981]">
                    Payment Successful
                  </div>

                  <div className="text-xs text-[#94a3b8] mt-1">
                    Payment verified by TrustMesh
                  </div>

                  <div className="text-[10px] text-[#64748b] mt-2">
                    Order: {cartId}
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-[rgba(13,18,40,0.6)] text-center mb-3">
                    <div className="text-3xl mb-2">💳</div>

                    <div className="text-xs text-[#94a3b8]">
                      Razorpay Test Mode
                    </div>

                    <div className="text-lg font-bold text-[#e2e8f0] mt-1">
                      ₹{total.toLocaleString("en-IN")}
                    </div>

                    <div className="text-[10px] text-[#64748b] mt-1">
                      A secure Razorpay Checkout window
                      will open.
                    </div>
                  </div>

                  {paymentMessage && (
                    <div
                      className={`mb-3 p-2 rounded-lg text-[10px] ${
                        paymentStatus === "failed"
                          ? "bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[#ef4444]"
                          : "bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] text-[#94a3b8]"
                      }`}
                    >
                      {paymentMessage}
                    </div>
                  )}

                  <button
                    onClick={openRazorpayCheckout}
                    disabled={paymentLoading}
                    className="w-full btn-primary rounded-lg py-2.5 text-xs font-semibold disabled:opacity-50"
                  >
                    {paymentLoading
                      ? "Processing Payment…"
                      : `Pay ₹${total.toLocaleString("en-IN")}`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          OTP Modal
      ===================================================== */}
      {otpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-8 w-96 gradient-border">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🔐</div>

              <h2 className="text-lg font-bold text-[#e2e8f0] font-display">
                OTP Verification
              </h2>

              <p className="text-xs text-[#64748b] mt-1">
                Simulated step-up verification · Enter any 6 digits
              </p>
            </div>  

            <div className="flex gap-2 justify-center mb-6">
              {otp.map((v, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  value={v}
                  onChange={(e) =>
                    handleOtpChange(i, e.target.value)
                  }
                  maxLength={1}
                  className="w-10 h-12 text-center text-lg font-bold font-mono bg-[rgba(13,18,40,0.8)] border border-[rgba(99,102,241,0.3)] rounded-lg text-[#6366f1] focus:outline-none focus:border-[rgba(99,102,241,0.6)]"
                />
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setOtpOpen(false)}
                className="flex-1 btn-ghost rounded-xl py-2.5 text-sm"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (otp.some((digit) => !digit)) {
                    setCheckoutError("Enter all 6 OTP digits.");
                    return;
                  }

                  setOtpOpen(false);
                  setRazorpayOpen(true);
                  setPaymentMessage(
                    "Step-up verification completed in simulator mode."
                  );
                }}
                className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-semibold"
              >
                Verify & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}