import pandas as pd


REQUIRED_COLUMNS = [
    "company",
    "report_date",
    "revenue",
    "expenses"
]


def validate_report(df: pd.DataFrame):
    errors = []
    warnings = []

    # 1. Missing mandatory columns
    for column in REQUIRED_COLUMNS:
        if column not in df.columns:
            errors.append({
                "type": "missing_column",
                "severity": "ERROR",
                "column": column,
                "message": f"Required column '{column}' is missing"
            })

    # Cannot perform remaining structured checks
    # if mandatory columns are missing.
    if errors:
        return {
            "errors": errors,
            "warnings": warnings
        }

    # 2. Missing values
    for column in REQUIRED_COLUMNS:
        missing_rows = df[df[column].isna()].index

        for row in missing_rows:
            errors.append({
                "type": "missing_value",
                "severity": "ERROR",
                "column": column,
                "row": int(row) + 1,
                "message": f"Missing value in '{column}'"
            })

    # 3. Invalid dates
    converted_dates = pd.to_datetime(
        df["report_date"],
        errors="coerce"
    )

    for row in df[converted_dates.isna()].index:
        errors.append({
            "type": "invalid_date",
            "severity": "ERROR",
            "column": "report_date",
            "row": int(row) + 1,
            "message": "Invalid date format"
        })

    # 4. Invalid numerical values
    for column in ["revenue", "expenses"]:

        converted_values = pd.to_numeric(
            df[column],
            errors="coerce"
        )

        for row in df[converted_values.isna()].index:
            errors.append({
                "type": "invalid_number",
                "severity": "ERROR",
                "column": column,
                "row": int(row) + 1,
                "message": f"Invalid numerical value in '{column}'"
            })

    # 5. Duplicate records
    duplicate_rows = df[df.duplicated(keep=False)]

    for row in duplicate_rows.index:
        errors.append({
            "type": "duplicate_record",
            "severity": "ERROR",
            "row": int(row) + 1,
            "message": "Duplicate record detected"
        })

    # Convert numeric columns for business-rule checks
    revenue = pd.to_numeric(
        df["revenue"],
        errors="coerce"
    )

    expenses = pd.to_numeric(
        df["expenses"],
        errors="coerce"
    )

    # 9. Negative / invalid ranges
    for column, values in {
        "revenue": revenue,
        "expenses": expenses
    }.items():

        for row in df[values < 0].index:
            errors.append({
                "type": "invalid_range",
                "severity": "ERROR",
                "column": column,
                "row": int(row) + 1,
                "message": f"Negative value found in '{column}'"
            })

    # 10. Cross-field consistency
    for row in df.index:

        if pd.notna(revenue.loc[row]) and pd.notna(expenses.loc[row]):

            if expenses.loc[row] > revenue.loc[row]:
                warnings.append({
                    "type": "cross_field_warning",
                    "severity": "WARNING",
                    "row": int(row) + 1,
                    "message": "Expenses exceed revenue"
                })

    # 11. Total / calculation consistency
    calculated_profit = revenue - expenses

    for row in df.index:

        if (
            pd.notna(revenue.loc[row])
            and pd.notna(expenses.loc[row])
            and calculated_profit.loc[row] < 0
        ):
            warnings.append({
                "type": "calculation_warning",
                "severity": "WARNING",
                "row": int(row) + 1,
                "message": "Calculated profit is negative"
            })

    # 12. Unusual changes / anomalies
    if len(df) > 1:

        revenue_changes = revenue.pct_change()

        for row in revenue_changes.index:

            if (
                pd.notna(revenue_changes.loc[row])
                and abs(revenue_changes.loc[row]) > 1.0
            ):
                warnings.append({
                    "type": "unusual_change",
                    "severity": "WARNING",
                    "row": int(row) + 1,
                    "message": "Revenue changed by more than 100% compared with the previous record"
                })

    return {
        "errors": errors,
        "warnings": warnings
    }