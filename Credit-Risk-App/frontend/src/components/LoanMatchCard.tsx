import type { LoanMatch } from "../types";

const likelihoodStyle = {
  High: "bg-success/15 text-success border-success/30",
  Medium: "bg-warn/15 text-warn border-warn/30",
  Low: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Ineligible: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const categoryLabel: Record<string, string> = {
  personal: "Personal",
  home: "Home",
  car: "Car",
  education: "Education",
  business: "Business",
  gold: "Gold",
  credit_card: "Credit card",
};

interface Props {
  match: LoanMatch;
  muted?: boolean;
}

export default function LoanMatchCard({ match, muted = false }: Props) {
  return (
    <article
      className={`rounded-xl border p-5 transition ${
        muted
          ? "border-white/5 bg-white/[0.02] opacity-75"
          : "border-white/10 bg-panel/80 hover:border-accent/30"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display font-semibold text-white">{match.product_name}</h3>
          <span className="mt-1 inline-block rounded-md bg-white/10 px-2 py-0.5 text-xs text-slate-400">
            {categoryLabel[match.category] ?? match.category}
          </span>
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            likelihoodStyle[match.approval_likelihood]
          }`}
        >
          {match.approval_likelihood}
        </span>
      </div>

      {match.eligible && (
        <>
          <p className="mt-4 font-display text-2xl font-bold text-accent">
            ₹{match.max_amount.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-slate-500">Max eligible amount</p>
          <p className="mt-2 text-sm text-slate-300">
            Est. EMI <span className="font-mono text-white">₹{match.est_monthly_emi.toLocaleString("en-IN")}</span>/mo
          </p>
        </>
      )}

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>Match score</span>
          <span>{match.match_score}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent2"
            style={{ width: `${match.match_score}%` }}
          />
        </div>
      </div>

      {match.blocking_factors.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {match.blocking_factors.slice(0, 2).map((f) => (
            <span
              key={f}
              className="rounded-md bg-warn/10 px-2 py-0.5 text-[10px] text-warn"
            >
              {f.length > 48 ? `${f.slice(0, 48)}…` : f}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
