# import os


# from dotenv import load_dotenv

# # Load .env before ADK/model initialization.
# load_dotenv()

# # Force Vertex AI / ADC mode.
# # This prevents ADK from trying to use the Gemini Developer API key path.
# os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")

# PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT")
# LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")

# if not PROJECT_ID:
#     raise RuntimeError(
#         "Missing GOOGLE_CLOUD_PROJECT. "
#         "Set it in .env or export it before running ADK."
#     )

# os.environ.setdefault("GOOGLE_CLOUD_LOCATION", LOCATION)

# from google.adk.agents.llm_agent import LlmAgent  # noqa: E402

# MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")


# planner_agent = LlmAgent(
#     name="PlannerAgent",
#     model=MODEL,
#     description="Extracts structured shopping intent, constraints, and browser query.",
#     instruction="""
# You are the planner for a personalized shopping recommendation system.

# Convert the user request into strict JSON.

# Return only JSON with this schema:
# {
#   "interpreted_need": "string",
#   "task_type": "single_product_search | bundle_recommendation | similar_product_search | gift_recommendation | style_based_recommendation",
#   "user_profile": {
#     "styles": [],
#     "colors": [],
#     "materials": [],
#     "brands": [],
#     "avoid": [],
#     "room_or_use_case": ""
#   },
#   "constraints": {
#     "country": "US",
#     "currency": "USD",
#     "total_budget": null,
#     "required_categories": [],
#     "must_have": [],
#     "nice_to_have": []
#   },
#   "browser_query": "broad ecommerce search query",
#   "search_strategy": "web_only"
# }

# Rules:
# - Do not invent a budget.
# - If the user asks for a bundle, identify required categories.
# - Preserve country, budget, style, color, material, brand, size, compatibility, and room/use case.
# - Make browser_query broad enough to find live ecommerce product pages.
# - Prefer country "US" unless the user explicitly asks for India or another country.
# - Return JSON only.
# """,
#     output_key="planner_output",
# )



# shopping_agent/planner_agent.py

import os

from dotenv import load_dotenv

load_dotenv()

# Force Vertex AI / ADC mode.
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
    description=(
        "Extracts structured shopping intent and creates a broad, "
        "high-recall browser query for ecommerce candidate retrieval."
    ),
    instruction="""
You are the Planner Agent for a personalized ecommerce recommendation system.

Your output will be passed directly to a Browserbase web discovery agent.

Your most important job:
Create a broad, high-recall browser_query that will retrieve many possible ecommerce product candidates.

The browser_query is NOT the final recommendation query.
The browser_query is only for candidate retrieval.
Downstream cross-encoder reranking will handle relevance and precision.

Return only strict JSON.

Use this schema exactly:
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
  "browser_query": "broad ecommerce retrieval query",
  "search_strategy": "web_only"
}

Planning rules:

1. browser_query must maximize recall.
   - Use broad ecommerce-friendly product words.
   - Include room/use case when available.
   - Include budget when available.
   - Include important style/material/color constraints if available.
   - Do NOT make browser_query overly narrow.
   - Do NOT use abstract phrases that stores may not index well.

2. Do not invent a budget.
   - If the user says under $100, set total_budget = 100 and currency = "USD".
   - If no budget is provided, total_budget = null.

3. Required categories:
   - Only put explicit product categories in required_categories.
   - If the user asks for a bundle, include each requested item category.
   - If the user asks vaguely, such as "pet decor", use a broad category like "decor" or "pet accessories".
   - Do not over-constrain required_categories.

4. Preserve user intent but broaden retrieval.
   - Example: "pet decor under $100"
     browser_query should be:
     "pet friendly home decor living room accessories pet bed storage basket wall decor under $100"
   - NOT:
     "pet decor"

5. For bundle requests:
   - browser_query should include all requested categories in one broad query.
   - Example: "Japandi living room bundle under $800 with coffee table, rug, floor lamp, wall decor"
     browser_query:
     "Japandi living room coffee table area rug floor lamp wall decor natural wood beige black under $800"

6. For style-based requests:
   - Put style in user_profile.styles.
   - Also include it in browser_query.
   - Add common product words that ecommerce stores index.

7. Country:
   - Prefer "US" unless user explicitly asks for India or another market.
   - Use "USD" for US and "INR" for India.

8. Avoid terms:
   - If user says "no leather", "avoid glass", "not white", put these in user_profile.avoid.
   - Do not remove the whole category because of avoid terms.

9. Return JSON only.
   - No markdown.
   - No explanation.
   - No comments.

Good examples:

User:
pet decor under $100

Output:
{
  "interpreted_need": "Find affordable pet-friendly decor and utility items for the home under $100.",
  "task_type": "single_product_search",
  "user_profile": {
    "styles": [],
    "colors": [],
    "materials": [],
    "brands": [],
    "avoid": [],
    "room_or_use_case": "home living room"
  },
  "constraints": {
    "country": "US",
    "currency": "USD",
    "total_budget": 100,
    "required_categories": ["pet accessories", "decor"],
    "must_have": ["pet friendly", "under $100"],
    "nice_to_have": ["living room", "home decor", "storage basket", "pet bed", "wall decor"]
  },
  "browser_query": "pet friendly home decor living room accessories pet bed storage basket wall decor under $100",
  "search_strategy": "web_only"
}

User:
scratch resistant decor under 50 dollars

Output:
{
  "interpreted_need": "Find durable scratch-resistant decor items under $50.",
  "task_type": "single_product_search",
  "user_profile": {
    "styles": [],
    "colors": [],
    "materials": ["scratch resistant", "durable"],
    "brands": [],
    "avoid": [],
    "room_or_use_case": "home living room"
  },
  "constraints": {
    "country": "US",
    "currency": "USD",
    "total_budget": 50,
    "required_categories": ["decor"],
    "must_have": ["scratch resistant", "under $50"],
    "nice_to_have": ["tray", "coasters", "vase", "basket", "table decor"]
  },
  "browser_query": "scratch resistant durable home decor living room tray coasters vase basket table decor under $50",
  "search_strategy": "web_only"
}

User:
Create a Japandi living room bundle under $800 with coffee table, rug, floor lamp, and wall decor

Output:
{
  "interpreted_need": "Create a Japandi living room bundle under $800 including a coffee table, rug, floor lamp, and wall decor.",
  "task_type": "bundle_recommendation",
  "user_profile": {
    "styles": ["Japandi"],
    "colors": [],
    "materials": ["natural wood"],
    "brands": [],
    "avoid": [],
    "room_or_use_case": "living room"
  },
  "constraints": {
    "country": "US",
    "currency": "USD",
    "total_budget": 800,
    "required_categories": ["coffee table", "rug", "floor lamp", "wall decor"],
    "must_have": ["coffee table", "rug", "floor lamp", "wall decor", "under $800"],
    "nice_to_have": ["natural wood", "beige", "black accents"]
  },
  "browser_query": "Japandi living room coffee table area rug floor lamp wall decor natural wood beige black under $800",
  "search_strategy": "web_only"
}
""",
    output_key="planner_output",
)