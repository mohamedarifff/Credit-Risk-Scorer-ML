import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { PredictionRecord } from "../types";

const riskBadge: Record<string, string> = {
  Low: "bg-success/15 text-success",
  Medium: "bg-warn/15 text-warn",
  High: "bg-danger/15 text-danger",
};

export default function HistoryPage() {
  const { token } = useAuth();
  const [records, setRecords] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .history(token)
      .then(setRecords)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <p className="text-slate-500">Loading history…</p>;
  }

  if (records.length === 0) {
    return (
      <div className="glass-panel p-12 text-center">
        <p className="font-display text-lg text-slate-400">No predictions yet</p>
        <p className="mt-2 text-sm text-slate-500">
          Run an assessment from the Assess tab to build your history.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden">
      <div className="border-b border-white/10 px-6 py-4">
        <h2 className="font-display text-xl font-semibold">Prediction history</h2>
        <p className="text-sm text-slate-500">{records.length} recent assessments</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Risk</th>
              <th className="px-6 py-3">Probability</th>
              <th className="px-6 py-3">Income</th>
              <th className="px-6 py-3">Loan</th>
              <th className="px-6 py-3">DTI</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-6 py-4 text-slate-400">
                  {new Date(r.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      riskBadge[r.risk_level] ?? ""
                    }`}
                  >
                    {r.risk_level}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono">
                  {(r.default_probability * 100).toFixed(1)}%
                </td>
                <td className="px-6 py-4">
                  {r.inputs.annual_income.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  {r.inputs.loan_amount.toLocaleString()}
                </td>
                <td className="px-6 py-4">{r.inputs.debt_to_income_ratio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
