import type {
  EligibilityResponse,
  FinancialProfile,
  FinancialProfileResponse,
  ModelInfo,
  Opportunity,
  PredictionInput,
  PredictionRecord,
  PredictionResult,
  ScenarioDelta,
  ScenarioResponse,
  User,
} from "../types";

const API_BASE = "/api";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d.msg).join(", ")
          : "Request failed";
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export const api = {
  register: (body: { username: string; email: string; password: string }) =>
    request<User>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { username: string; password: string }) =>
    request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  me: (token: string) => request<User>("/auth/me", {}, token),

  modelInfo: (token: string) => request<ModelInfo>("/model/info", {}, token),

  predict: (token: string, body: PredictionInput) =>
    request<PredictionResult>("/predictions", {
      method: "POST",
      body: JSON.stringify(body),
    }, token),

  history: (token: string) =>
    request<PredictionRecord[]>("/predictions/history", {}, token),

  saveProfile: (token: string, data: FinancialProfile) =>
    request<FinancialProfileResponse>("/profile", {
      method: "POST",
      body: JSON.stringify(data),
    }, token),

  getProfile: (token: string) =>
    request<FinancialProfileResponse>("/profile", {}, token),

  getEligibility: (token: string) =>
    request<EligibilityResponse>("/eligibility", {}, token),

  getOpportunities: (token: string) =>
    request<{ opportunities: Opportunity[] }>("/opportunities", {}, token),

  runScenario: (token: string, delta: ScenarioDelta) =>
    request<ScenarioResponse>("/scenarios", {
      method: "POST",
      body: JSON.stringify(delta),
    }, token),
};

export { ApiError };
