import asyncio
import vertexai
from vertexai import agent_engines
from shopping_agent.agent import root_agent
from shopping_agent.config import settings

async def main():
    vertexai.init(
        project=settings.GOOGLE_CLOUD_PROJECT,
        location=settings.GOOGLE_CLOUD_LOCATION,
    )
    app = agent_engines.AdkApp(agent=root_agent)

    async for event in app.async_stream_query(
        user_id="test_user_001",
        message=(
            "Create a Japandi living room bundle under $800 with a coffee table, "
            "rug, floor lamp, and wall decor. Prefer natural wood, beige, and black accents."
        ),
    ):
        print(event)

async def test_csv_integration():
    print("\n--- Testing CSV Integration ---")
    csv_file_path = "shopping_agent/data/browserbase_results_final_with_ho_05.csv"
    
    # Ensure the environment variables for Browserbase and Gemini are set for this direct call
    # In a real scenario, these would likely be set in the environment or config.
    import os
    os.environ["BROWSERBASE_API_KEY"] = os.environ.get("BROWSERBASE_API_KEY", "YOUR_BROWSERBASE_API_KEY") # Replace with actual key or ensure env is set
    os.environ["GEMINI_MODEL"] = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    result = await browse_products_with_browserbase(
        query="modern minimalist fabric sofa",
        country="US",
        max_results=5,
        csv_data_path=csv_file_path,
    )
    print("\n[CSV Integration Test Results]")
    print(result)


if __name__ == "__main__":
    asyncio.run(main())
    asyncio.run(test_csv_integration())