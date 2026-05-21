"""Train credit risk model and write artifacts to ../models/."""

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "credit_data.csv"
MODELS_DIR = ROOT / "models"

FEATURES = [
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

CAT_COLS = ["gender", "marital_status", "education", "employment"]
SHAP_BACKGROUND_SIZE = 120


def main() -> None:
    df = pd.read_csv(DATA_PATH)
    df.columns = df.columns.str.strip()
    df = df.rename(columns={"employment_type": "employment"})

    encoders: dict[str, LabelEncoder] = {}
    categorical_options: dict[str, list[str]] = {}
    for col in CAT_COLS:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        encoders[col] = le
        categorical_options[col] = le.classes_.tolist()

    X = df[FEATURES]
    y = df["default"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    base_model = GradientBoostingClassifier(
        n_estimators=250,
        learning_rate=0.06,
        max_depth=5,
        min_samples_leaf=6,
        subsample=0.9,
        random_state=42,
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_auc = cross_val_score(base_model, X_train_scaled, y_train, cv=cv, scoring="roc_auc")

    base_model.fit(X_train_scaled, y_train)

    # Calibrate probabilities on training data (cv=prefit avoids refitting the booster)
    model = CalibratedClassifierCV(base_model, method="isotonic", cv="prefit")
    model.fit(X_train_scaled, y_train)

    y_prob = model.predict_proba(X_test_scaled)[:, 1]
    y_pred = (y_prob >= 0.5).astype(int)

    metrics = {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
        "brier_score": round(float(brier_score_loss(y_test, y_prob)), 4),
        "cv_roc_auc_mean": round(float(cv_auc.mean()), 4),
        "cv_roc_auc_std": round(float(cv_auc.std()), 4),
    }

    rng = np.random.default_rng(42)
    bg_idx = rng.choice(len(X_train_scaled), size=min(SHAP_BACKGROUND_SIZE, len(X_train_scaled)), replace=False)
    shap_background = X_train_scaled[bg_idx]

    importances = dict(zip(FEATURES, base_model.feature_importances_.tolist(), strict=True))
    feature_importances = {
        k: round(float(v), 4)
        for k, v in sorted(importances.items(), key=lambda x: x[1], reverse=True)
    }

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODELS_DIR / "model.pkl")
    joblib.dump(base_model, MODELS_DIR / "base_estimator.pkl")
    joblib.dump(scaler, MODELS_DIR / "scaler.pkl")
    joblib.dump(encoders, MODELS_DIR / "encoders.pkl")
    joblib.dump(shap_background, MODELS_DIR / "shap_background.pkl")

    metadata = {
        "model_type": "CalibratedGradientBoosting",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "metrics": metrics,
        "feature_importances": feature_importances,
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "default_rate": round(float(y.mean()), 4),
        "explanation_method": "SHAP TreeExplainer (per applicant)",
    }
    with open(MODELS_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    with open(MODELS_DIR / "categorical_options.json", "w", encoding="utf-8") as f:
        json.dump(categorical_options, f, indent=2)

    print("Training complete.")
    print(json.dumps(metrics, indent=2))
    print(f"Artifacts saved to {MODELS_DIR}")


if __name__ == "__main__":
    main()
