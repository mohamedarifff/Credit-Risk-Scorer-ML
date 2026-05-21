from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_profiles_collection
from app.schemas import FinancialProfile, FinancialProfileResponse
from app.security import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])

PROFILE_FIELDS = list(FinancialProfile.model_fields.keys())


def _completion_pct(doc: dict) -> int:
    filled = 0
    for key in PROFILE_FIELDS:
        val = doc.get(key)
        if key == "goals":
            if val:
                filled += 1
        elif val is not None and val != "" and val != 0:
            filled += 1
        elif key in ("monthly_savings", "existing_investments", "employment_years") and val == 0:
            pass
        elif val == 0 and key in (
            "late_payments_last_12m",
            "num_existing_loans",
            "num_credit_cards",
        ):
            filled += 1
    return min(100, int(round(filled / len(PROFILE_FIELDS) * 100)))


@router.post("", response_model=FinancialProfileResponse)
def save_profile(payload: FinancialProfile, username: str = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["username"] = username
    get_profiles_collection().update_one(
        {"username": username},
        {"$set": doc},
        upsert=True,
    )
    return FinancialProfileResponse(
        username=username,
        completion_pct=_completion_pct(doc),
        **payload.model_dump(),
    )


@router.get("", response_model=FinancialProfileResponse)
def get_profile(username: str = Depends(get_current_user)):
    doc = get_profiles_collection().find_one({"username": username})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Complete your financial profile first.",
        )
    doc.pop("_id", None)
    doc.pop("username", None)
    return FinancialProfileResponse(
        username=username,
        completion_pct=_completion_pct(doc),
        **doc,
    )
