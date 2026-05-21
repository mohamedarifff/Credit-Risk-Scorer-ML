from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, eligibility, opportunities, predictions, profile


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(
    title="Personal Financial Advisor API",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(predictions.router)
app.include_router(profile.router)
app.include_router(eligibility.router)
app.include_router(opportunities.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
