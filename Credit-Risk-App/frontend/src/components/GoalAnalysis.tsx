import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { EligibilityResponse, Opportunity } from "../types";

type Question = { key: string; text: string; options: string[] };

const QUESTIONS_BY_GOAL: Record<string, Question[]> = {
  education_loan: [
    { key: "study_location", text: "Are you planning to study in India or abroad?", options: ["India", "Abroad"] },
    {
      key: "co_applicant",
      text: "Do you have a co-applicant or guarantor?",
      options: ["Yes", "No"],
    },
  ],
  car_loan: [
    {
      key: "car_type",
      text: "Are you looking at a new car or a used one?",
      options: ["New", "Used"],
    },
  ],
  home_loan: [
    {
      key: "property_type",
      text: "Is this for buying a ready property, under-construction, or building on your own land?",
      options: ["Ready property", "Under construction", "Self-construction"],
    },
  ],
  business_loan: [
    {
      key: "business_registered",
      text: "Do you have an existing registered business?",
      options: ["Yes, registered", "No, just starting"],
    },
  ],
};

const NO_QUESTION_GOALS = new Set(["personal_loan", "gold_loan"]);

export interface AnalysisResult {
  eligibility: EligibilityResponse;
  opportunities: Opportunity[];
  clarifications: Record<string, string>;
}

interface Props {
  goalId: string;
  onComplete: (result: AnalysisResult) => void;
}

export default function GoalAnalysis({ goalId, onComplete }: Props) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"loading" | "questions" | "ready">("loading");

  const questions = useMemo(() => QUESTIONS_BY_GOAL[goalId] ?? [], [goalId]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    const qs = QUESTIONS_BY_GOAL[goalId] ?? [];
    Promise.all([api.getEligibility(token), api.getOpportunities(token)])
      .then(([elig, opp]) => {
        if (cancelled) return;
        setEligibility(elig);
        setOpportunities(opp.opportunities);
        if (NO_QUESTION_GOALS.has(goalId) || qs.length === 0) {
          onComplete({
            eligibility: elig,
            opportunities: opp.opportunities,
            clarifications: {},
          });
        } else {
          setPhase("questions");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Something went wrong. Please check your profile and try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, goalId]);

  const currentQ = questions[questionIndex];

  const pickAnswer = (value: string) => {
    if (!currentQ) return;
    const next = { ...answers, [currentQ.key]: value };
    setAnswers(next);
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex(questionIndex + 1);
    } else {
      setPhase("ready");
    }
  };

  const finish = () => {
    if (!eligibility) return;
    onComplete({ eligibility, opportunities, clarifications: answers });
  };

  if (loading || phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="mt-4 text-slate-400">Analysing your profile…</p>
      </div>
    );
  }

  if (error) {
    return <p className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{error}</p>;
  }

  if (phase === "questions" && currentQ) {
    return (
      <div>
        <h2 className="font-display text-xl font-semibold">A few quick questions</h2>
        <p className="mt-1 text-sm text-slate-500">
          Question {questionIndex + 1} of {questions.length}
        </p>
        <p className="mt-6 text-lg text-white">{currentQ.text}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {currentQ.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => pickAnswer(opt)}
              className="rounded-xl border border-white/15 bg-panel px-6 py-3 text-left text-sm font-medium transition hover:border-accent hover:bg-accent/10"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div>
        <h2 className="font-display text-xl font-semibold">Analysis complete</h2>
        <p className="mt-2 text-sm text-slate-500">We have enough detail to show your best options.</p>
        <button type="button" className="btn-primary mt-8" onClick={finish}>
          See My Options
        </button>
      </div>
    );
  }

  return null;
}
