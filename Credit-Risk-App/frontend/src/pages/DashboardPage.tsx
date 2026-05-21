import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PredictionForm from "../components/PredictionForm";
import RiskResult from "../components/RiskResult";
import type { ModelInfo, PredictionInput, PredictionResult } from "../types";

export default function DashboardPage() {
  const { token } = useAuth();
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api.modelInfo(token).then(setModelInfo).catch(() => setError("Could not load model options"));
  }, [token]);

  const handlePredict = async (data: PredictionInput) => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.predict(token, data);
      setResult(res);
    } catch {
      setError("Prediction failed. Check your inputs and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div className="glass-panel p-6">
          <h2 className="font-display text-xl font-semibold">New assessment</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter applicant and loan details for a default risk score.
          </p>
          {modelInfo ? (
            <div className="mt-6">
              <PredictionForm
                options={modelInfo.categorical_options}
                onSubmit={handlePredict}
                loading={loading}
              />
            </div>
          ) : (
            <p className="mt-6 text-slate-500">Loading form…</p>
          )}
          {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        </div>
      </div>

      <div className="space-y-6 lg:col-span-2">
        {result ? (
          <RiskResult result={result} />
        ) : (
          <div className="glass-panel flex min-h-[280px] flex-col items-center justify-center p-6 text-center">
            <p className="font-display text-lg text-slate-400">No assessment yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Submit the form to see risk level and probability.
            </p>
          </div>
        )}

        {modelInfo && (
          <div className="glass-panel p-5 text-sm">
            <p className="font-medium text-slate-300">Model performance (holdout)</p>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              {Object.entries(modelInfo.metrics).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase text-slate-500">{k.replace(/_/g, " ")}</dt>
                  <dd className="font-mono text-accent">{(v * 100).toFixed(1)}%</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-slate-500">
              {modelInfo.model_type} · trained{" "}
              {new Date(modelInfo.trained_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
