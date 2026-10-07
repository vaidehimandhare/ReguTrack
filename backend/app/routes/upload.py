from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import os
import shutil
import pandas as pd

from app.dependencies import get_current_user
from app.services.file_processor import process_file
from app.services.validation_engine import validate_report
from app.services.risk_engine import calculate_risk
from app.services.llm_service import generate_compliance_explanation
from app.database import SessionLocal
from app.models.report import Report


router = APIRouter()

UPLOAD_DIR = "uploads"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


@router.post("/upload-report")
async def upload_report(
    file: UploadFile = File(...),
    current_user: int = Depends(get_current_user)
):

    allowed_extensions = [
        ".pdf",
        ".csv",
        ".xlsx"
    ]

    filename = file.filename

    extension = os.path.splitext(
        filename
    )[1].lower()

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=(
                "Only PDF, CSV and XLSX "
                "files are supported."
            )
        )

    file_path = os.path.join(
        UPLOAD_DIR,
        filename
    )

    with open(
        file_path,
        "wb"
    ) as buffer:

        shutil.copyfileobj(
            file.file,
            buffer
        )

    try:

        # ------------------------------------------------
        # Step 1: Process uploaded file
        # ------------------------------------------------

        result = process_file(
            file_path
        )

        validation_result = None
        risk_result = None
        ai_explanation = None

        # ------------------------------------------------
        # Step 2: Validate CSV / Excel
        # ------------------------------------------------

        if result["file_type"] in [
            "CSV",
            "Excel"
        ]:

            df = pd.DataFrame(
                result["rows"]
            )

            validation_result = validate_report(
                df
            )

            risk_result = calculate_risk(
                validation_result
            )

            ai_explanation = generate_compliance_explanation(
                validation_result,
                risk_result
            )

        # ------------------------------------------------
        # Step 2B: Validate PDF
        # ------------------------------------------------

        elif result["file_type"] == "PDF":

            pdf_rows = result.get(
                "rows",
                []
            )

            pdf_columns = result.get(
                "columns",
                []
            )

            # --------------------------------------------
            # PDF has no structured table data
            # --------------------------------------------

            if not pdf_rows:

                validation_result = {

                    "errors": [

                        {
                            "type": "empty_pdf",

                            "severity": "ERROR",

                            "message": (
                                "No structured table "
                                "data could be extracted "
                                "from the PDF."
                            )
                        }

                    ],

                    "warnings": [],

                    "document_info": {

                        "page_count": result.get(
                            "page_count",
                            0
                        ),

                        "table_count": result.get(
                            "table_count",
                            0
                        )

                    }

                }

            # --------------------------------------------
            # PDF contains table data
            # --------------------------------------------

            else:

                df = pd.DataFrame(
                    pdf_rows
                )

                validation_result = validate_report(
                    df
                )

                validation_result[
                    "document_info"
                ] = {

                    "page_count": result.get(
                        "page_count",
                        0
                    ),

                    "table_count": result.get(
                        "table_count",
                        0
                    ),

                    "columns": pdf_columns,

                    "row_count": len(df)

                }

            # --------------------------------------------
            # Calculate PDF risk
            # --------------------------------------------

            risk_result = calculate_risk(
                validation_result
            )

            # --------------------------------------------
            # Generate AI explanation
            # --------------------------------------------

            ai_explanation = generate_compliance_explanation(
                validation_result,
                risk_result
            )

        # ------------------------------------------------
        # Step 3: Save report in PostgreSQL
        # ------------------------------------------------

        db = SessionLocal()

        try:

            report = Report(

                user_id=current_user,

                filename=filename,

                file_type=result[
                    "file_type"
                ],

                status="processed",

                risk_score=(
                    risk_result[
                        "risk_score"
                    ]
                    if risk_result
                    else 0
                ),

                risk_level=(
                    risk_result[
                        "risk_level"
                    ]
                    if risk_result
                    else "Low"
                ),

                validation_result=(
                    str(validation_result)
                    if validation_result
                    else None
                ),

                ai_explanation=(
                    ai_explanation
                    if ai_explanation
                    else None
                )

            )

            db.add(
                report
            )

            db.commit()

            db.refresh(
                report
            )

        finally:

            db.close()

        # ------------------------------------------------
        # Step 4: Return response
        # ------------------------------------------------

        return {

            "message": (
                "Report uploaded successfully"
            ),

            "report_id": report.id,

            "filename": filename,

            "file_type": result[
                "file_type"
            ],

            "data": result,

            "validation": validation_result,

            "risk": risk_result,

            "ai_compliance_assistant": (
                ai_explanation
            )

        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Error processing file: {str(e)}"
            )
        )


# ========================================================
# GET ALL REPORTS
# ========================================================

@router.get("/reports")
def get_reports(
    current_user: int = Depends(
        get_current_user
    )
):

    db = SessionLocal()

    try:

        reports = (
            db.query(Report)
            .filter(
                Report.user_id == current_user
            )
            .order_by(
                Report.created_at.desc()
            )
            .all()
        )

        return {

            "reports": [

                {

                    "id": report.id,

                    "filename": report.filename,

                    "file_type": report.file_type,

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


# ========================================================
# GET REPORT DETAILS
# ========================================================

@router.get("/reports/{report_id}")
def get_report_details(

    report_id: int,

    current_user: int = Depends(
        get_current_user
    )

):

    db = SessionLocal()

    try:

        report = (
            db.query(Report)
            .filter(
                Report.id == report_id,
                Report.user_id == current_user
            )
            .first()
        )

        if not report:

            raise HTTPException(
                status_code=404,
                detail="Report not found"
            )

        return {

            "id": report.id,

            "filename": report.filename,

            "file_type": report.file_type,

            "status": report.status,

            "risk_score": report.risk_score,

            "risk_level": report.risk_level,

            "validation_result": (
                report.validation_result
            ),

            "ai_explanation": (
                report.ai_explanation
            ),

            "created_at": report.created_at

        }

    finally:

        db.close()


# ========================================================
# DELETE REPORT
# ========================================================

@router.delete("/reports/{report_id}")
def delete_report(

    report_id: int,

    current_user: int = Depends(
        get_current_user
    )

):

    db = SessionLocal()

    try:

        report = (
            db.query(Report)
            .filter(
                Report.id == report_id,
                Report.user_id == current_user
            )
            .first()
        )

        if not report:

            raise HTTPException(
                status_code=404,
                detail="Report not found"
            )

        file_path = os.path.join(
            UPLOAD_DIR,
            report.filename
        )

        if os.path.exists(
            file_path
        ):

            os.remove(
                file_path
            )

        db.delete(
            report
        )

        db.commit()

        return {

            "message": (
                "Report deleted successfully"
            ),

            "report_id": report_id

        }

    finally:

        db.close()