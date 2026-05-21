import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../api/client";
import LoanMatchCard from "../components/LoanMatchCard";
import { useAuth } from "../context/AuthContext";
import type { EligibilityResponse, ScenarioDelta } from "../types";

type Sliders = {
  annual_income: number;
  debt_to_income_ratio: number;
  late_payments_last_12m: number;
  num_existing_loans: number;
  avg_monthly_balance: number;
};

export default function SimulatorPage() {
  const { token } = useAuth();
  const [baseline, setBaseline] = useState<EligibilityResponse | null>(null);
  const [scenario, setScenario] = useState<EligibilityResponse | null>(null);
  const [sliders, setSliders] = useState<Sliders | null>(null);
  const [diff, setDiff] = useState({ count: 0, amount: 0 });
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!token) return;
    api
      .getEligibility(token)
      .then((res) => {
        setBaseline(res);
        setScenario(res);
        return api.getProfile(token);
      })
      .then((profile) => {
        setSliders({
          annual_income: profile.annual_income,
          debt_to_income_ratio: profile.debt_to_income_ratio,
          late_payments_last_12m: profile.late_payments_last_12m,
          num_existing_loans: profile.num_existing_loans,
          avg_monthly_balance: profile.avg_monthly_balance,
        });
      })
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 404
            ? "Save your financial profile first."
            : "Could not load simulator."
        )
      )
      .finally(() => setLoading(false));
  }, [token]);

  const runScenario = useCallback(
    (values: Sliders) => {
      if (!token || !baseline) return;
      setSimulating(true);
      const delta: ScenarioDelta = {
        annual_income: values.annual_income,
        debt_to_income_ratio: values.debt_to_income_ratio,
        late_payments_last_12m: values.late_payments_last_12m,
        num_existing_loans: values.num_existing_loans,
        avg_monthly_balance: values.avg_monthly_balance,
      };
      api
        .runScenario(token, delta)
        .then((res) => {
          setScenario(res.scenario);
          setDiff({
            count: res.additional_eligible_count,
            amount: res.additional_max_amount_total,
          });
        })
        .finally(() => setSimulating(false));
    },
    [token, baseline]
  );

  const updateSlider = (key: keyof Sliders, value: number) => {
    if (!sliders) return;
    const next = { ...sliders, [key]: value };
    setSliders(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runScenario(next), 400);
  };

  if (loading) return <p className="text-slate-500">Loading simulator…</p>;

  if (error) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-slate-400">{error}</p>
        <Link to="/profile" className="btn-primary mt-4 inline-block">
          Complete profile
        </Link>
      </div>
    );
  }

  if (!sliders || !scenario || !baseline) return null;

  const eligible = scenario.matches.filter((m) => m.eligible);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">What-if simulator</h1>
      <p className="mt-1 text-sm text-slate-500">
        Adjust key variables and see eligibility update in real time (not saved to profile).
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="glass-panel space-y-6 p-6 lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Adjust variables
          </h2>
          {(
            [
              ["annual_income", "Annual income (₹)", 100000, 5000000, 50000],
              ["debt_to_income_ratio", "DTI ratio", 0, 1.2, 0.01],
              ["late_payments_last_12m", "Late payments (12m)", 0, 12, 1],
              ["num_existing_loans", "Existing loans", 0, 10, 1],
              ["avg_monthly_balance", "Avg monthly balance (₹)", 0, 500000, 5000],
            ] as const
          ).map(([key, label, min, max, step]) => (
            <label key={key} className="block text-sm">
              <span className="flex justify-between text-slate-400">
                <span>{label}</span>
                <span className="font-mono text-white">
                  {key === "debt_to_income_ratio"
                    ? sliders[key].toFixed(2)
                    : sliders[key].toLocaleString("en-IN")}
                </span>
              </span>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={sliders[key]}
                onChange={(e) => updateSlider(key, Number(e.target.value))}
                className="mt-2 w-full accent-accent"
              />
            </label>
          ))}
          {simulating && <p className="text-xs text-slate-500">Recalculating…</p>}
        </div>

        <div className="lg:col-span-2">
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-500">vs current profile</p>
              <p className="mt-1 font-display text-xl font-bold text-accent">
                +{diff.count} loans
              </p>
              <p className="text-sm text-slate-400">newly eligible</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-500">Additional max amount</p>
              <p className="mt-1 font-display text-xl font-bold text-accent2">
                ₹{diff.amount.toLocaleString("en-IN")}
              </p>
              <p className="text-sm text-slate-400">total across products</p>
            </div>
          </div>

          <p className="mb-3 text-sm text-slate-500">
            Scenario risk {Math.round(scenario.default_probability * 100)}% (baseline{" "}
            {Math.round(baseline.default_probability * 100)}%)
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {eligible.map((m) => (
              <LoanMatchCard key={m.product_id} match={m} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
