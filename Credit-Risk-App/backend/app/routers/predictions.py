from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_predictions_collection
from app.schemas import ModelInfo, PredictionInput, PredictionRecord, PredictionResult, UserResponse
from app.security import get_current_user
from app.services.ml_service import get_ml_service

router = APIRouter(prefix="/api", tags=["predictions"])


@router.get("/auth/me", response_model=UserResponse)
def me(username: str = Depends(get_current_user)):
    from app.database import get_users_collection

    user = get_users_collection().find_one({"username": username})
    return UserResponse(username=username, email=user["email"])


@router.get("/model/info", response_model=ModelInfo)
def model_info(_: str = Depends(get_current_user)):
    try:
        return ModelInfo(**get_ml_service().get_model_info())
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/predictions", response_model=PredictionResult)
def create_prediction(payload: PredictionInput, username: str = Depends(get_current_user)):
    try:
        ml = get_ml_service()
        result = ml.predict(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    doc = {
        "username": username,
        "timestamp": datetime.now(timezone.utc),
        "risk_level": result.risk_level,
        "default_probability": result.default_probability,
        "inputs": payload.model_dump(),
    }
    inserted = get_predictions_collection().insert_one(doc)
    return result


@router.get("/predictions/history", response_model=list[PredictionRecord])
def prediction_history(username: str = Depends(get_current_user), limit: int = 50):
    limit = min(max(limit, 1), 100)
    cursor = (
        get_predictions_collection()
        .find({"username": username})
        .sort("timestamp", -1)
        .limit(limit)
    )
    records = []
    for doc in cursor:
        records.append(
            PredictionRecord(
                id=str(doc["_id"]),
                timestamp=doc["timestamp"],
                risk_level=doc["risk_level"],
                default_probability=doc["default_probability"],
                inputs=PredictionInput(**doc["inputs"]),
            )
        )
    return records
