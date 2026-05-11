# from __future__ import annotations

# import json
# import logging
# from typing import Any, AsyncGenerator, Dict

# from typing_extensions import override

# from google.adk.agents import BaseAgent
# from google.adk.agents.invocation_context import InvocationContext
# from google.adk.events import Event, EventActions
# from google.genai import types

# from shopping_agent.tools.cross_encoder_reranker import (
#     rerank_product_cards_cross_encoder,
# )


# logger = logging.getLogger(__name__)


# class CrossEncoderRerankingAgent(BaseAgent):
#     """
#     Non-LLM reranking agent.

#     Uses a cross-encoder model to score query-product pairs.
#     This is similar to RAG reranking, but applied to ecommerce product cards.
#     """

#     @override
#     async def _run_async_impl(
#         self,
#         ctx: InvocationContext,
#     ) -> AsyncGenerator[Event, None]:
#         logger.info("[%s] Starting cross-encoder reranking.", self.name)

#         planner_output = ctx.session.state.get("planner_output", {})
#         verification_output = ctx.session.state.get("verification_output", {})

#         reranking_output: Dict[str, Any] = rerank_product_cards_cross_encoder(
#             planner_json=planner_output,
#             verified_products_json=verification_output,
#             max_results=30,
#             cross_encoder_weight=0.75,
#             browser_relevance_weight=0.15,
#             constraint_weight=0.10,
#         )

#         num_ranked = len(reranking_output.get("ranked_products", []))

#         logger.info("[%s] Reranked %d products.", self.name, num_ranked)

#         yield Event(
#             author=self.name,
#             actions=EventActions(
#                 state_delta={
#                     "reranking_output": reranking_output,
#                 }
#             ),
#             content=types.Content(
#                 role="model",
#                 parts=[
#                     types.Part(
#                         text=json.dumps(
#                             {
#                                 "status": "cross_encoder_reranking_completed",
#                                 "ranking_policy": reranking_output.get(
#                                     "ranking_policy",
#                                     "cross_encoder_v1",
#                                 ),
#                                 "cross_encoder_model": reranking_output.get(
#                                     "cross_encoder_model"
#                                 ),
#                                 "num_ranked_products": num_ranked,
#                             },
#                             ensure_ascii=False,
#                         )
#                     )
#                 ],
#             ),
#         )


# reranking_agent = CrossEncoderRerankingAgent(
#     name="CrossEncoderRerankingAgent",
#     description=(
#         "Deterministically reranks verified products using a cross-encoder "
#         "semantic relevance model plus constraint-aware business scoring. "
#         "This agent makes no LLM calls."
#     ),
# )



from __future__ import annotations

import json
import logging
from typing import Any, AsyncGenerator, Dict

from typing_extensions import override

from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions
from google.genai import types

from shopping_agent.tools.cross_encoder_reranker import (
    rerank_product_cards_cross_encoder,
)


logger = logging.getLogger(__name__)


class CrossEncoderRerankingAgent(BaseAgent):
    """
    Non-LLM reranking agent.

    Reads:
      - planner_output
      - web_discovery_output

    Writes:
      - reranking_output

    This agent performs semantic query-product reranking using a cross-encoder.
    """

    @override
    async def _run_async_impl(
        self,
        ctx: InvocationContext,
    ) -> AsyncGenerator[Event, None]:
        planner_output = ctx.session.state.get("planner_output", {})
        web_discovery_output = ctx.session.state.get("web_discovery_output", {})

        logger.info("[%s] Starting cross-encoder reranking.", self.name)

        reranking_output: Dict[str, Any] = rerank_product_cards_cross_encoder(
            planner_json=planner_output,
            candidate_products_json=web_discovery_output,
            max_results=20,
            cross_encoder_weight=0.82,
            constraint_weight=0.18,
        )

        num_ranked = len(reranking_output.get("ranked_products", []))

        logger.info("[%s] Reranked %d products.", self.name, num_ranked)

        yield Event(
            author=self.name,
            actions=EventActions(
                state_delta={
                    "reranking_output": reranking_output,
                }
            ),
            content=types.Content(
                role="model",
                parts=[
                    types.Part(
                        text=json.dumps(
                            {
                                "status": "cross_encoder_reranking_completed",
                                "num_ranked_products": num_ranked,
                                "ranking_policy": reranking_output.get(
                                    "ranking_policy"
                                ),
                                "cross_encoder_model": reranking_output.get(
                                    "cross_encoder_model"
                                ),
                                "notes": reranking_output.get("notes", []),
                            },
                            ensure_ascii=False,
                        )
                    )
                ],
            ),
        )


reranking_agent = CrossEncoderRerankingAgent(
    name="CrossEncoderRerankingAgent",
    description=(
        "Reranks high-recall ecommerce candidates using a cross-encoder. "
        "This agent makes no LLM calls."
    ),
)