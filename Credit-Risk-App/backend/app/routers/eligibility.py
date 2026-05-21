from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_profiles_collection
from app.schemas import (
    EligibilityResponse,
    FinancialProfile,
    ScenarioDelta,
    ScenarioResponse,
)
from app.security import get_current_user
from app.services.eligibility_service import get_eligible_loans
from app.services.ml_service import get_ml_service

router = APIRouter(prefix="/api", tags=["eligibility"])


def _risk_level(probability: float) -> str:
    if probability < 0.4:
        return "Low"
    if probability < 0.7:
        return "Medium"
    return "High"


def _load_profile(username: str) -> FinancialProfile:
    doc = get_profiles_collection().find_one({"username": username})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Save your profile first.",
        )
    doc.pop("_id", None)
    doc.pop("username", None)
    return FinancialProfile(**doc)


def _run_eligibility(profile: FinancialProfile) -> EligibilityResponse:
    ml = get_ml_service()
    prediction = ml.predict(profile.to_prediction_input())
    matches = get_eligible_loans(profile, prediction.default_probability)
    eligible = [m for m in matches if m.eligible]
    return EligibilityResponse(
        default_probability=prediction.default_probability,
        risk_level=_risk_level(prediction.default_probability),  # type: ignore[arg-type]
        matches=matches,
        eligible_count=len(eligible),
        ineligible_count=len(matches) - len(eligible),
    )


def _apply_delta(profile: FinancialProfile, delta: ScenarioDelta) -> FinancialProfile:
    data = profile.model_dump()
    for key, value in delta.model_dump(exclude_none=True).items():
        data[key] = value
    return FinancialProfile(**data)


@router.get("/eligibility", response_model=EligibilityResponse)
def get_eligibility(username: str = Depends(get_current_user)):
    profile = _load_profile(username)
    return _run_eligibility(profile)


@router.post("/scenarios", response_model=ScenarioResponse)
def run_scenario(delta: ScenarioDelta, username: str = Depends(get_current_user)):
    profile = _load_profile(username)
    baseline = _run_eligibility(profile)
    scenario_profile = _apply_delta(profile, delta)
    scenario = _run_eligibility(scenario_profile)

    baseline_eligible = {m.product_id for m in baseline.matches if m.eligible}
    scenario_eligible = {m for m in scenario.matches if m.eligible}
    new_ids = {m.product_id for m in scenario_eligible} - baseline_eligible

    baseline_max = sum(m.max_amount for m in baseline.matches if m.eligible)
    scenario_max = sum(m.max_amount for m in scenario_eligible)
    additional_max = max(0.0, scenario_max - baseline_max)

    return ScenarioResponse(
        baseline=baseline,
        scenario=scenario,
        additional_eligible_count=len(new_ids),
        additional_max_amount_total=round(additional_max, 0),
    )
