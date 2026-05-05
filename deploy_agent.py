import os
import vertexai
from vertexai import agent_engines
from vertexai.preview import reasoning_engines

from shopping_agent.agent import root_agent
from shopping_agent.config import settings


def main():
    client = vertexai.Client(
        project=settings.GOOGLE_CLOUD_PROJECT,
        location=settings.GOOGLE_CLOUD_LOCATION,
    )

    app = agent_engines.AdkApp(agent=root_agent)

    remote_agent = client.agent_engines.create(
        agent=app,
        config={
            "requirements": [
                "cloudpickle",
                "google-cloud-aiplatform[agent_engines,adk]>=1.112",
                "google-adk",
                "google-genai",
                "browserbase",
                "playwright",
                "pydantic",
                "python-dotenv",
                "requests",
                "beautifulsoup4",
                "tldextract",
            ],
            "extra_packages": [
                "./shopping_agent",
            ],
            "env_vars": {
                "BROWSERBASE_API_KEY": settings.BROWSERBASE_API_KEY,
                "GEMINI_MODEL": settings.GEMINI_MODEL,
                "DEFAULT_COUNTRY": settings.DEFAULT_COUNTRY,
            },
            "staging_bucket": settings.GCS_STAGING_BUCKET,
            "identity_type": "AGENT_IDENTITY",
        },
    )

    print("Deployed remote agent:")
    # print(remote_agent)


if __name__ == "__main__":
    main()