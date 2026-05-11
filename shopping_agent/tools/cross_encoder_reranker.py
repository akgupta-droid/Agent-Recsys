from __future__ import annotations

import json
import math
import os
import re
from functools import lru_cache
from typing import Any, Dict, List, Optional

import numpy as np
from sentence_transformers import CrossEncoder


DEFAULT_CROSS_ENCODER_MODEL = os.environ.get(
    "CROSS_ENCODER_MODEL",
    "cross-encoder/ms-marco-MiniLM-L6-v2",
)


PRICE_REGEX = re.compile(
    r"(?P<currency>₹|Rs\.?|INR|\$|USD|£|GBP|€|EUR)\s?"
    r"(?P<amount>[\d,]+(?:\.\d{1,2})?)",
    flags=re.IGNORECASE,
)


def _strip_json_fence(text: str) -> str:
    text = text.strip()
    match = re.search(
        r"```(?:json)?\s*(.*?)```",
        text,
        flags=re.DOTALL | re.IGNORECASE,
    )
    if match:
        return match.group(1).strip()
    return text


def _safe_json_loads(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return value

    if value is None:
        return {}

    text = str(value).strip()
    if not text:
        return {}

    text = _strip_json_fence(text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    object_match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if object_match:
        try:
            return json.loads(object_match.group(0))
        except json.JSONDecodeError:
            return {}

    return {}


def _extract_products(value: Any) -> List[Dict[str, Any]]:
    data = _safe_json_loads(value)

    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]

    if not isinstance(data, dict):
        return []

    for key in [
        "verified_products",
        "products",
        "recommended_products",
        "ranked_products",
        "final_products",
    ]:
        products = data.get(key)
        if isinstance(products, list):
            return [x for x in products if isinstance(x, dict)]

    return []


def _parse_price_amount(price_text: Optional[str]) -> Optional[float]:
    if not price_text:
        return None

    match = PRICE_REGEX.search(str(price_text))
    if not match:
        return None

    amount = match.group("amount").replace(",", "")

    try:
        return float(amount)
    except ValueError:
        return None


def _minmax(values: List[float]) -> List[float]:
    if not values:
        return []

    v_min = min(values)
    v_max = max(values)

    if math.isclose(v_min, v_max):
        return [0.5 for _ in values]

    return [(v - v_min) / (v_max - v_min) for v in values]


def _as_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(x) for x in value if str(x).strip()]
    if value:
        return [str(value)]
    return []


def build_cross_encoder_query(planner_json: Any) -> str:
    planner = _safe_json_loads(planner_json)

    if not isinstance(planner, dict):
        return ""

    profile = planner.get("user_profile", {}) or {}
    constraints = planner.get("constraints", {}) or {}

    parts = [
        planner.get("interpreted_need", ""),
        planner.get("browser_query", ""),
        profile.get("room_or_use_case", ""),
        "styles: " + ", ".join(_as_list(profile.get("styles"))),
        "colors: " + ", ".join(_as_list(profile.get("colors"))),
        "materials: " + ", ".join(_as_list(profile.get("materials"))),
        "brands: " + ", ".join(_as_list(profile.get("brands"))),
        "required categories: " + ", ".join(_as_list(constraints.get("required_categories"))),
        "must have: " + ", ".join(_as_list(constraints.get("must_have"))),
        "nice to have: " + ", ".join(_as_list(constraints.get("nice_to_have"))),
    ]

    budget = constraints.get("total_budget")
    currency = constraints.get("currency")

    if budget:
        parts.append(f"budget: under {budget} {currency or ''}")

    return " ".join(str(p) for p in parts if p).strip()


def product_to_cross_encoder_text(product: Dict[str, Any]) -> str:
    fields = [
        f"title: {product.get('title', '')}",
        f"category: {product.get('category', '')}",
        f"description: {product.get('description', '')}",
        f"price: {product.get('price_text', '')}",
        f"source: {product.get('source_site', '')}",
        f"why it matches: {product.get('why_it_matches', '')}",
    ]

    return " ".join(x for x in fields if x.strip())


@lru_cache(maxsize=1)
def get_cross_encoder_model() -> CrossEncoder:
    return CrossEncoder(DEFAULT_CROSS_ENCODER_MODEL)


