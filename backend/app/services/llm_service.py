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

Provide:

1. Compliance summary
2. Important errors and warnings
3. Recommended corrective actions
4. Final conclusion

Use simple and professional language.

Do not invent regulations or facts that are not present
in the provided data.
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a professional AI compliance "
                    "assistant."
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