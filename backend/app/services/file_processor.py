import os
import pandas as pd
import pdfplumber


def process_file(file_path: str):

    extension = os.path.splitext(
        file_path
    )[1].lower()

    # ==================================================
    # CSV
    # ==================================================

    if extension == ".csv":

        df = pd.read_csv(
            file_path
        )

        df = df.astype(object).where(
            pd.notna(df),
            None
        )

        return {
            "file_type": "CSV",
            "columns": df.columns.tolist(),
            "rows": df.to_dict(
                orient="records"
            ),
            "row_count": len(df)
        }

    # ==================================================
    # EXCEL
    # ==================================================

    elif extension == ".xlsx":

        df = pd.read_excel(
            file_path
        )

        df = df.astype(object).where(
            pd.notna(df),
            None
        )

        return {
            "file_type": "Excel",
            "columns": df.columns.tolist(),
            "rows": df.to_dict(
                orient="records"
            ),
            "row_count": len(df)
        }

    # ==================================================
    # PDF
    # ==================================================

    elif extension == ".pdf":

        text = ""
        tables = []

        with pdfplumber.open(
            file_path
        ) as pdf:

            page_count = len(
                pdf.pages
            )

            for page in pdf.pages:

                # --------------------------------------
                # Extract text
                # --------------------------------------

                page_text = page.extract_text()

                if page_text:

                    text += (
                        page_text + "\n"
                    )

                # --------------------------------------
                # Extract tables
                # --------------------------------------

                page_tables = (
                    page.extract_tables()
                )

                if page_tables:

                    for table in page_tables:

                        if table:

                            tables.append(
                                table
                            )

        # ==================================================
        # Convert PDF tables into rows
        # ==================================================

        extracted_rows = []
        extracted_columns = []

        for table in tables:

            if len(table) < 2:
                continue

            header = table[0]

            if not header:
                continue

            # ----------------------------------------------
            # Clean column names
            # ----------------------------------------------

            cleaned_header = []

            for column in header:

                if column is None:

                    cleaned_header.append("")

                else:

                    cleaned_header.append(
                        str(column)
                        .strip()
                        .lower()
                    )

            # ----------------------------------------------
            # Remove empty columns
            # ----------------------------------------------

            valid_indexes = [
                index
                for index, column
                in enumerate(
                    cleaned_header
                )
                if column
            ]

            if not valid_indexes:
                continue

            cleaned_header = [
                cleaned_header[index]
                for index in valid_indexes
            ]

            extracted_columns = (
                cleaned_header
            )

            # ----------------------------------------------
            # Extract rows
            # ----------------------------------------------

            for row in table[1:]:

                if not row:
                    continue

                cleaned_row = []

                for index in valid_indexes:

                    if index < len(row):

                        value = row[index]

                        if value is not None:

                            value = str(
                                value
                            ).strip()

                        cleaned_row.append(
                            value
                        )

                    else:

                        cleaned_row.append(
                            None
                        )

                # Ignore completely empty rows

                if any(
                    value not in [None, ""]
                    for value in cleaned_row
                ):

                    extracted_rows.append(
                        cleaned_row
                    )

        # ==================================================
        # Convert rows into dictionaries
        # ==================================================

        rows = []

        for row in extracted_rows:

            row_dict = {}

            for index, column in enumerate(
                extracted_columns
            ):

                if index < len(row):

                    row_dict[column] = (
                        row[index]
                    )

            rows.append(
                row_dict
            )

        # ==================================================
        # Return PDF result
        # ==================================================

        return {
            "file_type": "PDF",
            "text": text,
            "page_count": page_count,
            "columns": extracted_columns,
            "rows": rows,
            "row_count": len(rows),
            "table_count": len(tables)
        }

    # ==================================================
    # Unsupported file
    # ==================================================

    else:

        raise ValueError(
            "Unsupported file type. "
            "Please upload PDF, CSV, or XLSX."
        )