def compute_constraint_bonus(
    planner_json: Any,
    product: Dict[str, Any],
) -> Dict[str, Any]:
    planner = _safe_json_loads(planner_json)

    if not isinstance(planner, dict):
        return {
            "bonus": 0.0,
            "reasons": [],
        }

    profile = planner.get("user_profile", {}) or {}
    constraints = planner.get("constraints", {}) or {}

    text = product_to_cross_encoder_text(product).lower()

    required_categories = [x.lower() for x in _as_list(constraints.get("required_categories"))]
    styles = [x.lower() for x in _as_list(profile.get("styles"))]
    colors = [x.lower() for x in _as_list(profile.get("colors"))]
    materials = [x.lower() for x in _as_list(profile.get("materials"))]
    avoid = [x.lower() for x in _as_list(profile.get("avoid"))]

    bonus = 0.0
    reasons: List[str] = []

    for category in required_categories:
        if category and category in text:
            bonus += 0.12
            reasons.append(f"category_match:{category}")

    for style in styles:
        if style and style in text:
            bonus += 0.08
            reasons.append(f"style_match:{style}")

    for color in colors:
        if color and color in text:
            bonus += 0.04
            reasons.append(f"color_match:{color}")

    for material in materials:
        if material and material in text:
            bonus += 0.04
            reasons.append(f"material_match:{material}")

    for term in avoid:
        if term and term in text:
            bonus -= 0.15
            reasons.append(f"avoid_penalty:{term}")

    if product.get("image_url"):
        bonus += 0.04
        reasons.append("has_image")

    if product.get("price_text"):
        bonus += 0.04
        reasons.append("has_price")

    budget = constraints.get("total_budget")
    price = _parse_price_amount(product.get("price_text"))

    if budget is not None and price is not None:
        try:
            if price <= float(budget):
                bonus += 0.05
                reasons.append("item_price_within_total_budget")
        except (TypeError, ValueError):
            pass

    return {
        "bonus": round(bonus, 4),
        "reasons": reasons,
    }


def rerank_product_cards_cross_encoder(
    planner_json: Any,
    verified_products_json: Any,
    max_results: int = 30,
    cross_encoder_weight: float = 0.75,
    browser_relevance_weight: float = 0.15,
    constraint_weight: float = 0.10,
) -> Dict[str, Any]:
    """
    Non-LLM cross-encoder reranker.

    This scores each pair:
        (structured user query, product text)

    Then combines:
        cross_encoder_score
        browserbase relevance score
        deterministic constraint bonus
    """
    query = build_cross_encoder_query(planner_json)
    products = _extract_products(verified_products_json)

    if not products:
        return {
            "ranked_products": [],
            "ranking_policy": "cross_encoder_v1",
            "notes": ["No verified products were available for reranking."],
        }

    if not query:
        query = "Find the best matching ecommerce products for the user."

    product_texts = [product_to_cross_encoder_text(p) for p in products]
    pairs = [[query, text] for text in product_texts]

    model = get_cross_encoder_model()
    raw_scores = model.predict(pairs)

    raw_scores = [float(x) for x in raw_scores]
    normalized_ce_scores = _minmax(raw_scores)

    browser_scores = [
        float(p.get("relevance_score") or 0.0) / 100.0
        for p in products
    ]

    ranked: List[Dict[str, Any]] = []

    for product, raw_ce, ce_norm, browser_score in zip(
        products,
        raw_scores,
        normalized_ce_scores,
        browser_scores,
    ):
        constraint_result = compute_constraint_bonus(planner_json, product)
        constraint_bonus = float(constraint_result["bonus"])

        final_score = (
            cross_encoder_weight * ce_norm
            + browser_relevance_weight * browser_score
            + constraint_weight * constraint_bonus
        )

        item = dict(product)
        item["cross_encoder_raw_score"] = round(raw_ce, 4)
        item["cross_encoder_score"] = round(ce_norm, 4)
        item["browser_relevance_score_norm"] = round(browser_score, 4)
        item["constraint_bonus"] = round(constraint_bonus, 4)
        item["final_score"] = round(final_score, 4)
        item["score_reasons"] = [
            f"cross_encoder_score={round(ce_norm, 4)}",
            f"browser_score={round(browser_score, 4)}",
            f"constraint_bonus={round(constraint_bonus, 4)}",
            *constraint_result["reasons"],
        ]

        ranked.append(item)

    ranked.sort(key=lambda x: x.get("final_score", 0), reverse=True)

    return {
        "ranked_products": ranked[:max_results],
        "ranking_policy": "cross_encoder_v1",
        "cross_encoder_model": DEFAULT_CROSS_ENCODER_MODEL,
        "query_used_for_reranking": query,
    }