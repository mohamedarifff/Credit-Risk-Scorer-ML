import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { FinancialProfile, ModelInfo } from "../types";

const emptyProfile: FinancialProfile = {
  age: 35,
  gender: "Male",
  marital_status: "Married",
  education: "Graduate",
  employment: "Salaried",
  employment_years: 0,
  annual_income: 0,
  avg_monthly_balance: 0,
  monthly_savings: 0,
  existing_investments: 0,
  num_existing_loans: 0,
  num_credit_cards: 0,
  debt_to_income_ratio: 0,
  late_payments_last_12m: 0,
  credit_history_years: 0,
  loan_amount: 0,
  loan_term_months: 36,
  interest_rate: 0,
  goals: [],
};

const ZERO_HINT_FIELDS = new Set([
  "annual_income",
  "num_existing_loans",
  "num_credit_cards",
  "avg_monthly_balance",
  "monthly_savings",
  "existing_investments",
  "late_payments_last_12m",
  "debt_to_income_ratio",
]);

const FORM_STEPS = ["About you", "Income & assets", "Debts & credit"];

function parseNum(raw: string): number {
  if (raw === "" || raw === "-") return 0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

function ZeroHint() {
  return (
    <p className="mt-1 text-xs text-slate-500">
      It&apos;s okay to enter 0 if this doesn&apos;t apply to you.
    </p>
  );
}

interface ProfileFormProps {
  embedded?: boolean;
  onComplete?: () => void;
}

export function ProfileForm({ embedded = false, onComplete }: ProfileFormProps) {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FinancialProfile>(emptyProfile);
  const [options, setOptions] = useState<ModelInfo["categorical_options"] | null>(null);
  const [completion, setCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.getProfile(token).catch(() => null),
      api.modelInfo(token),
    ])
      .then(([profile, info]) => {
        if (profile) {
          const { username: _, completion_pct, ...data } = profile;
          setForm({ ...data, goals: [] });
          setCompletion(completion_pct);
        }
        setOptions(info.categorical_options);
      })
      .catch(() => setError("Could not load profile"))
      .finally(() => setLoading(false));
  }, [token]);

  const update = <K extends keyof FinancialProfile>(key: K, value: FinancialProfile[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const numField = (
    key: keyof FinancialProfile,
    label: string,
    opts?: { step?: string; max?: number }
  ) => (
    <label className="block text-sm">
      <span className="text-slate-500">{label}</span>
      <input
        type="number"
        className="input-field mt-1"
        value={form[key] as number}
        min={0}
        max={opts?.max}
        step={opts?.step ?? "1"}
        onChange={(e) => update(key, parseNum(e.target.value) as FinancialProfile[typeof key])}
      />
      {ZERO_HINT_FIELDS.has(key) && <ZeroHint />}
    </label>
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = { ...form, goals: [] };
      const res = await api.saveProfile(token, payload);
      setCompletion(res.completion_pct);
      if (embedded && onComplete) {
        onComplete();
      } else {
        setMessage("Profile saved successfully.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading profile…</p>;

  return (
    <div className={embedded ? "" : ""}>
      {!embedded && (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Financial profile</h1>
            <p className="mt-1 text-sm text-slate-500">
              Complete your profile to unlock eligibility and opportunities.
            </p>
          </div>
          <div className="min-w-[140px]">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Completion</span>
              <span>{completion}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex gap-2">
        {FORM_STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i + 1)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              step === i + 1 ? "bg-accent/20 text-accent" : "text-slate-500 hover:text-white"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="glass-panel p-6">
        {step === 1 && options && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-500">Age</span>
              <input
                type="number"
                className="input-field mt-1"
                value={form.age}
                min={18}
                max={100}
                onChange={(e) => update("age", parseNum(e.target.value) || 18)}
              />
            </label>
            {(["gender", "marital_status", "education", "employment"] as const).map((key) => (
              <label key={key} className="block text-sm">
                <span className="capitalize text-slate-500">{key.replace("_", " ")}</span>
                <select
                  className="input-field mt-1"
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                >
                  {options[key].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            {numField("employment_years", "Employment years", { step: "0.1" })}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {numField("annual_income", "Annual income (₹)")}
            {numField("avg_monthly_balance", "Avg monthly balance (₹)")}
            {numField("monthly_savings", "Monthly savings (₹)")}
            {numField("existing_investments", "Existing investments (₹)")}
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {numField("num_existing_loans", "Existing loans")}
            {numField("num_credit_cards", "Credit cards")}
            {numField("debt_to_income_ratio", "Debt-to-income ratio", { step: "0.01", max: 5 })}
            {numField("late_payments_last_12m", "Late payments (12m)")}
            {numField("credit_history_years", "Credit history (years)", { step: "0.1" })}
            {numField("loan_amount", "Current loan amount (₹)")}
            <label className="block text-sm">
              <span className="text-slate-500">Loan term (months)</span>
              <input
                type="number"
                className="input-field mt-1"
                value={form.loan_term_months}
                min={1}
                onChange={(e) =>
                  update("loan_term_months", Math.max(1, parseNum(e.target.value) || 1))
                }
              />
            </label>
            {numField("interest_rate", "Interest rate (%)", { step: "0.1" })}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {step > 1 && (
            <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {step < 3 ? (
            <button type="button" className="btn-primary" onClick={() => setStep(step + 1)}>
              Next
            </button>
          ) : (
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : embedded ? "Save & continue" : "Save profile"}
            </button>
          )}
        </div>

        {message && <p className="mt-4 text-sm text-success">{message}</p>}
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {!embedded && completion >= 80 && (
          <p className="mt-4 text-sm text-slate-400">
            <Link to="/advisor" className="text-accent hover:underline">
              Open guided advisor →
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return <ProfileForm />;
}
