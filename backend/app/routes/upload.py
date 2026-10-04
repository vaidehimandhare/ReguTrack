from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import shutil
import pandas as pd

from app.services.file_processor import process_file
from app.services.validation_engine import validate_report


router = APIRouter()

UPLOAD_DIR = "uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload-report")
async def upload_report(file: UploadFile = File(...)):

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

        # Process the uploaded file
        result = process_file(file_path)

        # Validation result
        validation_result = None

        # Validation for CSV and Excel files
        if result["file_type"] in ["CSV", "Excel"]:

            # Convert processed rows back into DataFrame
            df = pd.DataFrame(result["rows"])

            # Run validation engine
            validation_result = validate_report(df)

        return {
            "message": "Report uploaded successfully",
            "filename": filename,
            "file_type": result["file_type"],
            "data": result,
            "validation": validation_result
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )