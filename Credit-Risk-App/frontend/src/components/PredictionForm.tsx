import { FormEvent, useState } from "react";
import type { ModelInfo, PredictionInput } from "../types";

const defaults: PredictionInput = {
  age: 35,
  gender: "Male",
  marital_status: "Married",
  education: "Graduate",
  employment: "Salaried",
  annual_income: 600000,
  loan_amount: 250000,
  loan_term_months: 36,
  interest_rate: 12,
  credit_history_years: 5,
  num_existing_loans: 1,
  num_credit_cards: 2,
  avg_monthly_balance: 50000,
  late_payments_last_12m: 0,
  debt_to_income_ratio: 0.35,
};

interface Props {
  options: ModelInfo["categorical_options"];
  onSubmit: (data: PredictionInput) => void;
  loading: boolean;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function PredictionForm({ options, onSubmit, loading }: Props) {
  const [form, setForm] = useState<PredictionInput>(defaults);

  const update = <K extends keyof PredictionInput>(key: K, value: PredictionInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section>
        <h3 className="mb-4 font-display text-sm font-semibold text-accent">Applicant</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Age">
            <input
              type="number"
              className="input-field"
              value={form.age}
              min={18}
              max={100}
              onChange={(e) => update("age", Number(e.target.value))}
            />
          </Field>
          <Field label="Gender">
            <select
              className="input-field"
              value={form.gender}
              onChange={(e) => update("gender", e.target.value)}
            >
              {options.gender.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Marital status">
            <select
              className="input-field"
              value={form.marital_status}
              onChange={(e) => update("marital_status", e.target.value)}
            >
              {options.marital_status.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Education">
            <select
              className="input-field"
              value={form.education}
              onChange={(e) => update("education", e.target.value)}
            >
              {options.education.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Employment">
            <select
              className="input-field"
              value={form.employment}
              onChange={(e) => update("employment", e.target.value)}
            >
              {options.employment.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Annual income">
            <input
              type="number"
              className="input-field"
              value={form.annual_income}
              min={0}
              onChange={(e) => update("annual_income", Number(e.target.value))}
            />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="mb-4 font-display text-sm font-semibold text-accent2">Loan & credit</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Loan amount">
            <input
              type="number"
              className="input-field"
              value={form.loan_amount}
              min={0}
              onChange={(e) => update("loan_amount", Number(e.target.value))}
            />
          </Field>
          <Field label="Term (months)">
            <input
              type="number"
              className="input-field"
              value={form.loan_term_months}
              min={1}
              onChange={(e) => update("loan_term_months", Number(e.target.value))}
            />
          </Field>
          <Field label="Interest rate (%)">
            <input
              type="number"
              step="0.1"
              className="input-field"
              value={form.interest_rate}
              min={0}
              onChange={(e) => update("interest_rate", Number(e.target.value))}
            />
          </Field>
          <Field label="Credit history (years)">
            <input
              type="number"
              step="0.1"
              className="input-field"
              value={form.credit_history_years}
              min={0}
              onChange={(e) => update("credit_history_years", Number(e.target.value))}
            />
          </Field>
          <Field label="Existing loans">
            <input
              type="number"
              className="input-field"
              value={form.num_existing_loans}
              min={0}
              onChange={(e) => update("num_existing_loans", Number(e.target.value))}
            />
          </Field>
          <Field label="Credit cards">
            <input
              type="number"
              className="input-field"
              value={form.num_credit_cards}
              min={0}
              onChange={(e) => update("num_credit_cards", Number(e.target.value))}
            />
          </Field>
          <Field label="Avg monthly balance">
            <input
              type="number"
              className="input-field"
              value={form.avg_monthly_balance}
              min={0}
              onChange={(e) => update("avg_monthly_balance", Number(e.target.value))}
            />
          </Field>
          <Field label="Late payments (12m)">
            <input
              type="number"
              className="input-field"
              value={form.late_payments_last_12m}
              min={0}
              onChange={(e) => update("late_payments_last_12m", Number(e.target.value))}
            />
          </Field>
          <Field label="Debt-to-income ratio">
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={form.debt_to_income_ratio}
              min={0}
              max={5}
              onChange={(e) => update("debt_to_income_ratio", Number(e.target.value))}
            />
          </Field>
        </div>
      </section>

      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={loading}>
        {loading ? "Analyzing…" : "Run risk assessment"}
      </button>
    </form>
  );
}
