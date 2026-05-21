import { useState } from "react";

export const GOAL_CARDS = [
  { id: "car_loan", icon: "🚗", label: "Buy a Car", description: "Purchase a new or used vehicle" },
  {
    id: "education_loan",
    icon: "🎓",
    label: "Study / Education",
    description: "Fund a degree, diploma, or course abroad or in India",
  },
  {
    id: "home_loan",
    icon: "🏠",
    label: "Build / Buy a Home",
    description: "Buy, build, or renovate a house",
  },
  {
    id: "personal_loan",
    icon: "💼",
    label: "Personal Need",
    description: "Medical, wedding, travel, or any personal expense",
  },
  {
    id: "business_loan",
    icon: "📈",
    label: "Start / Grow Business",
    description: "Fund a business, shop, or freelance venture",
  },
  {
    id: "gold_loan",
    icon: "✨",
    label: "Gold Loan",
    description: "Borrow against existing gold",
  },
] as const;

interface Props {
  onComplete: (goalId: string) => void;
}

export default function GoalPicker({ onComplete }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <h2 className="font-display text-xl font-semibold">What is your primary goal?</h2>
      <p className="mt-1 text-sm text-slate-500">Choose one option to personalise your recommendations.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GOAL_CARDS.map((g) => {
          const active = selected === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelected(g.id)}
              className={`rounded-xl border p-5 text-left transition ${
                active
                  ? "border-accent bg-accent/10 ring-2 ring-accent/40"
                  : "border-white/10 bg-panel/60 hover:border-white/25"
              }`}
            >
              <span className="text-3xl">{g.icon}</span>
              <p className="mt-3 font-display font-semibold text-white">{g.label}</p>
              <p className="mt-1 text-sm text-slate-400">{g.description}</p>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-8">
          <button type="button" className="btn-primary" onClick={() => onComplete(selected)}>
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
