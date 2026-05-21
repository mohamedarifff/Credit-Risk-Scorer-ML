import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../api/client";
import LoanMatchCard from "../components/LoanMatchCard";
import { useAuth } from "../context/AuthContext";
import type { EligibilityResponse } from "../types";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "personal", label: "Personal" },
  { id: "home", label: "Home" },
  { id: "car", label: "Car" },
  { id: "business", label: "Business" },
  { id: "education", label: "Education" },
  { id: "other", label: "Other" },
] as const;

const OTHER_CATS = new Set(["gold", "credit_card"]);

export default function EligibilityPage() {
  const { token } = useAuth();
  const [data, setData] = useState<EligibilityResponse | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [showIneligible, setShowIneligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .getEligibility(token)
      .then(setData)
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 404
            ? "Save your financial profile first."
            : "Could not load eligibility."
        )
      )
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    if (!data) return { eligible: [], ineligible: [] };
    const matches = data.matches.filter((m) => {
      if (filter === "all") return true;
      if (filter === "other") return OTHER_CATS.has(m.category);
      return m.category === filter;
    });
    return {
      eligible: matches.filter((m) => m.eligible),
      ineligible: matches.filter((m) => !m.eligible),
    };
  }, [data, filter]);

  if (loading) return <p className="text-slate-500">Analyzing eligibility…</p>;

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

  if (!data) return null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Loan eligibility</h1>
          <p className="mt-1 text-sm text-slate-500">
            Default risk {Math.round(data.default_probability * 100)}% · {data.risk_level} tier ·{" "}
            {data.eligible_count} products match
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === f.id ? "bg-accent/20 text-accent" : "text-slate-500 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.eligible.map((m) => (
          <LoanMatchCard key={m.product_id} match={m} />
        ))}
      </div>

      {filtered.eligible.length === 0 && (
        <p className="text-sm text-slate-500">No eligible products in this category.</p>
      )}

      {filtered.ineligible.length > 0 && (
        <section className="mt-10">
          <button
            type="button"
            onClick={() => setShowIneligible(!showIneligible)}
            className="mb-4 text-sm font-medium text-slate-400 hover:text-white"
          >
            {showIneligible ? "▼" : "▶"} Not yet eligible ({filtered.ineligible.length})
          </button>
          {showIneligible && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.ineligible.map((m) => (
                <LoanMatchCard key={m.product_id} match={m} muted />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
