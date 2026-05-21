import { useNavigate } from "react-router-dom";
import type { AnalysisResult } from "./GoalAnalysis";
import type { LoanMatch } from "../types";
import { GOAL_CARDS } from "./GoalPicker";

const LIKELIHOOD_ORDER = { High: 0, Medium: 1, Low: 2, Ineligible: 3 };

const LIKELIHOOD_STYLE = {
  High: "bg-success/15 text-success border-success/30",
  Medium: "bg-warn/15 text-warn border-warn/30",
  Low: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Ineligible: "bg-danger/15 text-danger border-danger/30",
};

const GOAL_TO_PRODUCTS: Record<string, string[]> = {
  car_loan: ["car_loan", "two_wheeler_loan"],
  education_loan: ["education_loan"],
  home_loan: ["home_loan"],
  personal_loan: ["personal_loan", "salary_advance", "topup_loan"],
  business_loan: ["business_loan"],
  gold_loan: ["gold_loan"],
};

function readinessBadge(prob: number) {
  if (prob < 0.3) {
    return { label: "Strong Profile — High approval chance", className: "bg-success/15 text-success" };
  }
  if (prob < 0.55) {
    return { label: "Fair Profile — Moderate approval chance", className: "bg-warn/15 text-warn" };
  }
  return { label: "Needs Improvement — Low approval chance", className: "bg-danger/15 text-danger" };
}

function contextNote(goalId: string, clarifications: Record<string, string>): string | null {
  if (goalId === "education_loan") {
    if (clarifications.study_location === "Abroad") {
      return "Education loans for overseas studies typically require a co-applicant. Consider adding one to improve approval.";
    }
    if (clarifications.co_applicant === "No") {
      return "A co-applicant or guarantor can significantly improve education loan approval chances in India as well.";
    }
  }
  if (goalId === "car_loan" && clarifications.car_type === "Used") {
    return "Used car loans usually have a slightly higher interest rate than new car loans.";
  }
  if (goalId === "home_loan" && clarifications.property_type === "Under construction") {
    return "Under-construction home loans often follow a staged disbursement linked to construction progress.";
  }
  if (goalId === "business_loan" && clarifications.business_registered === "No, just starting") {
    return "Without a registered business, a personal loan may serve you better than a business loan right now.";
  }
  return null;
}

function RecommendationCard({ match }: { match: LoanMatch }) {
  return (
    <article className="rounded-xl border border-white/10 bg-panel/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">{match.product_name}</h3>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            LIKELIHOOD_STYLE[match.approval_likelihood]
          }`}
        >
          {match.approval_likelihood}
        </span>
      </div>

      {match.max_amount > 0 && (
        <>
          <p className="mt-4 font-display text-2xl font-bold text-accent">
            ₹{match.max_amount.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-slate-500">Max loan amount</p>
          <p className="mt-2 text-sm text-slate-300">
            Est. monthly EMI:{" "}
            <span className="font-mono text-white">
              ₹{match.est_monthly_emi.toLocaleString("en-IN")}
            </span>
          </p>
        </>
      )}

      {match.approval_likelihood === "Ineligible" && match.blocking_factors.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-300">Why you don&apos;t qualify yet</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-400">
            {match.blocking_factors.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {(match.approval_likelihood === "Low" || match.approval_likelihood === "Medium") &&
        match.required_improvements.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-300">How to improve your chances</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-400">
              {match.required_improvements.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}
    </article>
  );
}

interface Props {
  goalId: string;
  analysis: AnalysisResult;
  onStartOver: () => void;
}

export default function Recommendation({ goalId, analysis, onStartOver }: Props) {
  const navigate = useNavigate();
  const { eligibility, clarifications } = analysis;
  const badge = readinessBadge(eligibility.default_probability);
  const goalLabel = GOAL_CARDS.find((g) => g.id === goalId)?.label ?? "your goal";

  const productIds = GOAL_TO_PRODUCTS[goalId] ?? [goalId];
  const filtered = eligibility.matches
    .filter((m) => productIds.includes(m.product_id))
    .sort(
      (a, b) =>
        LIKELIHOOD_ORDER[a.approval_likelihood] - LIKELIHOOD_ORDER[b.approval_likelihood]
    );

  const note = contextNote(goalId, clarifications);

  return (
    <div>
      <h2 className="font-display text-xl font-semibold">Your recommendation</h2>
      <p className="mt-1 text-sm text-slate-500">Options for: {goalLabel}</p>

      <section className="mt-8">
        <p className="text-sm text-slate-500">Your credit readiness</p>
        <span className={`mt-2 inline-block rounded-full px-4 py-2 text-sm font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </section>

      <section className="mt-10">
        <h3 className="font-display text-lg font-semibold">Best options for you</h3>
        {filtered.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No matching products found for this goal.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {filtered.map((m) => (
              <RecommendationCard key={m.product_id} match={m} />
            ))}
          </div>
        )}
      </section>

      {note && Object.keys(clarifications).length > 0 && (
        <section className="mt-8 rounded-xl border border-accent/20 bg-accent/5 p-4">
          <p className="text-sm text-slate-300">{note}</p>
        </section>
      )}

      <section className="mt-10 flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={() => navigate("/simulator")}>
          Simulate Changes
        </button>
        <button type="button" className="btn-ghost" onClick={onStartOver}>
          Start Over
        </button>
      </section>
    </div>
  );
}
