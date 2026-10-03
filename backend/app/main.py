from fastapi import FastAPI

app = FastAPI(
    title="ReguTrack API",
    description="Intelligent Regulatory Reporting & Compliance Risk Monitoring System",
    version="1.0.0"
)


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