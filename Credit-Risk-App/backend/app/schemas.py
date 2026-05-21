from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    username: str
    email: str


class PredictionInput(BaseModel):
    age: int = Field(ge=18, le=100)
    gender: str
    marital_status: str
    education: str
    employment: str
    annual_income: float = Field(ge=0)
    loan_amount: float = Field(ge=0)
    loan_term_months: int = Field(ge=1, le=600)
    interest_rate: float = Field(ge=0, le=50)
    credit_history_years: float = Field(ge=0, le=50)
    num_existing_loans: int = Field(ge=0, le=20)
    num_credit_cards: int = Field(ge=0, le=20)
    avg_monthly_balance: float = Field(ge=0)
    late_payments_last_12m: int = Field(ge=0, le=50)
    debt_to_income_ratio: float = Field(ge=0, le=5)


class FeatureImportance(BaseModel):
    feature: str
    importance: float
    direction: Literal["up", "down"]


class PredictionResult(BaseModel):
    risk_level: Literal["Low", "Medium", "High"]
    default_probability: float
    top_factors: list[FeatureImportance]


class PredictionRecord(BaseModel):
    id: str
    timestamp: datetime
    risk_level: str
    default_probability: float
    inputs: PredictionInput


class ModelInfo(BaseModel):
    model_type: str
    trained_at: str
    metrics: dict[str, float]
    feature_names: list[str]
    categorical_options: dict[str, list[str]]


# --- Personal Financial Advisor ---


class FinancialProfile(BaseModel):
    age: int = Field(ge=18, le=100)
    gender: str
    marital_status: str
    education: str
    employment: str
    annual_income: float = Field(ge=0)
    loan_amount: float = Field(ge=0)
    loan_term_months: int = Field(ge=1, le=600)
    interest_rate: float = Field(ge=0, le=50)
    credit_history_years: float = Field(ge=0, le=50)
    num_existing_loans: int = Field(ge=0, le=20)
    num_credit_cards: int = Field(ge=0, le=20)
    avg_monthly_balance: float = Field(ge=0)
    late_payments_last_12m: int = Field(ge=0, le=50)
    debt_to_income_ratio: float = Field(ge=0, le=5)
    goals: list[str] = Field(default_factory=list)
    monthly_savings: float = Field(ge=0, default=0)
    existing_investments: float = Field(ge=0, default=0)
    employment_years: float = Field(ge=0, default=0)

    def to_prediction_input(self) -> PredictionInput:
        return PredictionInput(**self.model_dump(include=set(PredictionInput.model_fields.keys())))


class FinancialProfileResponse(FinancialProfile):
    username: str
    completion_pct: int


class LoanProduct(BaseModel):
    id: str
    name: str
    category: str
    min_income: float
    max_dti: float
    max_late_payments: int
    min_employment_years: float
    min_amount: float
    max_amount: float
    typical_rate_range: str
    requires_collateral: bool
    description: str
    default_tenure_months: int = 60


class LoanMatch(BaseModel):
    product_id: str
    product_name: str
    category: str
    match_score: int = Field(ge=0, le=100)
    approval_likelihood: Literal["High", "Medium", "Low", "Ineligible"]
    max_amount: float
    est_monthly_emi: float
    eligible: bool
    blocking_factors: list[str]
    required_improvements: list[str]


class EligibilityResponse(BaseModel):
    default_probability: float
    risk_level: Literal["Low", "Medium", "High"]
    matches: list[LoanMatch]
    eligible_count: int
    ineligible_count: int


class ScenarioDelta(BaseModel):
    annual_income: float | None = None
    debt_to_income_ratio: float | None = None
    late_payments_last_12m: int | None = None
    num_existing_loans: int | None = None
    avg_monthly_balance: float | None = None
    monthly_savings: float | None = None
    employment_years: float | None = None
    existing_investments: float | None = None


class ScenarioResponse(BaseModel):
    baseline: EligibilityResponse
    scenario: EligibilityResponse
    additional_eligible_count: int
    additional_max_amount_total: float


class Opportunity(BaseModel):
    product_id: str
    product_name: str
    current_gap: str
    action_steps: list[str]
    estimated_months: int
    unlocks_amount: float


class OpportunitiesResponse(BaseModel):
    opportunities: list[Opportunity]
