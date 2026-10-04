import os
import pandas as pd
import pdfplumber


def process_file(file_path: str):
    """
    Process PDF, CSV, or Excel files
    and return extracted data in a common format.
    """

    extension = os.path.splitext(file_path)[1].lower()

    # CSV
    if extension == ".csv":
        df = pd.read_csv(file_path)

        # Convert NaN values to None
        df = df.astype(object).where(pd.notna(df), None)

        return {
            "file_type": "CSV",
            "columns": df.columns.tolist(),
            "rows": df.to_dict(orient="records"),
            "row_count": len(df)
        }

    # Excel
    elif extension == ".xlsx":
        df = pd.read_excel(file_path)

        # Convert NaN values to None
        df = df.astype(object).where(pd.notna(df), None)

        return {
            "file_type": "Excel",
            "columns": df.columns.tolist(),
            "rows": df.to_dict(orient="records"),
            "row_count": len(df)
        }

    # PDF
    elif extension == ".pdf":
        text = ""

        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()

                if page_text:
                    text += page_text + "\n"

            page_count = len(pdf.pages)

        return {
            "file_type": "PDF",
            "text": text,
            "page_count": page_count
        }

    else:
        raise ValueError(
            "Unsupported file type. Please upload PDF, CSV, or XLSX."
        )