RISK_WEIGHTS = {
    "missing_column": 15,
    "missing_value": 15,
    "invalid_date": 10,
    "invalid_number": 10,
    "duplicate_record": 10,
    "invalid_range": 15,
    "cross_field_warning": 10,
    "calculation_warning": 10,
    "unusual_change": 15,
    "empty_pdf": 15
}


def calculate_risk(validation_result):
    """
    Calculate compliance risk score based on
    validation errors and warnings.
    """

    errors = validation_result.get(
        "errors",
        []
    )

    warnings = validation_result.get(
        "warnings",
        []
    )

    score = 0

    # ---------------------------------------------
    # Add points for validation errors
    # ---------------------------------------------

    for error in errors:

        issue_type = error.get(
            "type"
        )

        score += RISK_WEIGHTS.get(
            issue_type,
            5
        )

    # ---------------------------------------------
    # Add points for validation warnings
    # ---------------------------------------------

    for warning in warnings:

        issue_type = warning.get(
            "type"
        )

        score += RISK_WEIGHTS.get(
            issue_type,
            5
        )

    # ---------------------------------------------
    # Keep score between 0 and 100
    # ---------------------------------------------

    score = min(
        score,
        100
    )

    # ---------------------------------------------
    # Determine risk level
    # ---------------------------------------------

    if score <= 30:

        risk_level = "Low"

    elif score <= 60:

        risk_level = "Medium"

    elif score <= 80:

        risk_level = "High"

    else:

        risk_level = "Critical"

    # ---------------------------------------------
    # Return final risk result
    # ---------------------------------------------

    return {
        "risk_score": score,
        "risk_level": risk_level
    }