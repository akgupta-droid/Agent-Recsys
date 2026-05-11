from google.adk.agents.sequential_agent import SequentialAgent

from shopping_agent.planner_agent import planner_agent
from shopping_agent.web_discovery_agent import web_discovery_agent
from shopping_agent.verification_agent import verification_agent
from shopping_agent.reranking_agent import reranking_agent
from shopping_agent.bundle_planner_agent import bundle_planner_agent
from shopping_agent.critic_agent import critic_agent


root_agent = SequentialAgent(
    name="ShoppingRecommendationPipeline",
    description=(
        "A rigorous ecommerce recommendation pipeline that plans the task, "
        "browses live product pages using Browserbase, verifies product cards, "
        "reranks candidates, builds bundles, and applies final guardrails."
    ),
    sub_agents=[
        planner_agent,
        web_discovery_agent,
        verification_agent,
        reranking_agent,
        bundle_planner_agent,
       # critic_agent,
    ],
)