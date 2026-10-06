from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import os
import shutil
import pandas as pd

from app.dependencies import get_current_user
from app.services.file_processor import process_file
from app.services.validation_engine import validate_report
from app.services.risk_engine import calculate_risk
from app.database import SessionLocal
from app.models.report import Report


router = APIRouter()

UPLOAD_DIR = "uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload-report")
async def upload_report(
    file: UploadFile = File(...),
    current_user: int = Depends(get_current_user)
):

    # Allowed file types
    allowed_extensions = [".pdf", ".csv", ".xlsx"]

    filename = file.filename
    extension = os.path.splitext(filename)[1].lower()

    # Check file extension
    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, CSV and XLSX files are supported."
        )

    # Save uploaded file
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:

        # Process uploaded file
        result = process_file(file_path)

        validation_result = None
        risk_result = None

        # Validation and risk calculation for CSV/Excel
        if result["file_type"] in ["CSV", "Excel"]:

            # Convert processed rows into DataFrame
            df = pd.DataFrame(result["rows"])

            # Run validation engine
            validation_result = validate_report(df)

            # Calculate compliance risk
            risk_result = calculate_risk(validation_result)

        # Save report to database
        db = SessionLocal()

        try:

            report = Report(
                user_id=current_user,
                filename=filename,
                status="processed",
                risk_score=(
                    risk_result["risk_score"]
                    if risk_result
                    else 0
                ),
                risk_level=(
                    risk_result["risk_level"]
                    if risk_result
                    else "Low"
                )
            )

            db.add(report)
            db.commit()
            db.refresh(report)

        finally:
            db.close()

        return {
            "message": "Report uploaded successfully",
            "report_id": report.id,
            "filename": filename,
            "file_type": result["file_type"],
            "data": result,
            "validation": validation_result,
            "risk": risk_result
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )


@router.get("/reports")
def get_reports(
    current_user: int = Depends(get_current_user)
):

    db = SessionLocal()

    try:

        reports = db.query(Report).filter(
            Report.user_id == current_user
        ).order_by(
            Report.created_at.desc()
        ).all()

        return {
            "reports": [
                {
                    "id": report.id,
                    "filename": report.filename,
                    "status": report.status,
                    "risk_score": report.risk_score,
                    "risk_level": report.risk_level,
                    "created_at": report.created_at
                }
                for report in reports
            ]
        }

    finally:
        db.close()


@router.get("/reports/{report_id}")
def get_report_details(
    report_id: int,
    current_user: int = Depends(get_current_user)
):

    db = SessionLocal()

    try:

        report = db.query(Report).filter(
            Report.id == report_id,
            Report.user_id == current_user
        ).first()

        if not report:
            raise HTTPException(
                status_code=404,
                detail="Report not found"
            )

        return {
            "id": report.id,
            "filename": report.filename,
            "status": report.status,
            "risk_score": report.risk_score,
            "risk_level": report.risk_level,
            "created_at": report.created_at
        }

    finally:
        db.close()