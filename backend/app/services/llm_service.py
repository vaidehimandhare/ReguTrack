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

    prompt = f"""
You are an AI Compliance Assistant for ReguTrack.

Analyze the following report validation results.

Validation Results:
{validation_result}

Risk Result:
{risk_result}

Important instructions:

- The risk score and risk level are calculated by ReguTrack's
  deterministic risk engine.
- Do NOT recalculate or change the risk score.
- Always use the exact risk level provided in Risk Result.
- Do not call issues "critical" unless the provided risk level
  is "Critical".
- Do not invent regulations, laws, penalties, or facts.
- Base your explanation only on the provided validation results.

Provide the response in this structure:

1. Compliance Summary
2. Important Errors and Warnings
3. Recommended Corrective Actions
4. Final Conclusion

Use simple, professional language.
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a professional AI compliance "
                    "assistant for a regulatory reporting system."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2
    )

    return response.choices[0].message.content