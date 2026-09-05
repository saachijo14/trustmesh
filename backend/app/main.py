import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    events,
    simulation,
    checkout,
    alerts,
    rings,
    trustpasses,
    policies,
    dashboard,
    metrics,
)


app = FastAPI(
    title="TrustMesh API",
    description="Explainable fraud-risk and agentic-commerce safety layer",
    version="0.1.0",
)


frontend_url = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(events.router)
app.include_router(simulation.router)
app.include_router(checkout.router)
app.include_router(alerts.router)
app.include_router(rings.router)
app.include_router(trustpasses.router)
app.include_router(policies.router)
app.include_router(dashboard.router)
app.include_router(metrics.router)


@app.get("/")
def read_root():
    return {
        "status": "ok",
        "service": "TrustMesh API",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }