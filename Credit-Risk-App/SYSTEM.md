# Personal Financial Advisor Platform — System Documentation

This document describes **exactly what the system is today**: what it does, what it contains, and how all parts work together.

---

## 1. What this system is

**Personal Financial Advisor Platform** (built on the Credit Risk Intelligence stack) is a full-stack web application that helps a logged-in user:

1. **Assess credit default risk** — ML probability + Low/Medium/High tier + per-applicant SHAP explanations  
2. **Maintain a financial profile** — saved applicant data used across advisor features  
3. **Discover loan eligibility** — match against 10 Indian loan products with approval likelihood, max amount, and EMI  
4. **Plan improvements** — roadmap with concrete steps to unlock ineligible products  
5. **Simulate what-if scenarios** — change income, DTI, etc. without saving and see eligibility update live  
6. **Review history** — past risk assessments stored per user  
7. **Guided advisor wizard** (default after login) — linear flow: Build Profile → State Goal → Analyse & Clarify → Recommendation, with collapsible completed steps above  

It runs on **synthetic training data** (~1,000 CSV rows). It is suitable for **demonstration and portfolio use**, not production lending without validation, compliance, and security review.

---

## 2. High-level architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│  REACT FRONTEND (Vite) — http://localhost:5173                            │
│  Default: /advisor (4-step wizard). Also: Profile, Eligibility,          │
│  Opportunities, Simulator, /assess (risk), History                        │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │  HTTP /api/*  +  Authorization: Bearer JWT
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  FASTAPI BACKEND — http://localhost:8000                                  │
│  Routers: auth · profile · eligibility · opportunities · predictions    │
│  Services: ml_service · eligibility_service · opportunity_service         │
└───────────────┬──────────────────────────────┬─────────────────────────┘
                │                              │
                ▼                              ▼
┌─────────────────────────────┐    ┌──────────────────────────────────────────┐
│  MongoDB                     │    │  models/ + app/data/ (on disk)          │
│  • users                     │    │  • model.pkl, base_estimator.pkl        │
│  • profiles (1 per user)     │    │  • scaler.pkl, encoders.pkl             │
│  • predictions (history)     │    │  • shap_background.pkl, metadata.json   │
└─────────────────────────────┘    │  • loan_products.json (10 products)      │
                                    └──────────────────────────────────────────┘

Offline training:  data/credit_data.csv  →  backend/train_model.py  →  models/*
```

---

## 3. Repository layout

| Path | Purpose |
|------|---------|
| **Backend** | |
| `backend/app/main.py` | FastAPI app, CORS, router registration |
| `backend/app/config.py` | Settings from `.env` |
| `backend/app/database.py` | MongoDB client; `users`, `profiles`, `predictions` |
| `backend/app/security.py` | bcrypt passwords, JWT |
| `backend/app/schemas.py` | All Pydantic request/response models |
| `backend/app/routers/auth.py` | Register, login |
| `backend/app/routers/profile.py` | Save/get financial profile |
| `backend/app/routers/eligibility.py` | Eligibility + what-if scenarios |
| `backend/app/routers/opportunities.py` | Improvement roadmap |
| `backend/app/routers/predictions.py` | Risk predict, history, model info, `/me` |
| `backend/app/services/ml_service.py` | ML predict + SHAP (unchanged core) |
| `backend/app/services/eligibility_service.py` | Loan matching, EMI, scores |
| `backend/app/services/opportunity_service.py` | Roadmap for ineligible products |
| `backend/app/data/loan_products.json` | 10 loan product definitions |
| `backend/train_model.py` | Train/write `models/*` |
| `backend/requirements.txt` | Python deps (incl. `shap`) |
| **Frontend** | |
| `frontend/src/pages/AdvisorWizard.tsx` | Default guided flow (steps 1–4) |
| `frontend/src/pages/Profile.tsx` | `ProfileForm`: 3-section profile (embedded in wizard + `/profile`) |
| `frontend/src/components/GoalPicker.tsx` | Step 2: single primary goal cards |
| `frontend/src/components/GoalAnalysis.tsx` | Step 3: eligibility + opportunities APIs + clarifying Qs |
| `frontend/src/components/Recommendation.tsx` | Step 4: readiness + goal-filtered loan cards |
| `frontend/src/pages/Eligibility.tsx` | Loan eligibility cards + filters |
| `frontend/src/pages/Opportunities.tsx` | Timeline roadmap (shows `current_gap` per item) |
| `frontend/src/pages/Simulator.tsx` | What-if sliders |
| `frontend/src/pages/DashboardPage.tsx` | Standalone risk assessment (`/assess`) |
| `frontend/src/pages/HistoryPage.tsx` | Prediction history table |
| `frontend/src/pages/LoginPage.tsx` · `RegisterPage.tsx` | Auth |
| `frontend/src/components/Layout.tsx` | Nav + outlet |
| `frontend/src/components/LoanMatchCard.tsx` | Eligibility product card |
| `frontend/src/components/PredictionForm.tsx` · `RiskResult.tsx` | Assess UI |
| `frontend/src/api/client.ts` | Typed API client |
| `frontend/src/types.ts` | TypeScript interfaces |
| **Data & models** | |
| `data/credit_data.csv` | Training data |
| `models/` | Generated ML artifacts |
| `.env` / `.env.example` | Secrets and config |

**Legacy removed:** Streamlit `app.py`, `auth_app.py`, Flask `templates/`.

---

## 4. Frontend routes and navigation

| Route | Page | Purpose |
|-------|------|---------|
| `/login` | Login | JWT sign-in |
| `/register` | Register | Create account |
| `/` | Redirect | Sends authenticated users to **`/advisor`** |
| **`/advisor`** | **AdvisorWizard** | **Default home:** linear 4-step guided flow |
| `/profile` | Profile | Same `ProfileForm` as wizard Step 1; direct URL for power users |
| `/eligibility` | Eligibility | Ranked loan matches (requires profile) |
| `/opportunities` | Opportunities | Roadmap list; each item shows **`current_gap`** (requires profile) |
| `/simulator` | Simulator | What-if sliders (requires profile) |
| `/assess` | Dashboard | One-off ML risk assessment (original Assess page) |
| `/history` | History | Past predictions (original feature) |

All routes except `/login` and `/register` require JWT (stored in `localStorage`).

**Recommended user flow:** After login → **`/advisor`** (complete wizard). Optionally: **Eligibility** / **Opportunities** / **Simulator** from nav, or **Assess** / **History** anytime.

---

## 5. Features in detail

### 5.1 Authentication (unchanged)

| Action | Behaviour |
|--------|-----------|
| Register | `POST /api/auth/register` — bcrypt hash, auto-login |
| Login | `POST /api/auth/login` — returns JWT |
| Logout | Clears token client-side |
| Protected API | `get_current_user` dependency on all advisor + prediction routes |

**Not included:** email verification, password reset, OAuth, admin roles.

---

### 5.2 Financial profile

**Purpose:** Single saved record per user driving eligibility, opportunities, and simulator.

The **profile form** (wizard Step 1 and `/profile`) has **three sections** (About you, Income & assets, Debts & credit). Numeric fields allow **0** where applicable; optional helper copy explains that zero is valid when a field does not apply.

**Primary goal** is **not** stored in the profile form in the guided flow: the user picks exactly one goal in wizard Step 2 (`GoalPicker`); it lives in wizard state only until recommendations are shown. The API still accepts `goals: list[str]` on `FinancialProfile`; the wizard saves `goals` as an empty array on profile submit so the backend schema stays unchanged.

| API | Description |
|-----|-------------|
| `POST /api/profile` | Upsert profile for current user |
| `GET /api/profile` | Load profile + `completion_pct` |

**MongoDB `profiles`:** one document per `username` (upsert on save).

---

### 5.2a Guided advisor wizard (`/advisor`)

| Step | UI | Behaviour |
|------|-----|-----------|
| 1 | `ProfileForm` embedded | Save via `POST /api/profile` → advance to Step 2 |
| 2 | `GoalPicker` | User selects one goal ID → advance to Step 3 (no API) |
| 3 | `GoalAnalysis` | Parallel `GET /api/eligibility` + `GET /api/opportunities`; optional clarifying questions by goal; then advance to Step 4 |
| 4 | `Recommendation` | Credit readiness from eligibility; loan cards filtered by goal; **Simulate Changes** → `/simulator`; **Start Over** → Step 1 (does not delete MongoDB profile) |

Completed steps appear **above** the active step as **collapsible** summaries. The user cannot jump ahead out of order from the wizard shell.

---

### 5.3 Risk assessment — Assess page (unchanged behaviour)

Standalone form; does **not** require saved profile.

1. User submits 15 fields → `POST /api/predictions`  
2. Calibrated model → default probability + risk tier  
3. SHAP on `base_estimator.pkl` → top 3 drivers with `direction` (`up` / `down`)  
4. Result saved to `predictions` collection  

---

### 5.4 Loan eligibility engine

**Trigger:** `GET /api/eligibility` (profile required).

**Pipeline:**
```
FinancialProfile
  → ml_service.predict(profile.to_prediction_input())  → default_probability
  → eligibility_service.get_eligible_loans(profile, default_prob)
  → ranked list of LoanMatch (10 products)
```

**Loan products (10):** Personal, Home, Car, Education, Business, Gold, Salary Advance, Top-up, Credit Card Upgrade, Two-Wheeler — defined in `backend/app/data/loan_products.json`.

**Per-product checks:**
- Hard: min income, max DTI, max late payments, min employment years, collateral (investments) if secured  
- Soft: match score 0–100 from income headroom, DTI, default prob, credit history, savings  

**Approval likelihood:**

| Label | Typical conditions |
|-------|-------------------|
| **High** | `default_prob < 0.30` and hard criteria met, strong soft score |
| **Medium** | `default_prob < 0.55` and most criteria met |
| **Low** | Borderline soft score, hard criteria met |
| **Ineligible** | Hard criteria failed |

**Outputs per product:** `max_amount`, `est_monthly_emi` (flat EMI formula), `blocking_factors`, `required_improvements`.

**EMI formula:**
```
monthly_rate = annual_rate / 12 / 100
EMI = P × monthly_rate × (1 + monthly_rate)^n / ((1 + monthly_rate)^n − 1)
```
Rate = midpoint of `typical_rate_range`; tenure = product `default_tenure_months`.

**UI:** Category filters (All, Personal, Home, Car, Business, Education, Other). Eligible cards prominent; ineligible in collapsible section.

---

### 5.5 Opportunity roadmap and `current_gap`

**Trigger:** `GET /api/opportunities` (profile required).

**Purpose:** Return an ordered list of **Opportunity** objects so the user (or wizard Step 3) can see what stands between their **current** profile and unlocking specific loan products they are not yet eligible for (or only weakly eligible).

#### Schema: `Opportunity` (`backend/app/schemas.py`)

| Field | Type | Meaning |
|-------|------|--------|
| **`current_gap`** | **`str`** | **Human-readable summary of the gap** between the user’s saved profile and the product’s requirements — e.g. income shortfall, DTI above `max_dti`, late payments over limit, employment tenure too low, or collateral/investment shortfall for secured products. May combine multiple issues in one sentence (semicolon-separated). This is the headline “why not yet” string for that product. |
| `product_id` | `str` | Loan product id (matches `loan_products.json`) |
| `product_name` | `str` | Display name |
| `action_steps` | `list[str]` | Concrete, ordered steps to close the gap |
| `estimated_months` | `int` | Rough months to improve |
| `unlocks_amount` | `float` | Indicative ₹ amount they could qualify for after improvement |

**Generation:** `opportunity_service.get_roadmap()` compares `FinancialProfile` and `LoanMatch` / product rules and builds `current_gap` from the first failing dimensions (DTI, income, late payments, employment years, collateral proxy, etc.).

**Sorting:** Opportunities are returned **shortest `estimated_months` first**.

**Where it appears in the UI**

- **`/opportunities`** — each roadmap card shows **`current_gap`** prominently (timeline layout).  
- **Wizard Step 3** — calls the same API for analysis; Step 4 recommendations use eligibility data, while clarifying-question copy may reference gaps in plain language.

---

### 5.6 What-if simulator

**Trigger:** `POST /api/scenarios` with partial overrides (profile required; **not saved**).

**Sliders:** annual_income, debt_to_income_ratio, late_payments_last_12m, num_existing_loans, avg_monthly_balance.

**Response:** `baseline` vs `scenario` eligibility, `additional_eligible_count`, `additional_max_amount_total`.

Frontend debounces 400ms per slider change.

---

### 5.7 Prediction history (unchanged)

`GET /api/predictions/history` — up to 50 records per user from `predictions` collection.

---

## 6. Machine learning

### 6.1 Problem

Binary classification: **default** (0/1) from 15 numeric/categorical features.

### 6.2 Stack

| Piece | Technology |
|-------|------------|
| Base model | `GradientBoostingClassifier` |
| Inference | `CalibratedClassifierCV` (isotonic) → `model.pkl` |
| SHAP | `TreeExplainer` on `base_estimator.pkl` + `shap_background.pkl` |
| Preprocessing | `StandardScaler`, `LabelEncoder` × 4 categoricals |

### 6.3 Risk tiers (Assess page)

| Probability | Label |
|-------------|-------|
| &lt; 40% | Low |
| 40% – 69% | Medium |
| ≥ 70% | High |

Defined in `ml_service.py` (`LOW_THRESHOLD = 0.4`, `HIGH_THRESHOLD = 0.7`).

Eligibility uses separate thresholds inside `eligibility_service.py` (0.30 / 0.55 for High/Medium).

### 6.4 Holdout metrics (`models/metadata.json`)

| Metric | Value |
|--------|-------|
| Accuracy | 96.0% |
| Precision | 96.1% |
| Recall | 99.4% |
| F1 | 97.7% |
| ROC-AUC | 97.5% |
| Brier score | 0.030 |
| CV ROC-AUC | 98.1% ± 0.7% |

Train/test: 800 / 200 samples; dataset default rate ≈ 86%.

### 6.5 Model artifacts

| File | Use |
|------|-----|
| `model.pkl` | `predict_proba` at runtime |
| `base_estimator.pkl` | SHAP only |
| `scaler.pkl` · `encoders.pkl` | Preprocessing |
| `shap_background.pkl` | SHAP background sample (120 rows) |
| `metadata.json` | Metrics, global importances, training date |
| `categorical_options.json` | Dropdown values for UI |

### 6.6 Explanations

- **Assess / predictions:** per-row SHAP — changes when inputs change.  
- **Eligibility:** rules + ML probability; not SHAP per loan product.  
- **Global importances** in `metadata.json` are for analysis only, not shown as user-facing drivers.

---

## 7. Input fields

### 7.1 Core 15 (ML + profile + Assess)

| Field | Type | Notes |
|-------|------|-------|
| age | int | 18–100 |
| gender | category | Male, Female |
| marital_status | category | Single, Married, Divorced |
| education | category | High School, Diploma, Graduate, Post-Graduate |
| employment | category | Salaried, Self-Employed, Unemployed |
| annual_income | float | ₹ |
| loan_amount | float | Current/representative loan |
| loan_term_months | int | |
| interest_rate | float | % |
| credit_history_years | float | |
| num_existing_loans | int | |
| num_credit_cards | int | |
| avg_monthly_balance | float | ₹ |
| late_payments_last_12m | int | |
| debt_to_income_ratio | float | 0–5 |

### 7.2 Profile-only extensions

| Field | Type | Notes |
|-------|------|-------|
| goals | list[str] | Optional; wizard often saves `[]` while goal is chosen only in Step 2 UI state |
| monthly_savings | float | ₹ |
| existing_investments | float | ₹; used as collateral proxy |
| employment_years | float | Tenure |

`FinancialProfile.to_prediction_input()` maps the 15 core fields into `PredictionInput` for `ml_service.predict()`.

---

## 8. API reference

Base URL: `http://localhost:8000`  
Auth header: `Authorization: Bearer <token>`  
Interactive docs: `http://localhost:8000/docs`

### Health & auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | `{ "status": "ok" }` |
| POST | `/api/auth/register` | No | Create user |
| POST | `/api/auth/login` | No | JWT token |
| GET | `/api/auth/me` | Yes | `{ username, email }` |

### Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/profile` | Yes | Save/update financial profile |
| GET | `/api/profile` | Yes | Get profile + `completion_pct` |

### Advisor

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/eligibility` | Yes | ML risk + loan matches |
| POST | `/api/scenarios` | Yes | What-if; body = partial `ScenarioDelta` |
| GET | `/api/opportunities` | Yes | Roadmap: list of `Opportunity` with **`current_gap`**, `action_steps`, `estimated_months`, `unlocks_amount` |

### Risk assessment (original)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/model/info` | Yes | Model metadata + categorical options |
| POST | `/api/predictions` | Yes | Run assessment; saves history |
| GET | `/api/predictions/history` | Yes | List past predictions (`?limit=50`) |

### Example: prediction response

```json
{
  "risk_level": "Low",
  "default_probability": 0.042,
  "top_factors": [
    { "feature": "Late payments (12m)", "importance": 0.41, "direction": "down" },
    { "feature": "Debt-to-income ratio", "importance": 0.35, "direction": "down" },
    { "feature": "Annual income", "importance": 0.24, "direction": "down" }
  ]
}
```

### Example: loan match

```json
{
  "product_id": "home_loan",
  "product_name": "Home Loan",
  "category": "home",
  "match_score": 82,
  "approval_likelihood": "High",
  "max_amount": 4500000,
  "est_monthly_emi": 38500,
  "eligible": true,
  "blocking_factors": [],
  "required_improvements": []
}
```

### Example: scenario response

```json
{
  "baseline": { "...EligibilityResponse..." },
  "scenario": { "...EligibilityResponse..." },
  "additional_eligible_count": 2,
  "additional_max_amount_total": 850000
}
```

### Example: opportunities response (`current_gap`)

`GET /api/opportunities` returns `OpportunitiesResponse`: `{ "opportunities": [ ... ] }`. Each element includes **`current_gap`**:

```json
{
  "opportunities": [
    {
      "product_id": "home_loan",
      "product_name": "Home Loan",
      "current_gap": "Your DTI is 0.52, requirement is < 0.40; Annual income ₹400,000 is below ₹600,000",
      "action_steps": [
        "Pay down existing debt to bring DTI below 0.40 (reduce monthly obligations by ~₹…)",
        "Increase verifiable annual income by ₹200,000 or add a co-applicant"
      ],
      "estimated_months": 12,
      "unlocks_amount": 4500000
    }
  ]
}
```

---

## 9. MongoDB

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | **MongoDB Atlas** SRV connection string (`mongodb+srv://user:pass@cluster.mongodb.net/...`) |
| `MONGO_DB_NAME` | Database name (default `credit_risk_app`) |

### Collections

**`users`**
```json
{ "username": "jane", "email": "jane@example.com", "password": "<bcrypt>" }
```

**`profiles`** (one per user)
```json
{
  "username": "jane",
  "age": 35,
  "gender": "Male",
  "...": "all FinancialProfile fields",
  "goals": ["home_loan"],
  "monthly_savings": 20000,
  "existing_investments": 500000,
  "employment_years": 4
}
```

**`predictions`** (many per user)
```json
{
  "username": "jane",
  "timestamp": "2026-05-18T12:00:00Z",
  "risk_level": "Low",
  "default_probability": 0.042,
  "inputs": { "...15 PredictionInput fields..." }
}
```

---

## 10. Environment variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `MONGO_URI` | Yes | — | MongoDB Atlas (`mongodb+srv://`) |
| `MONGO_DB_NAME` | No | `credit_risk_app` | DB name |
| `JWT_SECRET` | Yes | — | JWT signing |
| `JWT_EXPIRE_MINUTES` | No | `1440` | Token TTL |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Frontend origin(s) |

Copy `.env.example` → `.env` at project root.

---

## 11. How to run

```bash
# 1. Environment
cp .env.example .env
# Set MONGO_URI, JWT_SECRET

# 2. Train model (first time)
cd backend
pip install -r requirements.txt
python train_model.py

# 3. API
uvicorn app.main:app --reload --port 8000

# 4. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` → `http://127.0.0.1:8000`.

---

## 12. End-to-end flows

### A. Eligibility check
```
Profile saved → GET /api/eligibility
  → load profiles collection
  → ml_service.predict(to_prediction_input())
  → eligibility_service.get_eligible_loans()
  → return EligibilityResponse
```

### B. What-if simulator
```
POST /api/scenarios { debt_to_income_ratio: 0.25 }
  → merge delta onto saved profile (not persisted)
  → run eligibility twice (baseline + scenario)
  → return diff counts and amounts
```

### C. Standalone assessment (unchanged)
```
POST /api/predictions { 15 fields }
  → ml_service.predict()
  → insert predictions collection
```

### D. Opportunities roadmap (`current_gap`)
```
GET /api/opportunities
  → load profiles collection → FinancialProfile
  → ml_service.predict() + get_eligible_loans()
  → opportunity_service.get_roadmap(profile, ineligible_matches, all_matches)
  → each Opportunity includes current_gap (plain-language gap vs product rules)
  → OpportunitiesResponse { opportunities: [...] }
```

---

## 13. What the system does NOT do

| Not included | Notes |
|--------------|-------|
| Credit bureau / live bank APIs | User-entered + CSV training data only |
| Email, SMS, password reset | Auth is register/login only |
| Batch CSV scoring | One profile/scenario at a time |
| Admin / multi-user analytics | Per-user data isolation only |
| UI model retraining | Run `train_model.py` manually |
| Legal / regulatory sign-off | Demo / portfolio scope |
| Docker / cloud deploy in repo | Local dev documented only |
| Loan application submission | Read-only advisor; no lender integration |

---

## 14. Technology stack

| Layer | Stack |
|-------|--------|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS 3, React Router 6 |
| Backend | FastAPI, Uvicorn, Pydantic v2, pydantic-settings |
| Auth | bcrypt, python-jose (JWT) |
| Database | MongoDB (pymongo) |
| ML | scikit-learn, joblib, SHAP |
| Advisor logic | Python services + JSON product catalogue |

---

## 15. Maintenance

| Task | Command |
|------|---------|
| Retrain ML model | `cd backend && python train_model.py` |
| API docs | `http://localhost:8000/docs` |
| Production build | `cd frontend && npm run build` |

Restart FastAPI after retraining to reload `models/*.pkl`.

Edit loan products in `backend/app/data/loan_products.json` (no retrain needed).

---

## 16. Limitations and disclaimer

1. **Synthetic data** — High accuracy on holdout does not guarantee real-world performance.  
2. **~86% default rate in training CSV** — Probabilities and tiers reflect this skew.  
3. **Eligibility rules are heuristic** — Product criteria approximate Indian lenders; not verified against live policies.  
4. **EMI estimates** — Mid-rate assumption; actual offers vary.  
5. **Not financial advice** — For education and demonstration only.  

---

*Last updated: May 2026 — Personal Financial Advisor Platform (FastAPI + React + MongoDB + calibrated GBM + SHAP + eligibility engine + guided `/advisor` wizard; opportunities expose **`current_gap`** on each roadmap item).*
