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


if __name__ == "__main__":
    asyncio.run(main())