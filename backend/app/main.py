from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.upload import router as upload_router
from app.database import Base, engine
from app.models.report import Report
from app.models.user import User


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="ReguTrack API",
    description="Intelligent Regulatory Reporting & Compliance Risk Monitoring System",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(upload_router)
app.include_router(auth_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to ReguTrack",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }