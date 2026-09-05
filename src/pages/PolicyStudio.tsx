import { useEffect, useState } from "react";

import {
  getPolicy,
  updatePolicy,
  evaluatePolicy,
  getPolicyVersions,
  rollbackPolicyVersion,
} from "../api/client";


type PolicyConfig = {
  max_autonomous_order_value_inr: number;
  coupon_cap_new_account_inr: number;
  coupon_cap_medium_risk_inr: number;
  ring_node_threshold: number;
  otp_max_challenges_per_window: number;
  hold_expiry_minutes: number;
};


type PolicyResponse = {
  policy_version: string;
  config: PolicyConfig;
};


type EvaluationResult = {
  customer_id: string;
  risk_score: number;
  risk_tier: string;
  decision: string;
  recommended_action: string;
  reason_codes: string[];
  requires_human_approval: boolean;
};


type PolicyVersion = {
  id: string;
  policy_version: string;
  created_at: string;
  active: boolean;
  changes: string;
  config: PolicyConfig;
};


const defaultConfig: PolicyConfig = {
  max_autonomous_order_value_inr: 50000,
  coupon_cap_new_account_inr: 100,
  coupon_cap_medium_risk_inr: 100,
  ring_node_threshold: 15,
  otp_max_challenges_per_window: 3,
  hold_expiry_minutes: 30,
};


export default function PolicyStudio() {

  const [tab, setTab] = useState<
    "thresholds" | "rules" | "coupons" | "simulation" | "versions"
  >("thresholds");


  const [config, setConfig] =
    useState<PolicyConfig>(defaultConfig);


  const [savedConfig, setSavedConfig] =
    useState<PolicyConfig>(defaultConfig);


  const [policyVersion, setPolicyVersion] =
    useState("v1.0");


  const [loading, setLoading] =
    useState(true);


  const [saving, setSaving] =
    useState(false);


  const [message, setMessage] =
    useState<string | null>(null);


  const [simCustomer, setSimCustomer] =
    useState("ringA_customer_0");


  const [simAmount, setSimAmount] =
    useState(19560);


  const [simResult, setSimResult] =
    useState<EvaluationResult | null>(null);


  const [simLoading, setSimLoading] =
    useState(false);


  const [versions, setVersions] =
    useState<PolicyVersion[]>([]);


  const [versionsLoading, setVersionsLoading] =
    useState(false);


  const [rollbackLoading, setRollbackLoading] =
    useState<string | null>(null);


  const loadPolicy = async () => {

    try {

      setLoading(true);

      const result =
        (await getPolicy()) as PolicyResponse;

      setPolicyVersion(result.policy_version);

      setConfig(result.config);

      setSavedConfig(result.config);

    } catch (error) {

      console.error(error);

      setMessage(
        "Failed to load policy configuration."
      );

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPolicy();

  }, []);


  const loadVersions = async () => {

    try {

      setVersionsLoading(true);

      const result =
        (await getPolicyVersions()) as PolicyVersion[];

      setVersions(result);

    } catch (error) {

      console.error(error);

      setMessage(
        "Failed to load policy versions."
      );

    } finally {

      setVersionsLoading(false);

    }
  };


  useEffect(() => {

    if (tab === "versions") {
      // The async loader updates state after the API response arrives.
  // This is intentional because the effect synchronizes the page with backend policy state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadVersions();

    }

  }, [tab]);


  const save = async () => {

    try {

      setSaving(true);

      setMessage(null);

      const result =
        (await updatePolicy(config)) as PolicyResponse;

      setPolicyVersion(result.policy_version);

      setConfig(result.config);

      setSavedConfig(result.config);

      setMessage(
        "Policy saved successfully."
      );

      await loadVersions();

    } catch (error) {

      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save policy."
      );

    } finally {

      setSaving(false);

    }
  };


  const discard = () => {

    setConfig(savedConfig);

    setMessage(
      "Unsaved changes discarded."
    );

  };


  const updateConfig = <
    K extends keyof PolicyConfig
  >(
    key: K,
    value: PolicyConfig[K]
  ) => {

    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));

    setMessage(null);

  };


  const simulate = async () => {
  try {
    setSimLoading(true);
    setSimResult(null);
    setMessage(null);

    const result = await evaluatePolicy(
      simCustomer,
      simAmount
    ) as {
      risk: {
        customer_id: string;
        risk_score: number;
        risk_tier: string;
        reason_codes?: string[];
      };
      policy: {
        decision: string;
        recommended_action: string;
        reason_codes?: string[];
        requires_human_approval: boolean;
      };
    };

    setSimResult({
      customer_id: result.risk.customer_id,
      risk_score: result.risk.risk_score,
      risk_tier: result.risk.risk_tier,
      decision: result.policy.decision,
      recommended_action: result.policy.recommended_action,
      reason_codes:
        result.policy.reason_codes ??
        result.risk.reason_codes ??
        [],
      requires_human_approval:
        result.policy.requires_human_approval,
    });

  } catch (error) {
    console.error(error);

    setMessage(
      error instanceof Error
        ? error.message
        : "Simulation failed."
    );
  } finally {
    setSimLoading(false);
  }
};


  const rollback = async (
    versionId: string
  ) => {

    try {

      setRollbackLoading(versionId);

      setMessage(null);

      const result =
        (await rollbackPolicyVersion(
          versionId
        )) as {
          config: PolicyConfig;
        };

      setConfig(result.config);

      setSavedConfig(result.config);

      setMessage(
        `Policy rolled back to ${versionId}.`
      );

      await loadPolicy();

      await loadVersions();

      setTab("thresholds");

    } catch (error) {

      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Rollback failed."
      );

    } finally {

      setRollbackLoading(null);

    }
  };


  const tabs = [
    "thresholds",
    "rules",
    "coupons",
    "simulation",
    "versions",
  ] as const;


  return (

    <div className="h-full scroll-area p-6 space-y-5">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-xl font-bold text-[#e2e8f0] font-display">
            Policy Studio
          </h1>

          <p className="text-sm text-[#64748b]">
            Configure risk thresholds, rules, and permissions ·{" "}
            {policyVersion}
          </p>

        </div>


        <div className="flex gap-2">

          <button
            onClick={discard}
            disabled={saving}
            className="btn-ghost rounded-lg px-4 py-2 text-sm"
          >
            Discard
          </button>


          <button
            onClick={save}
            disabled={saving || loading}
            className={`btn-primary rounded-lg px-4 py-2 text-sm font-semibold ${
              saving ? "opacity-60" : ""
            }`}
          >

            {saving
              ? "Saving…"
              : "Save Policy"}

          </button>

        </div>

      </div>


      {/* MESSAGE */}

      {message && (

        <div
          className={`rounded-lg px-4 py-3 text-xs border ${
            message.toLowerCase().includes("failed")
              ? "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.25)] text-[#ef4444]"
              : "bg-[rgba(16,185,129,0.08)] border-[rgba(16,185,129,0.25)] text-[#10b981]"
          }`}
        >

          {message}

        </div>

      )}


      {/* TABS */}

      <div className="glass rounded-xl p-1 flex gap-1">

        {tabs.map((t) => (

          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
              tab === t
                ? "bg-[rgba(99,102,241,0.2)] text-[#6366f1] border border-[rgba(99,102,241,0.3)]"
                : "text-[#64748b] hover:text-[#94a3b8]"
            }`}
          >

            {t}

          </button>

        ))}

      </div>


      <div className="glass-card rounded-xl p-6">


        {/* ===================================================== */}
        {/* THRESHOLDS */}
        {/* ===================================================== */}

        {tab === "thresholds" && (

          loading ? (

            <div className="py-16 text-center text-sm text-[#64748b]">
              Loading policy configuration…
            </div>

          ) : (

            <div className="grid grid-cols-2 gap-8">

              <div className="space-y-6">

                <SliderControl
                  label="Ring Node Threshold"
                  value={config.ring_node_threshold}
                  min={5}
                  max={50}
                  onChange={(v) =>
                    updateConfig(
                      "ring_node_threshold",
                      v
                    )
                  }
                  description="Minimum detected ring size used by policy controls"
                  unit=" nodes"
                  color="#ef4444"
                />


                <SliderControl
                  label="Max Autonomous Order Value"
                  value={
                    config.max_autonomous_order_value_inr
                  }
                  min={1000}
                  max={200000}
                  step={1000}
                  onChange={(v) =>
                    updateConfig(
                      "max_autonomous_order_value_inr",
                      v
                    )
                  }
                  description="Orders above this amount cannot be autonomously approved"
                  unit="₹"
                  color="#8b5cf6"
                  prefix
                />


                <SliderControl
                  label="Hold Expiry"
                  value={config.hold_expiry_minutes}
                  min={5}
                  max={120}
                  onChange={(v) =>
                    updateConfig(
                      "hold_expiry_minutes",
                      v
                    )
                  }
                  description="Minutes before a held case expires"
                  unit=" min"
                  color="#f97316"
                />

              </div>


              <div className="space-y-6">

                <SliderControl
                  label="New Account Coupon Cap"
                  value={
                    config.coupon_cap_new_account_inr
                  }
                  min={0}
                  max={500}
                  step={10}
                  onChange={(v) =>
                    updateConfig(
                      "coupon_cap_new_account_inr",
                      v
                    )
                  }
                  description="Maximum coupon value permitted for new accounts"
                  unit="₹"
                  color="#10b981"
                  prefix
                />


                <SliderControl
                  label="Medium Risk Coupon Cap"
                  value={
                    config.coupon_cap_medium_risk_inr
                  }
                  min={0}
                  max={500}
                  step={10}
                  onChange={(v) =>
                    updateConfig(
                      "coupon_cap_medium_risk_inr",
                      v
                    )
                  }
                  description="Maximum coupon value permitted for medium-risk orders"
                  unit="₹"
                  color="#06b6d4"
                  prefix
                />


                <SliderControl
                  label="OTP Challenge Limit"
                  value={
                    config.otp_max_challenges_per_window
                  }
                  min={1}
                  max={10}
                  onChange={(v) =>
                    updateConfig(
                      "otp_max_challenges_per_window",
                      v
                    )
                  }
                  description="Maximum OTP challenges allowed within the policy window"
                  unit=" attempts"
                  color="#6366f1"
                />

              </div>

            </div>

          )

        )}


        {/* ===================================================== */}
        {/* RULES */}
        {/* ===================================================== */}

        {tab === "rules" && (

          <div className="space-y-3">

            <div className="mb-5">

              <h2 className="text-sm font-semibold text-[#e2e8f0]">
                Active Policy Rules
              </h2>

              <p className="text-xs text-[#64748b] mt-1">
                These rules are derived from the live backend
                policy configuration.
              </p>

            </div>


            <RuleRow
              name="Autonomous order value limit"
              desc={`Orders above ₹${config.max_autonomous_order_value_inr.toLocaleString()} cannot be autonomously approved.`}
              impact="HIGH"
            />


            <RuleRow
              name="Ring association detection"
              desc={`Detected customer rings use a ${config.ring_node_threshold}-node policy threshold.`}
              impact="HIGH"
            />


            <RuleRow
              name="OTP challenge protection"
              desc={`Maximum ${config.otp_max_challenges_per_window} OTP challenges are allowed per policy window.`}
              impact="MEDIUM"
            />


            <RuleRow
              name="Medium-risk coupon restriction"
              desc={`Medium-risk orders are limited to ₹${config.coupon_cap_medium_risk_inr.toLocaleString()} coupon value.`}
              impact="MEDIUM"
            />


            <RuleRow
              name="New-account coupon restriction"
              desc={`New accounts are limited to ₹${config.coupon_cap_new_account_inr.toLocaleString()} coupon value.`}
              impact="HIGH"
            />


            <RuleRow
              name="Human review hold expiry"
              desc={`Held cases expire after ${config.hold_expiry_minutes} minutes.`}
              impact="LOW"
            />

          </div>

        )}


        {/* ===================================================== */}
        {/* COUPONS */}
        {/* ===================================================== */}

        {tab === "coupons" && (

          <div className="space-y-5">

            <div>

              <h2 className="text-sm font-semibold text-[#e2e8f0]">
                Coupon Controls
              </h2>

              <p className="text-xs text-[#64748b] mt-1">
                Edit live coupon limits and save them to the
                backend policy engine.
              </p>

            </div>


            <EditableCoupon
              title="New Account Coupon Cap"
              description="Maximum coupon value permitted for new accounts."
              value={
                config.coupon_cap_new_account_inr
              }
              color="#10b981"
              onChange={(value) =>
                updateConfig(
                  "coupon_cap_new_account_inr",
                  value
                )
              }
            />


            <EditableCoupon
              title="Medium Risk Coupon Cap"
              description="Maximum coupon value permitted for medium-risk orders."
              value={
                config.coupon_cap_medium_risk_inr
              }
              color="#06b6d4"
              onChange={(value) =>
                updateConfig(
                  "coupon_cap_medium_risk_inr",
                  value
                )
              }
            />


            <div className="rounded-xl border border-[rgba(99,102,241,0.15)] bg-[rgba(13,18,40,0.45)] p-4">

              <div className="flex items-center justify-between">

                <div>

                  <div className="text-sm font-medium text-[#e2e8f0]">
                    Current Coupon Policy
                  </div>

                  <div className="text-xs text-[#64748b] mt-1">
                    New accounts: ₹
                    {config.coupon_cap_new_account_inr.toLocaleString()}
                    {" · "}
                    Medium risk: ₹
                    {config.coupon_cap_medium_risk_inr.toLocaleString()}
                  </div>

                </div>


                <span className="badge-low text-[9px] font-bold px-2 py-1 rounded font-mono">
                  LIVE
                </span>

              </div>

            </div>

          </div>

        )}


        {/* ===================================================== */}
        {/* SIMULATION */}
        {/* ===================================================== */}

        {tab === "simulation" && (

          <div className="max-w-xl mx-auto space-y-5">

            <div>

              <h2 className="text-sm font-semibold text-[#e2e8f0]">
                Policy Simulation
              </h2>

              <p className="text-xs text-[#64748b] mt-1">
                Run the selected customer through the real
                TrustMesh risk and policy pipeline.
              </p>

            </div>


            <div>

              <label className="text-xs text-[#64748b]">
                Customer ID
              </label>

              <input
                value={simCustomer}
                onChange={(e) =>
                  setSimCustomer(e.target.value)
                }
                placeholder="ringA_customer_0"
                className="mt-2 w-full bg-[rgba(13,18,40,0.8)] border border-[rgba(99,102,241,0.2)] rounded-lg px-3 py-2 text-sm font-mono text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
              />

            </div>


            <div>

              <div className="flex justify-between text-sm mb-2">

                <span className="text-[#e2e8f0]">
                  Order Amount
                </span>

                <span className="font-mono font-bold text-[#6366f1]">
                  ₹{simAmount.toLocaleString()}
                </span>

              </div>


              <input
                type="range"
                min={1000}
                max={100000}
                step={500}
                value={simAmount}
                onChange={(e) =>
                  setSimAmount(
                    Number(e.target.value)
                  )
                }
                className="w-full accent-[#6366f1]"
              />

            </div>


            <button
              onClick={simulate}
              disabled={
                simLoading ||
                !simCustomer.trim()
              }
              className={`w-full btn-primary rounded-xl py-3 font-semibold ${
                simLoading
                  ? "opacity-60"
                  : ""
              }`}
            >

              {simLoading
                ? "Evaluating…"
                : "Run Backend Simulation"}

            </button>


            {simResult && (

              <div className="rounded-xl border border-[rgba(99,102,241,0.25)] bg-[rgba(99,102,241,0.06)] p-5 space-y-4">

                <ResultRow
                  label="Risk Score"
                  value={String(
                    simResult.risk_score
                  )}
                  highlight
                />

                <ResultRow
                  label="Risk Tier"
                  value={
                    simResult.risk_tier.toUpperCase()
                  }
                />


                <div className="border-t border-[rgba(99,102,241,0.1)] pt-4">

                  <div className="text-[10px] uppercase tracking-wider text-[#64748b] mb-1">
                    Decision
                  </div>

                  <div className="text-lg font-bold text-[#e2e8f0]">
                    {simResult.decision}
                  </div>

                </div>


                <ResultRow
                  label="Recommended Action"
                  value={
                    simResult.recommended_action
                  }
                />


                {simResult.reason_codes?.length > 0 && (

                  <div>

                    <div className="text-[10px] uppercase tracking-wider text-[#64748b] mb-2">
                      Reason Codes
                    </div>

                    <div className="flex flex-wrap gap-2">

                      {simResult.reason_codes.map(
                        (reason) => (

                          <span
                            key={reason}
                            className="text-[9px] px-2 py-1 rounded border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.08)] text-[#94a3b8]"
                          >
                            {reason}
                          </span>

                        )
                      )}

                    </div>

                  </div>

                )}


                <div className="text-[10px] text-[#64748b]">

                  Human approval:{" "}

                  <span className="text-[#e2e8f0] font-semibold">

                    {simResult.requires_human_approval
                      ? "Required"
                      : "Not required"}

                  </span>

                </div>

              </div>

            )}

          </div>

        )}


        {/* ===================================================== */}
        {/* VERSIONS */}
        {/* ===================================================== */}

        {tab === "versions" && (

          <div className="space-y-3">

            <div className="mb-5">

              <h2 className="text-sm font-semibold text-[#e2e8f0]">
                Policy Version History
              </h2>

              <p className="text-xs text-[#64748b] mt-1">
                Every saved policy configuration is stored in
                Neo4j and can be restored.
              </p>

            </div>


            {versionsLoading ? (

              <div className="py-16 text-center text-sm text-[#64748b]">
                Loading policy versions…
              </div>

            ) : versions.length === 0 ? (

              <div className="py-16 text-center">

                <div className="text-sm text-[#94a3b8]">
                  No saved versions yet.
                </div>

                <div className="text-xs text-[#64748b] mt-1">
                  Save the policy to create the first version.
                </div>

              </div>

            ) : (

              versions.map((version) => (

                <div
                  key={version.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${
                    version.active
                      ? "bg-[rgba(99,102,241,0.08)] border-[rgba(99,102,241,0.3)]"
                      : "bg-[rgba(13,18,40,0.5)] border-[rgba(99,102,241,0.1)]"
                  }`}
                >

                  <div className="font-mono text-[#6366f1] font-bold text-sm w-28">

                    {version.id}

                  </div>


                  <div className="flex-1">

                    <div className="text-xs text-[#e2e8f0]">

                      {version.changes}

                    </div>

                    <div className="text-[10px] text-[#64748b] mt-1">

                      {formatVersionDate(
                        version.created_at
                      )}

                    </div>

                  </div>


                  {version.active ? (

                    <span className="badge-low text-[9px] font-bold px-2 py-1 rounded font-mono">
                      ACTIVE
                    </span>

                  ) : (

                    <button
                      onClick={() =>
                        rollback(version.id)
                      }
                      disabled={
                        rollbackLoading !== null
                      }
                      className="btn-ghost rounded-lg px-3 py-1.5 text-xs"
                    >

                      {rollbackLoading ===
                      version.id
                        ? "Rolling back…"
                        : "Rollback"}

                    </button>

                  )}

                </div>

              ))

            )}

          </div>

        )}

      </div>

    </div>

  );
}


