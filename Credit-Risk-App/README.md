# Credit Risk Intelligence

Full-stack credit default risk assessment: **FastAPI** backend, **React** frontend, **calibrated gradient boosting** with **per-applicant SHAP** explanations.

**Full system documentation:** see **[SYSTEM.md](./SYSTEM.md)** — Personal Financial Advisor platform: profile, eligibility, opportunities, simulator, ML risk assessment, API, and database.

## Features

- JWT authentication (register / login)
- 15-feature risk prediction with Low / Medium / High tiers
- Per-applicant SHAP explanations (not static global factors)
- Prediction history stored in MongoDB
- Model holdout metrics on dashboard

## Project structure

```
Credit-Risk-App/
├── backend/          # FastAPI API
├── frontend/         # React + Vite + Tailwind
├── data/             # Training CSV
├── models/           # Trained artifacts (generated)
└── .env              # Secrets (create from .env.example)
```

## Setup

### 1. Environment

Copy `.env.example` to `.env` and set:

- `MONGO_URI` — **MongoDB Atlas** connection string (`mongodb+srv://...` from Atlas → Database → Connect)
- `MONGO_DB_NAME` — database name (default `credit_risk_app`)
- `JWT_SECRET` — long random string for production

**Atlas checklist:** create a database user, allow your IP (or `0.0.0.0/0` for dev only), paste the SRV URI into `MONGO_URI`. URL-encode special characters in the password.

### 2. Train model

```bash
cd backend
pip install -r requirements.txt
python train_model.py
```

### 3. Run API

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 4. Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## API (summary)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register` | No |
| POST | `/api/auth/login` | No |
| GET | `/api/auth/me` | Yes |
| GET | `/api/model/info` | Yes |
| POST | `/api/predictions` | Yes |
| GET | `/api/predictions/history` | Yes |

## Disclaimer

Uses synthetic training data. Not for real lending decisions without validation, compliance review, and production-grade controls.
