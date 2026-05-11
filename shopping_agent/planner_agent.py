import os


from dotenv import load_dotenv

# Load .env before ADK/model initialization.
load_dotenv()

# Force Vertex AI / ADC mode.
# This prevents ADK from trying to use the Gemini Developer API key path.
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT")
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")

if not PROJECT_ID:
    raise RuntimeError(
        "Missing GOOGLE_CLOUD_PROJECT. "
        "Set it in .env or export it before running ADK."
    )

os.environ.setdefault("GOOGLE_CLOUD_LOCATION", LOCATION)

from google.adk.agents.llm_agent import LlmAgent  # noqa: E402

MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")


planner_agent = LlmAgent(
    name="PlannerAgent",
    model=MODEL,
    description="Extracts structured shopping intent, constraints, and browser query.",
    instruction="""
You are the planner for a personalized shopping recommendation system.

Convert the user request into strict JSON.

Return only JSON with this schema:
{
  "interpreted_need": "string",
  "task_type": "single_product_search | bundle_recommendation | similar_product_search | gift_recommendation | style_based_recommendation",
  "user_profile": {
    "styles": [],
    "colors": [],
    "materials": [],
    "brands": [],
    "avoid": [],
    "room_or_use_case": ""
  },
  "constraints": {
    "country": "US",
    "currency": "USD",
    "total_budget": null,
    "required_categories": [],
    "must_have": [],
    "nice_to_have": []
  },
  "browser_query": "broad ecommerce search query",
  "search_strategy": "web_only"
}

Rules:
- Do not invent a budget.
- If the user asks for a bundle, identify required categories.
- Preserve country, budget, style, color, material, brand, size, compatibility, and room/use case.
- Make browser_query broad enough to find live ecommerce product pages.
- Prefer country "US" unless the user explicitly asks for India or another country.
- Return JSON only.
""",
    output_key="planner_output",
)