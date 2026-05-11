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

from google.adk.agents.llm_agent import LlmAgent

from shopping_agent.tools.browserbase_product_browser import browse_products_with_browserbase


MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")


web_discovery_agent = LlmAgent(
    name="WebDiscoveryAgent",
    model=MODEL,
    description="Uses Browserbase to browse ecommerce sites and retrieve live product cards.",
    instruction="""
You are the Web Discovery Agent.

Input planner JSON:
{planner_output}

Your task:
1. Read browser_query from the planner JSON.
2. Read country from constraints.country.
3. Call browse_products_with_browserbase.
4. Use max_results=20 and max_product_pages=24.
5. Do not invent product URLs, images, prices, titles, or descriptions.
6. Return only JSON with this schema:
{
  "products": [
    {
      "title": "...",
      "description": "...",
      "price_text": "...",
      "product_url": "...",
      "image_url": "...",
      "source_site": "...",
      "category": "...",
      "relevance_score": 0,
      "why_it_matches": "..."
    }
  ],
  "notes": []
}

Important:
- Products must come from the tool result.
- If the tool returns no products, return products=[] and include the tool notes.
""",
    tools=[browse_products_with_browserbase],
    output_key="web_discovery_output",
)