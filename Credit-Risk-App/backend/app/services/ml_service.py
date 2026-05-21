import json
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap

from app.config import get_settings
from app.schemas import FeatureImportance, PredictionInput, PredictionResult

FEATURE_ORDER = [
    "age",
    "gender",
    "marital_status",
    "education",
    "employment",
    "annual_income",
    "loan_amount",
    "loan_term_months",
    "interest_rate",
    "credit_history_years",
    "num_existing_loans",
    "num_credit_cards",
    "avg_monthly_balance",
    "late_payments_last_12m",
    "debt_to_income_ratio",
]

FEATURE_LABELS = {
    "age": "Age",
    "gender": "Gender",
    "marital_status": "Marital status",
    "education": "Education",
    "employment": "Employment type",
    "annual_income": "Annual income",
    "loan_amount": "Loan amount",
    "loan_term_months": "Loan term",
    "interest_rate": "Interest rate",
    "credit_history_years": "Credit history",
    "num_existing_loans": "Existing loans",
    "num_credit_cards": "Credit cards",
    "avg_monthly_balance": "Avg monthly balance",
    "late_payments_last_12m": "Late payments (12m)",
    "debt_to_income_ratio": "Debt-to-income ratio",
}

LOW_THRESHOLD = 0.4
HIGH_THRESHOLD = 0.7


class MLService:
    def __init__(self, models_dir: Path):
        self.models_dir = models_dir
        self.model = joblib.load(models_dir / "model.pkl")
        self.base_estimator = joblib.load(models_dir / "base_estimator.pkl")
        self.scaler = joblib.load(models_dir / "scaler.pkl")
        self.encoders = joblib.load(models_dir / "encoders.pkl")
        background = joblib.load(models_dir / "shap_background.pkl")
        with open(models_dir / "metadata.json", encoding="utf-8") as f:
            self.metadata = json.load(f)
        self.explainer = shap.TreeExplainer(self.base_estimator, data=background)

    def _encode_row(self, data: PredictionInput) -> pd.DataFrame:
        row = data.model_dump()
        for col in ["gender", "marital_status", "education", "employment"]:
            encoder = self.encoders[col]
            value = row[col]
            if value not in encoder.classes_:
                raise ValueError(f"Invalid value '{value}' for {col}")
            row[col] = int(encoder.transform([value])[0])
        return pd.DataFrame([{k: row[k] for k in FEATURE_ORDER}])

    def _risk_level(self, probability: float) -> str:
        if probability < LOW_THRESHOLD:
            return "Low"
        if probability < HIGH_THRESHOLD:
            return "Medium"
        return "High"

    def _explain_prediction(self, scaled_row: np.ndarray) -> list[FeatureImportance]:
        """Per-applicant SHAP contributions (not global feature importances)."""
        shap_values = self.explainer.shap_values(scaled_row)
        if isinstance(shap_values, list):
            values = np.asarray(shap_values[1])[0]
        else:
            values = np.asarray(shap_values)[0]

        ranked = sorted(
            zip(FEATURE_ORDER, values, strict=True),
            key=lambda item: abs(item[1]),
            reverse=True,
        )[:3]
        total = sum(abs(v) for _, v in ranked) or 1e-9

        factors: list[FeatureImportance] = []
        for name, value in ranked:
            factors.append(
                FeatureImportance(
                    feature=FEATURE_LABELS.get(name, name),
                    importance=round(abs(value) / total, 3),
                    direction="up" if value > 0 else "down",
                )
            )
        return factors

    def predict(self, data: PredictionInput) -> PredictionResult:
        encoded = self._encode_row(data)
        scaled = self.scaler.transform(encoded)
        probability = float(self.model.predict_proba(scaled)[0][1])
        return PredictionResult(
            risk_level=self._risk_level(probability),
            default_probability=round(probability, 4),
            top_factors=self._explain_prediction(scaled),
        )

    def get_model_info(self) -> dict:
        options_path = self.models_dir / "categorical_options.json"
        with open(options_path, encoding="utf-8") as f:
            categorical_options = json.load(f)
        return {
            "model_type": self.metadata.get("model_type", "unknown"),
            "trained_at": self.metadata.get("trained_at", ""),
            "metrics": self.metadata.get("metrics", {}),
            "feature_names": FEATURE_ORDER,
            "categorical_options": categorical_options,
        }


@lru_cache
def get_ml_service() -> MLService:
    models_dir = get_settings().models_dir
    required = [
        "model.pkl",
        "base_estimator.pkl",
        "scaler.pkl",
        "encoders.pkl",
        "shap_background.pkl",
    ]
    missing = [f for f in required if not (models_dir / f).exists()]
    if missing:
        raise FileNotFoundError(
            f"Missing model artifacts: {', '.join(missing)}. Run: python backend/train_model.py"
        )
    return MLService(models_dir)
