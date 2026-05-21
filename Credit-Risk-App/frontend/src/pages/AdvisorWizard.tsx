import { useCallback, useState } from "react";
import GoalAnalysis, { type AnalysisResult } from "../components/GoalAnalysis";
import GoalPicker, { GOAL_CARDS } from "../components/GoalPicker";
import Recommendation from "../components/Recommendation";
import { ProfileForm } from "./Profile";

const WIZARD_STEPS = [
  { id: 1, label: "Build Profile" },
  { id: 2, label: "State Your Goal" },
  { id: 3, label: "Analyse & Clarify" },
  { id: 4, label: "Recommendation" },
] as const;

export default function AdvisorWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
  });

  const toggleCollapsed = (step: number) => {
    setCollapsed((prev) => ({ ...prev, [step]: !prev[step] }));
  };

  const handleProfileComplete = useCallback(() => {
    setCurrentStep(2);
  }, []);

  const handleGoalComplete = useCallback((id: string) => {
    setGoalId(id);
    setCurrentStep(3);
  }, []);

  const handleAnalysisComplete = useCallback((result: AnalysisResult) => {
    setAnalysis(result);
    setCurrentStep(4);
  }, []);

  const handleStartOver = useCallback(() => {
    setCurrentStep(1);
    setGoalId(null);
    setAnalysis(null);
    setCollapsed({ 1: false, 2: false, 3: false, 4: false });
  }, []);

  const goalLabel = GOAL_CARDS.find((g) => g.id === goalId)?.label;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Guided financial advisor</h1>
        <p className="mt-1 text-sm text-slate-500">
          Complete each step in order — we&apos;ll tailor loan options to your goal.
        </p>
      </div>

      <ol className="mb-8 flex flex-wrap gap-2">
        {WIZARD_STEPS.map((s) => {
          const done = currentStep > s.id;
          const active = currentStep === s.id;
          return (
            <li
              key={s.id}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                active
                  ? "bg-accent/20 text-accent"
                  : done
                    ? "bg-white/10 text-white"
                    : "text-slate-600"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  done ? "bg-accent text-surface" : active ? "bg-accent/30" : "bg-white/10"
                }`}
              >
                {done ? "✓" : s.id}
              </span>
              {s.label}
            </li>
          );
        })}
      </ol>

      {currentStep > 1 && (
        <CompletedStep
          title="Step 1 — Build Profile"
          open={!collapsed[1]}
          onToggle={() => toggleCollapsed(1)}
          summary="Profile saved"
        />
      )}

      {currentStep > 2 && goalLabel && (
        <CompletedStep
          title="Step 2 — State Your Goal"
          open={!collapsed[2]}
          onToggle={() => toggleCollapsed(2)}
          summary={goalLabel}
        />
      )}

      {currentStep > 3 && goalLabel && (
        <CompletedStep
          title="Step 3 — Analyse & Clarify"
          open={!collapsed[3]}
          onToggle={() => toggleCollapsed(3)}
          summary="Analysis complete"
        />
      )}

      <div className="mt-6">
        {currentStep === 1 && (
          <ProfileForm embedded onComplete={handleProfileComplete} />
        )}
        {currentStep === 2 && <GoalPicker onComplete={handleGoalComplete} />}
        {currentStep === 3 && goalId && (
          <GoalAnalysis goalId={goalId} onComplete={handleAnalysisComplete} />
        )}
        {currentStep === 4 && goalId && analysis && (
          <Recommendation
            goalId={goalId}
            analysis={analysis}
            onStartOver={handleStartOver}
          />
        )}
      </div>
    </div>
  );
}

function CompletedStep({
  title,
  summary,
  open,
  onToggle,
}: {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"
      >
        <span className="font-medium text-slate-300">{title}</span>
        <span className="text-slate-500">{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div className="border-t border-white/10 px-4 py-3 text-sm text-slate-400">{summary}</div>
      )}
    </div>
  );
}