/* ============================================================= */
/* COMPONENTS */
/* ============================================================= */


function SliderControl({
  label,
  value,
  min,
  max,
  onChange,
  description,
  unit,
  color,
  step = 1,
  prefix = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  description: string;
  unit: string;
  color: string;
  step?: number;
  prefix?: boolean;
}) {

  return (

    <div>

      <div className="flex justify-between items-center mb-1">

        <div className="text-sm font-medium text-[#e2e8f0]">
          {label}
        </div>

        <div
          className="font-mono text-sm font-bold"
          style={{ color }}
        >
          {prefix ? unit : ""}
          {value.toLocaleString()}
          {!prefix ? unit : ""}
        </div>

      </div>


      <input
        type="range"
        min={min}
        max={max}
        value={value}
        step={step}
        onChange={(e) =>
          onChange(
            Number(e.target.value)
          )
        }
        className="w-full"
        style={{ accentColor: color }}
      />


      <div className="text-[10px] text-[#64748b] mt-0.5">
        {description}
      </div>

    </div>

  );
}


function RuleRow({
  name,
  desc,
  impact,
}: {
  name: string;
  desc: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
}) {

  return (

    <div className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(13,18,40,0.5)] border border-[rgba(99,102,241,0.1)]">

      <div className="w-2 h-2 rounded-full bg-[#10b981] shrink-0" />

      <div className="flex-1">

        <div className="flex items-center gap-2">

          <span className="text-sm font-medium text-[#e2e8f0]">
            {name}
          </span>

          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
              impact === "HIGH"
                ? "badge-high"
                : impact === "MEDIUM"
                ? "badge-medium"
                : "badge-low"
            }`}
          >
            {impact}
          </span>

        </div>

        <div className="text-xs text-[#64748b] mt-0.5">
          {desc}
        </div>

      </div>


      <span className="badge-low text-[9px] font-bold px-2 py-1 rounded font-mono">
        ACTIVE
      </span>

    </div>

  );
}


function EditableCoupon({
  title,
  description,
  value,
  color,
  onChange,
}: {
  title: string;
  description: string;
  value: number;
  color: string;
  onChange: (value: number) => void;
}) {

  return (

    <div className="p-4 rounded-xl bg-[rgba(13,18,40,0.5)] border border-[rgba(99,102,241,0.1)]">

      <div className="flex items-center justify-between gap-5">

        <div className="flex-1">

          <div className="text-sm font-medium text-[#e2e8f0]">
            {title}
          </div>

          <div className="text-xs text-[#64748b] mt-1">
            {description}
          </div>

        </div>


        <div className="flex items-center gap-3">

          <span
            className="font-mono font-bold"
            style={{ color }}
          >
            ₹
          </span>

          <input
            type="number"
            min={0}
            max={5000}
            step={10}
            value={value}
            onChange={(e) =>
              onChange(
                Math.max(
                  0,
                  Number(e.target.value)
                )
              )
            }
            className="w-28 bg-[rgba(13,18,40,0.8)] border border-[rgba(99,102,241,0.2)] rounded-lg px-3 py-2 text-sm font-mono text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
          />

        </div>

      </div>

    </div>

  );
}


function ResultRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {

  return (

    <div className="flex items-center justify-between">

      <span className="text-xs text-[#64748b]">
        {label}
      </span>

      <span
        className={`font-mono font-bold ${
          highlight
            ? "text-xl text-[#f59e0b]"
            : "text-sm text-[#e2e8f0]"
        }`}
      >
        {value}
      </span>

    </div>

  );
}


function formatVersionDate(
  value: string
) {

  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );

}