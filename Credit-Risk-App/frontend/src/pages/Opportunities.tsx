import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Opportunity } from "../types";

export default function OpportunitiesPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .getOpportunities(token)
      .then((res) => setItems(res.opportunities))
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 404
            ? "Save your financial profile first."
            : "Could not load opportunities."
        )
      )
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="text-slate-500">Building your roadmap…</p>;

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

  if (items.length === 0) {
    return (
      <div className="glass-panel p-8 text-center">
        <h1 className="font-display text-xl font-semibold">Opportunity roadmap</h1>
        <p className="mt-2 text-slate-500">
          You qualify for most products — no major gaps to address.
        </p>
        <Link to="/eligibility" className="mt-4 inline-block text-accent hover:underline">
          View eligibility →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Opportunity roadmap</h1>
      <p className="mt-1 text-sm text-slate-500">
        Actions to unlock loans you are not yet eligible for, sorted by shortest timeline.
      </p>

      <div className="relative mt-10 space-y-8 border-l border-accent/30 pl-8">
        {items.map((opp, index) => (
          <article key={opp.product_id} className="relative glass-panel p-6">
            <span className="absolute -left-[2.35rem] flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-surface">
              {index + 1}
            </span>
            <h2 className="font-display text-lg font-semibold">{opp.product_name}</h2>
            <p className="mt-2 text-sm text-warn">{opp.current_gap}</p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-300">
              {opp.action_steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
              <span>~{opp.estimated_months} months</span>
              <span className="text-accent">
                Unlocks ~₹{opp.unlocks_amount.toLocaleString("en-IN")}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
