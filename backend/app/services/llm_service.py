import os

from dotenv import load_dotenv
from groq import Groq


load_dotenv()


client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


def generate_compliance_explanation(
    validation_result,
    risk_result
):
    errors = validation_result.get("errors", [])
    warnings = validation_result.get("warnings", [])

    risk_score = risk_result.get("risk_score", 0)
    risk_level = risk_result.get("risk_level", "Low")

    prompt = f"""
You are the AI Compliance Assistant inside ReguTrack,
an intelligent regulatory reporting and compliance
risk monitoring system.

Your task is to analyze the validation findings and
provide a clear, accurate, professional compliance
explanation for the user.

IMPORTANT RULES:

1. The risk score is calculated ONLY by ReguTrack's
   deterministic rule-based risk engine.

2. DO NOT calculate the risk score yourself.

3. DO NOT modify, reinterpret, increase, decrease,
   or replace the provided risk score.

4. DO NOT modify the provided risk level.

5. Always use the EXACT risk score and risk level
   provided below.

6. Base your response ONLY on the validation findings
   provided below.

7. Do not invent laws, regulations, penalties,
   regulatory requirements, deadlines, or other facts
   that are not present in the input.

8. Do not claim that the report violates a specific
   regulation unless that information is explicitly
   provided.

9. Never use the word "critical" to describe the report,
   errors, issues, problems, or data quality when the
   provided risk level is not "Critical".

10. If the risk level is "Medium", use terms such as
    "significant", "important", or "notable".

11. If the risk level is "High", explain that substantial
    issues require corrective action.

12. Use "Critical" only when the provided risk level is
    exactly "Critical".

13. Do not claim that the report is legally compliant or
    non-compliant unless the provided information directly
    supports that conclusion.

14. Do not invent missing information.

15. Keep the explanation understandable for a user who
    may not have a technical background.

PROVIDED RISK RESULT:

Risk Score: {risk_score}/100
Risk Level: {risk_level}


DETECTED ERRORS:

{errors}


DETECTED WARNINGS:

{warnings}


You MUST provide your response using EXACTLY these
four sections:

1. Compliance Summary

Explain:
- The overall condition of the uploaded report.
- The main data-quality issues detected.
- The exact risk score and risk level.
- Why the detected findings resulted in this risk level.

2. Important Errors and Warnings

List the important detected issues.

For each issue:
- Clearly state what the issue is.
- Mention the affected column when available.
- Mention the affected row when available.
- Briefly explain why the issue matters.

3. Recommended Corrective Actions

Provide practical actions based ONLY on the detected
errors and warnings.

Use numbered recommendations.

For example:

1. Correct the invalid date.
2. Fill the missing financial value.
3. Remove duplicate records.
4. Review invalid numerical values.

Do not recommend actions unrelated to the detected findings.

4. Final Conclusion

Provide a short conclusion that:
- Summarizes the current data-quality condition.
- States the exact risk score and risk level.
- Explains what should be corrected before the report
  is considered ready for further processing.

FORMAT REQUIREMENTS:

- Always include all four sections.
- Never omit a section.
- Use the exact section titles.
- Use bullet points for issues where appropriate.
- Use numbered points for corrective actions.
- Use simple professional English.
- Do not use Markdown heading symbols such as #.
- Do not return only one paragraph.
- Do not repeat the entire input data unnecessarily.
- Do not use excessive technical terminology.
- Keep the response detailed enough for a professional
  compliance dashboard.
- Do not add any fifth section.
"""


    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a professional AI compliance "
                    "analysis assistant for ReguTrack. "
                    "Follow the user's requested four-section "
                    "format exactly. Never override the "
                    "deterministic risk score or risk level."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.1,
        max_tokens=1200
    )


    return response.choices[0].message.content