import type { PredictionResult } from "../types";

const riskStyles = {
  Low: { ring: "ring-success/40", text: "text-success", bg: "bg-success/10" },
  Medium: { ring: "ring-warn/40", text: "text-warn", bg: "bg-warn/10" },
  High: { ring: "ring-danger/40", text: "text-danger", bg: "bg-danger/10" },
};

export default function RiskResult({ result }: { result: PredictionResult }) {
  const style = riskStyles[result.risk_level];
  const pct = Math.round(result.default_probability * 100);

  return (
    <div className={`glass-panel p-6 ring-2 ${style.ring}`}>
      <p className="text-sm uppercase tracking-wider text-slate-400">Assessment result</p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`font-display text-4xl font-bold ${style.text}`}>
            {result.risk_level} Risk
          </p>
          <p className="mt-1 text-slate-400">Default probability</p>
        </div>
        <p className={`rounded-2xl px-5 py-3 text-3xl font-bold ${style.bg} ${style.text}`}>
          {pct}%
        </p>
      </div>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            result.risk_level === "Low"
              ? "bg-success"
              : result.risk_level === "Medium"
                ? "bg-warn"
                : "bg-danger"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {result.top_factors.length > 0 && (
        <div className="mt-6">
          <p className="mb-1 text-sm font-medium text-slate-300">Why this applicant</p>
          <p className="mb-3 text-xs text-slate-500">
            Top drivers for this profile (SHAP — changes if you change inputs)
          </p>
          <ul className="space-y-3">
            {result.top_factors.map((f) => (
              <li
                key={f.feature}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-200">{f.feature}</span>
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      f.direction === "up" ? "text-danger" : "text-success"
                    }`}
                  >
                    {f.direction === "up" ? "↑ raises risk" : "↓ lowers risk"}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${
                      f.direction === "up" ? "bg-danger/80" : "bg-success/80"
                    }`}
                    style={{ width: `${Math.round(f.importance * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
