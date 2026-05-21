from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_profiles_collection
from app.schemas import FinancialProfile, OpportunitiesResponse
from app.security import get_current_user
from app.services.eligibility_service import get_eligible_loans
from app.services.ml_service import get_ml_service
from app.services.opportunity_service import get_roadmap

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])


@router.get("", response_model=OpportunitiesResponse)
def get_opportunities(username: str = Depends(get_current_user)):
    doc = get_profiles_collection().find_one({"username": username})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Save your profile first.",
        )
    doc.pop("_id", None)
    doc.pop("username", None)
    profile = FinancialProfile(**doc)

    ml = get_ml_service()
    prediction = ml.predict(profile.to_prediction_input())
    matches = get_eligible_loans(profile, prediction.default_probability)
    ineligible = [m for m in matches if not m.eligible]
    low = [m for m in matches if m.eligible and m.approval_likelihood == "Low"]
    roadmap = get_roadmap(profile, ineligible + low, matches)

    return OpportunitiesResponse(opportunities=roadmap)
