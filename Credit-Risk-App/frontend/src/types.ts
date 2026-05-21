export interface PredictionInput {
  age: number;
  gender: string;
  marital_status: string;
  education: string;
  employment: string;
  annual_income: number;
  loan_amount: number;
  loan_term_months: number;
  interest_rate: number;
  credit_history_years: number;
  num_existing_loans: number;
  num_credit_cards: number;
  avg_monthly_balance: number;
  late_payments_last_12m: number;
  debt_to_income_ratio: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  direction: "up" | "down";
}

export interface PredictionResult {
  risk_level: "Low" | "Medium" | "High";
  default_probability: number;
  top_factors: FeatureImportance[];
}

export interface PredictionRecord {
  id: string;
  timestamp: string;
  risk_level: string;
  default_probability: number;
  inputs: PredictionInput;
}

export interface ModelInfo {
  model_type: string;
  trained_at: string;
  metrics: Record<string, number>;
  feature_names: string[];
  categorical_options: Record<string, string[]>;
}

export interface User {
  username: string;
  email: string;
}

export interface FinancialProfile extends PredictionInput {
  goals: string[];
  monthly_savings: number;
  existing_investments: number;
  employment_years: number;
}

export interface FinancialProfileResponse extends FinancialProfile {
  username: string;
  completion_pct: number;
}

export interface LoanMatch {
  product_id: string;
  product_name: string;
  category: string;
  match_score: number;
  approval_likelihood: "High" | "Medium" | "Low" | "Ineligible";
  max_amount: number;
  est_monthly_emi: number;
  eligible: boolean;
  blocking_factors: string[];
  required_improvements: string[];
}

export interface EligibilityResponse {
  default_probability: number;
  risk_level: "Low" | "Medium" | "High";
  matches: LoanMatch[];
  eligible_count: number;
  ineligible_count: number;
}

export interface ScenarioDelta {
  annual_income?: number;
  debt_to_income_ratio?: number;
  late_payments_last_12m?: number;
  num_existing_loans?: number;
  avg_monthly_balance?: number;
  monthly_savings?: number;
  employment_years?: number;
  existing_investments?: number;
}

export interface ScenarioResponse {
  baseline: EligibilityResponse;
  scenario: EligibilityResponse;
  additional_eligible_count: number;
  additional_max_amount_total: number;
}

export interface Opportunity {
  product_id: string;
  product_name: string;
  current_gap: string;
  action_steps: string[];
  estimated_months: number;
  unlocks_amount: number;
}

export const GOAL_OPTIONS = [
  { id: "personal_loan", label: "Personal loan" },
  { id: "home_loan", label: "Home loan" },
  { id: "car_loan", label: "Car / vehicle" },
  { id: "education_loan", label: "Education" },
  { id: "business_loan", label: "Business" },
  { id: "gold_loan", label: "Gold loan" },
  { id: "credit_card", label: "Credit card upgrade" },
] as const;
