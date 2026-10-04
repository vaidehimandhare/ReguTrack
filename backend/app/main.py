from fastapi import FastAPI

from app.database import Base, engine
from app.models.report import Report
from app.routes.upload import router as upload_router
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ReguTrack API",
    description="Intelligent Regulatory Reporting & Compliance Risk Monitoring System",
    version="1.0.0"
)
app.include_router(upload_router)

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