# shopping_agent/tools/browserbase_product_browser.py
# ============================================================
# Browserbase + Gemini/Vertex Product Browsing Tool for ADK
#
# Purpose:
#   ADK tool used by the Web Discovery Agent to browse ecommerce
#   sites and return product cards with:
#   - product_url
#   - image_url
#   - title
#   - description
#   - price_text
#   - source_site
#   - category
#   - relevance_score
#
# Environment variables:
#   Required:
#     BROWSERBASE_API_KEY
#
#   Recommended for Gemini via Vertex AI / ADC:
#     GOOGLE_GENAI_USE_VERTEXAI=TRUE
#     GOOGLE_CLOUD_PROJECT=your-project-id
#     GOOGLE_CLOUD_LOCATION=us-central1
#
#   Optional:
#     GEMINI_MODEL=gemini-2.5-flash
# ============================================================

from __future__ import annotations

import asyncio
import json
import os
import re
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus, urlparse

from browserbase import Browserbase
from dotenv import load_dotenv
from google import genai
from playwright.async_api import (
    TimeoutError as PlaywrightTimeoutError,
    async_playwright,
)
from pydantic import BaseModel, Field, ValidationError


# ============================================================
# 1. Site configuration
# ============================================================

SITE_SEARCH_TEMPLATES: Dict[str, Dict[str, Any]] = {
    # ========================================================
    # Selected US furniture / decor stores
    # Avoided: Wayfair, Etsy, IKEA US, Target
    # Kept: West Elm, Amazon
    # Added: Article, Castlery, Rugs USA, Nathan James, World Market
    # ========================================================

    "west_elm": {
        "name": "West Elm",
        "search_url": "https://www.westelm.com/search/results.html?words={query}",
        "allowed_domains": ["westelm.com"],
    },

    "amazon": {
        "name": "Amazon",
        "search_url": "https://www.amazon.com/s?k={query}",
        "allowed_domains": ["amazon.com"],
    },

    "article": {
        "name": "Article",
        "search_url": "https://www.article.com/search?query={query}",
        "allowed_domains": ["article.com"],
    },

    "castlery": {
        "name": "Castlery",
        "search_url": "https://www.castlery.com/us/search?query={query}",
        "allowed_domains": ["castlery.com"],
    },

    "rugs_usa": {
        "name": "Rugs USA",
        "search_url": "https://www.rugsusa.com/search?query={query}",
        "allowed_domains": ["rugsusa.com"],
    },

    "nathan_james": {
        "name": "Nathan James",
        "search_url": "https://nathanjames.com/search?q={query}",
        "allowed_domains": ["nathanjames.com"],
    },

    "world_market": {
        "name": "World Market",
        "search_url": "https://www.worldmarket.com/search?q={query}",
        "allowed_domains": ["worldmarket.com"],
    },
}


DEFAULT_US_SITES = [
    "article",
    "castlery",
    "rugs_usa",
    "nathan_james",
    "world_market",
    "west_elm",
    "amazon",
]

# This tool version is US-focused.
DEFAULT_INDIA_SITES: List[str] = []


# ============================================================
# 2. Schemas
# ============================================================

class SearchPlan(BaseModel):
    interpreted_need: str = Field(
        default="",
        description="Short interpretation of the user's ecommerce need.",
    )
    room: Optional[str] = Field(
        default=None,
        description="Room or use case, e.g. living room, bedroom, office.",
    )
    styles: List[str] = Field(
        default_factory=list,
        description="Design styles such as Japandi, modern, boho, industrial.",
    )
    categories: List[str] = Field(
        default_factory=list,
        description="Product categories to search.",
    )
    constraints: List[str] = Field(
        default_factory=list,
        description="Budget, color, material, dimensions, delivery, etc.",
    )
    budget_text: Optional[str] = Field(
        default=None,
        description="Budget constraint exactly as inferred from the user query.",
    )
    search_phrases: List[str] = Field(
        default_factory=list,
        description="Concrete ecommerce search phrases.",
    )


class ProductResult(BaseModel):
    title: str
    product_url: str
    image_url: Optional[str] = None
    description: str = ""
    price_text: Optional[str] = None
    source_site: str
    category: Optional[str] = None
    relevance_score: int = Field(ge=0, le=100)
    why_it_matches: str


class ProductResults(BaseModel):
    products: List[ProductResult] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)


# ============================================================
# 3. Cleaning helpers
# ============================================================

def strip_control_chars(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value)


def clean_text(value: Optional[str], max_len: int = 600) -> str:
    if not value:
        return ""

    value = strip_control_chars(value) or ""
    value = " ".join(value.split())

    if len(value) > max_len:
        return value[: max_len - 3] + "..."

    return value


def clean_list(values: List[str]) -> List[str]:
    cleaned: List[str] = []

    for value in values:
        v = clean_text(value)
        if v:
            cleaned.append(v)

    return cleaned


def safe_json_loads(text: str) -> Any:
    """
    Best-effort JSON extraction for model responses.
    """
    text = text.strip()

    fence_match = re.search(
        r"```(?:json)?\s*(.*?)```",
        text,
        flags=re.DOTALL | re.IGNORECASE,
    )
    if fence_match:
        text = fence_match.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    object_match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if object_match:
        return json.loads(object_match.group(0))

    array_match = re.search(r"\[.*\]", text, flags=re.DOTALL)
    if array_match:
        return json.loads(array_match.group(0))

    raise ValueError("Could not parse JSON from Gemini response.")


# ============================================================
# 4. Gemini structured client
# ============================================================

class GeminiStructuredClient:
    """
    Thin wrapper around google-genai for structured outputs.

    Uses Vertex AI / ADC by default.

    Required for Vertex mode:
      GOOGLE_GENAI_USE_VERTEXAI=TRUE
      GOOGLE_CLOUD_PROJECT
      GOOGLE_CLOUD_LOCATION
    """

    def __init__(self, model: str):
        load_dotenv()

        os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")

        self.model = model
        self.client = None

        project = os.environ.get("GOOGLE_CLOUD_PROJECT")
        location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")

        # Keep construction non-fatal so Browserbase can still run and use
        # deterministic fallback if Gemini/ADC is not configured.
        try:
            if project:
                self.client = genai.Client(
                    vertexai=True,
                    project=project,
                    location=location,
                )
            else:
                self.client = genai.Client(vertexai=True)
        except Exception:
            self.client = None

    @staticmethod
    def _response_to_text(response: Any) -> str:
        text = getattr(response, "text", None)
        if text:
            return text.strip()

        chunks: List[str] = []

        for candidate in getattr(response, "candidates", []) or []:
            content = getattr(candidate, "content", None)
            for part in getattr(content, "parts", []) or []:
                part_text = getattr(part, "text", None)
                if part_text:
                    chunks.append(part_text)

        return "\n".join(chunks).strip()

    def generate_structured(
        self,
        prompt: str,
        schema_model: type[BaseModel],
        temperature: float = 0.2,
    ) -> BaseModel:
        if self.client is None:
            raise RuntimeError(
                "Gemini client is not configured. "
                "Set GOOGLE_GENAI_USE_VERTEXAI=TRUE, GOOGLE_CLOUD_PROJECT, "
                "and GOOGLE_CLOUD_LOCATION for ADC/Vertex AI."
            )

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config={
                "temperature": temperature,
                "response_mime_type": "application/json",
                "response_schema": schema_model,
            },
        )

        parsed = getattr(response, "parsed", None)

        if parsed is not None:
            if isinstance(parsed, schema_model):
                return parsed
            if isinstance(parsed, dict):
                return schema_model.model_validate(parsed)

        text = self._response_to_text(response)

        if not text:
            raise RuntimeError(
                "Gemini returned no text while structured output was expected."
            )

        try:
            return schema_model.model_validate_json(text)
        except Exception:
            data = safe_json_loads(text)
            return schema_model.model_validate(data)


# ============================================================
# 5. Browser JavaScript extractors
# ============================================================

CANDIDATE_EXTRACTION_JS = """
() => {
  const abs = (url) => {
    try {
      if (!url) return null;
      return new URL(url, location.href).href;
    } catch {
      return null;
    }
  };

  const clean = (s) => (s || "").replace(/\\s+/g, " ").trim();

  const anchors = Array.from(document.querySelectorAll("a[href]"));
  const results = [];

  for (const a of anchors) {
    const href = abs(a.getAttribute("href"));

    if (!href || href.startsWith("javascript:") || href.startsWith("mailto:")) {
      continue;
    }

    const container =
      a.closest("article") ||
      a.closest("li") ||
      a.closest("[data-testid]") ||
      a.closest("[data-test]") ||
      a.closest("[data-cy]") ||
      a.closest(".product") ||
      a.closest(".product-card") ||
      a.closest(".card") ||
      a.closest("div") ||
      a;

    const img =
      a.querySelector("img") ||
      container.querySelector("img");

    let imageUrl = null;

    if (img) {
      const srcset = img.getAttribute("srcset") || "";
      imageUrl = abs(
        img.currentSrc ||
        img.src ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-original") ||
        img.getAttribute("data-lazy-src") ||
        srcset.split(" ")[0]
      );
    }

    const anchorText = clean(a.innerText || a.getAttribute("aria-label") || "");
    const rawText = clean(container.innerText || anchorText).slice(0, 1400);

    if (rawText.length < 5 && !imageUrl) {
      continue;
    }

    results.push({
      href,
      anchorText: anchorText.slice(0, 300),
      imageUrl,
      rawText
    });
  }

  return results;
}
"""


PRODUCT_PAGE_EXTRACTION_JS = """
() => {
  const abs = (url) => {
    try {
      if (!url) return null;
      return new URL(url, location.href).href;
    } catch {
      return null;
    }
  };

  const meta = (selector) => {
    const el = document.querySelector(selector);
    return el ? el.getAttribute("content") : null;
  };

  const clean = (s) => (s || "").replace(/\\s+/g, " ").trim();

  const title =
    meta('meta[property="og:title"]') ||
    meta('meta[name="twitter:title"]') ||
    clean(document.querySelector("h1")?.innerText) ||
    document.title ||
    "";

  const description =
    meta('meta[name="description"]') ||
    meta('meta[property="og:description"]') ||
    meta('meta[name="twitter:description"]') ||
    "";

  const imageUrl =
    abs(meta('meta[property="og:image"]')) ||
    abs(meta('meta[property="og:image:secure_url"]')) ||
    abs(meta('meta[name="twitter:image"]')) ||
    abs(document.querySelector("img")?.currentSrc || document.querySelector("img")?.src);

  const canonicalUrl =
    abs(document.querySelector('link[rel="canonical"]')?.href) ||
    location.href;

  const bodyText = clean(document.body ? document.body.innerText : "").slice(0, 7000);

  return {
    finalUrl: location.href,
    canonicalUrl,
    title,
    description,
    imageUrl,
    bodyText
  };
}
"""


# ============================================================
# 6. Browserbase Product Browser
# ============================================================

class BrowserbaseProductBrowser:
    PRICE_REGEX = re.compile(
        r"((?:₹|Rs\.?|INR)\s?[\d,]+(?:\.\d{1,2})?|"
        r"(?:\$|USD|£|GBP|€|EUR)\s?[\d,]+(?:\.\d{1,2})?)",
        flags=re.IGNORECASE,
    )

    REJECT_URL_TERMS = [
        "login",
        "signin",
        "signup",
        "register",
        "account",
        "cart",
        "basket",
        "wishlist",
        "help",
        "support",
        "customer-service",
        "return",
        "policy",
        "privacy",
        "terms",
        "blog",
        "ideas",
        "inspiration",
        "stores",
        "locator",
        "contact",
        "about-us",
        "careers",
        "track-order",
        "order-history",
        "gift-card",
        "registry",
        "financing",
        "assembly",
        "delivery",
    ]

    PRODUCT_URL_HINTS = [
        "/p/",
        "/product",
        "/products",
        "/dp/",
        "/ip/",
        "/item",
        "/listing",
        "/pd/",
        "sku=",
        "pid=",
        "productid",
    ]

    HOME_AND_ECOMM_TERMS = [
        "sofa",
        "sectional",
        "chair",
        "table",
        "lamp",
        "rug",
        "bed",
        "cabinet",
        "shelf",
        "curtain",
        "mirror",
        "decor",
        "cushion",
        "wardrobe",
        "desk",
        "stool",
        "bench",
        "vase",
        "dining",
        "coffee table",
        "side table",
        "wall art",
        "floor lamp",
        "armchair",
        "console",
        "tv unit",
        "bookshelf",
        "plant",
        "planter",
        "ottoman",
        "mattress",
        "drawer",
        "storage",
        "nightstand",
        "lighting",
        "basket",
        "throw",
        "pillow",
        "clock",
        "frame",
        "mat",
        "runner",
        "coaster",
        "placemat",
        "blanket",
        "pet",
        "dog",
        "cat",
    ]

    def __init__(
        self,
        browserbase_api_key: str,
        gemini_model: str,
        country: str = "US",
        sites: Optional[List[str]] = None,
        max_candidates_per_search: int = 20,
        max_product_pages: int = 24,
        max_results: int = 10,
        use_proxy: bool = False,
        browser_timeout_seconds: int = 3600,
        search_phrases_per_site: int = 4,
        scroll_rounds: int = 4,
        csv_data_path: Optional[str] = None,
    ):
        self.bb = Browserbase(api_key=browserbase_api_key)
        self.llm = GeminiStructuredClient(model=gemini_model)

        self.country = country.upper()
        self.sites = sites or (
            DEFAULT_INDIA_SITES if self.country == "IN" else DEFAULT_US_SITES
        )
        self.max_candidates_per_search = max_candidates_per_search
        self.max_product_pages = max_product_pages
        self.max_results = max_results
        self.use_proxy = use_proxy
        self.browser_timeout_seconds = browser_timeout_seconds
        self.search_phrases_per_site = search_phrases_per_site
        self.scroll_rounds = scroll_rounds
        self.csv_data_path = csv_data_path

    # --------------------------------------------------------
    # Planning
    # --------------------------------------------------------

    def plan_query(self, user_query: str) -> SearchPlan:
        user_query = clean_text(user_query, max_len=1000)

        prompt = f"""
You are a search planner for an ecommerce product browsing agent.

User query:
{user_query}

Country:
{self.country}

Return a compact structured search plan.

Rules:
- Make search_phrases concrete and ecommerce-friendly.
- Preserve product categories, style, material, color, brand, room/use case, and budget where available.
- Generate 3 to 6 search phrases.
- Do not invent a budget if none is given.
- Avoid overly narrow SKU-like queries.
- Prefer phrases that work on ecommerce search pages.
- Return JSON only.
"""

        try:
            plan = self.llm.generate_structured(prompt, SearchPlan)
        except Exception as exc:
            return SearchPlan(
                interpreted_need=user_query,
                search_phrases=[user_query],
                constraints=[f"planner_fallback_due_to:{type(exc).__name__}"],
            )

        plan.interpreted_need = clean_text(plan.interpreted_need)
        plan.room = clean_text(plan.room) or None
        plan.styles = clean_list(plan.styles)
        plan.categories = clean_list(plan.categories)
        plan.constraints = clean_list(plan.constraints)
        plan.budget_text = clean_text(plan.budget_text) or None
        plan.search_phrases = clean_list(plan.search_phrases)

        if not plan.search_phrases:
            plan.search_phrases = [user_query]

        return plan

    def build_search_urls(self, plan: SearchPlan) -> List[Dict[str, Any]]:
        search_urls: List[Dict[str, Any]] = []

        for site_key in self.sites:
            if site_key not in SITE_SEARCH_TEMPLATES:
                raise ValueError(
                    f"Unknown site key '{site_key}'. "
                    f"Valid site keys: {sorted(SITE_SEARCH_TEMPLATES.keys())}"
                )

            site = SITE_SEARCH_TEMPLATES[site_key]

            for phrase in plan.search_phrases[: self.search_phrases_per_site]:
                encoded = quote_plus(phrase)

                search_urls.append(
                    {
                        "site_key": site_key,
                        "site_name": site["name"],
                        "url": site["search_url"].format(query=encoded),
                        "allowed_domains": site["allowed_domains"],
                        "phrase": phrase,
                    }
                )

        return search_urls

    # --------------------------------------------------------
    # Candidate filtering
    # --------------------------------------------------------

    @staticmethod
    def _host(url: str) -> str:
        try:
            return urlparse(url).netloc.lower().replace("www.", "")
        except Exception:
            return ""

    def _domain_allowed(self, url: str, allowed_domains: List[str]) -> bool:
        host = self._host(url)
        if not host:
            return False

        return any(
            domain.lower().replace("www.", "") in host
            for domain in allowed_domains
        )

    def _looks_like_product_candidate(
        self,
        candidate: Dict[str, Any],
        allowed_domains: List[str],
    ) -> bool:
        href = candidate.get("href") or ""
        text = " ".join(
            [
                candidate.get("rawText") or "",
                candidate.get("anchorText") or "",
            ]
        )

        href_l = href.lower()
        text_l = text.lower()

        if not href:
            return False

        if not href.startswith(("http://", "https://")):
            return False

        if not self._domain_allowed(href, allowed_domains):
            return False

        if any(term in href_l for term in self.REJECT_URL_TERMS):
            return False

        if any(term in href_l for term in ["/search", "search?", "/category", "/categories"]):
            return False

        has_price = bool(self.PRICE_REGEX.search(text))
        has_image = bool(candidate.get("imageUrl"))
        has_product_hint = any(hint in href_l for hint in self.PRODUCT_URL_HINTS)
        has_ecomm_term = any(term in text_l for term in self.HOME_AND_ECOMM_TERMS)

        return (
            has_product_hint and (has_image or has_price or has_ecomm_term)
        ) or (
            has_price and has_ecomm_term
        )

    def _candidate_score(self, candidate: Dict[str, Any]) -> int:
        href = candidate.get("href") or ""
        text = " ".join(
            [
                candidate.get("rawText") or "",
                candidate.get("anchorText") or "",
            ]
        )

        score = 0

        if candidate.get("imageUrl"):
            score += 3

        if self.PRICE_REGEX.search(text):
            score += 4

        if any(hint in href.lower() for hint in self.PRODUCT_URL_HINTS):
            score += 3

        if any(term in text.lower() for term in self.HOME_AND_ECOMM_TERMS):
            score += 2

        if len(text) > 80:
            score += 1

        return score

    def _extract_price(self, text: str) -> Optional[str]:
        if not text:
            return None

        match = self.PRICE_REGEX.search(text)

        if match:
            return clean_text(match.group(1), max_len=100)

        return None

    # --------------------------------------------------------
    # Browser helpers
    # --------------------------------------------------------

    async def _safe_goto_async(
        self,
        page: Any,
        url: str,
        timeout_ms: int = 45_000,
    ) -> bool:
        try:
            await page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=timeout_ms,
            )

            try:
                await page.wait_for_load_state("networkidle", timeout=8_000)
            except PlaywrightTimeoutError:
                pass

            return True

        except Exception as exc:
            print(f"[WARN] Could not open {url}: {exc}")
            return False

    async def _try_close_popups(self, page: Any) -> None:
        selectors = [
            "button:has-text('Accept')",
            "button:has-text('Accept All')",
            "button:has-text('I Accept')",
            "button:has-text('Got it')",
            "button:has-text('No thanks')",
            "button:has-text('Close')",
            "button[aria-label='Close']",
            "[data-testid='close-button']",
            "[aria-label='close']",
        ]

        for selector in selectors:
            try:
                loc = page.locator(selector).first
                if await loc.count() > 0:
                    await loc.click(timeout=1500)
                    await page.wait_for_timeout(400)
            except Exception:
                pass

    def _load_csv_candidates(self) -> List[Dict[str, Any]]:
        if not self.csv_data_path or not os.path.exists(self.csv_data_path):
            return []

        print(f"[CSV Loader] Loading candidates from {self.csv_data_path}")
        csv_candidates: List[Dict[str, Any]] = []

        with open(self.csv_data_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                product_url = row.get("product_url")
                if not product_url:
                    continue

                title = row.get("title", "")
                description = row.get("description", "")
                image_url = row.get("image_url")
                source_site = row.get("source_site", "csv_source")
                relevance_score = int(row.get("relevance_score", 50))

                raw_text = clean_text(f"{title} {description}", max_len=1400)

                candidate = {
                    "href": product_url,
                    "anchorText": clean_text(title, max_len=300),
                    "imageUrl": image_url,
                    "rawText": raw_text,
                    "source_site": source_site,
                    "site_key": source_site.lower().replace(" ", "_"), # Derive a key
                    "search_phrase": row.get("query", ""), # Use query from CSV as search_phrase
                    "candidate_score": relevance_score, # Use relevance_score from CSV
                    "source_type": "csv",
                    **row # Include all original CSV data for potential later use
                }
                csv_candidates.append(candidate)
        
        print(f"[CSV Loader] Loaded {len(csv_candidates)} candidates from CSV.")
        return csv_candidates

    async def collect_candidates_async(
        self,
        search_urls: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        session_kwargs: Dict[str, Any] = {
            "timeout": self.browser_timeout_seconds,
            "browser_settings": {
                "blockAds": True,
                "recordSession": True,
                "logSession": True,
                "viewport": {
                    "width": 1440,
                    "height": 1100,
                },
            },
        }

        if self.use_proxy:
            session_kwargs["proxies"] = True

        session = self.bb.sessions.create(**session_kwargs)

        print(
            "[Browserbase] Session started: "
            f"https://browserbase.com/sessions/{session.id}"
        )

        all_candidates: List[Dict[str, Any]] = []
        seen_urls: set[str] = set()

        if self.csv_data_path:
            csv_cands = self._load_csv_candidates()
            for cand in csv_cands:
                all_candidates.append(cand)
                seen_urls.add(cand["href"])

        playwright = await async_playwright().start()
        browser = None

        try:
            browser = await playwright.chromium.connect_over_cdp(
                session.connect_url
            )

            context = (
                browser.contexts[0]
                if browser.contexts
                else await browser.new_context()
            )
            page = (
                context.pages[0]
                if context.pages
                else await context.new_page()
            )

            # -----------------------------------------------
            # Visit search result pages and extract candidates
            # -----------------------------------------------
            for search in search_urls:
                site_name = search["site_name"]
                search_url = search["url"]
                allowed_domains = search["allowed_domains"]

                print(f"[Search] {site_name}: {search['phrase']}")

                ok = await self._safe_goto_async(page, search_url)

                if not ok:
                    continue

                await self._try_close_popups(page)

                for _ in range(self.scroll_rounds):
                    await page.mouse.wheel(0, 2200)
                    await page.wait_for_timeout(800)

                try:
                    raw_candidates = await page.evaluate(CANDIDATE_EXTRACTION_JS)
                except Exception as exc:
                    print(
                        f"[WARN] Candidate extraction failed on "
                        f"{site_name}: {exc}"
                    )
                    continue

                filtered: List[Dict[str, Any]] = []

                for candidate in raw_candidates or []:
                    href = candidate.get("href")

                    if not href or href in seen_urls:
                        continue

                    if not self._looks_like_product_candidate(
                        candidate,
                        allowed_domains,
                    ):
                        continue

                    seen_urls.add(href)

                    candidate["source_site"] = site_name
                    candidate["site_key"] = search["site_key"]
                    candidate["search_phrase"] = search["phrase"]
                    candidate["candidate_score"] = self._candidate_score(candidate)

                    filtered.append(candidate)

                filtered.sort(
                    key=lambda x: x.get("candidate_score", 0),
                    reverse=True,
                )

                all_candidates.extend(
                    filtered[: self.max_candidates_per_search]
                )

            all_candidates.sort(
                key=lambda x: x.get("candidate_score", 0),
                reverse=True,
            )

            # -----------------------------------------------
            # Visit candidate product pages for richer details
            # -----------------------------------------------
            product_page_extracts: List[Dict[str, Any]] = []
            product_urls_seen: set[str] = set()

            for candidate in all_candidates[: self.max_product_pages]:
                product_url = candidate["href"]

                if product_url in product_urls_seen:
                    continue

                product_urls_seen.add(product_url)

                ok = await self._safe_goto_async(
                    page,
                    product_url,
                    timeout_ms=35_000,
                )

                if ok:
                    await self._try_close_popups(page)

                    try:
                        detail = await page.evaluate(PRODUCT_PAGE_EXTRACTION_JS)
                    except Exception as exc:
                        print(
                            f"[WARN] Product extraction failed for "
                            f"{product_url}: {exc}"
                        )
                        detail = {}
                else:
                    detail = {}

                combined_text = " ".join(
                    [
                        candidate.get("rawText") or "",
                        detail.get("title") or "",
                        detail.get("description") or "",
                        detail.get("bodyText") or "",
                    ]
                )

                final_url = (
                    detail.get("canonicalUrl")
                    or detail.get("finalUrl")
                    or product_url
                )

                product_page_extracts.append(
                    {
                        "source_site": candidate.get("source_site"),
                        "site_key": candidate.get("site_key"),
                        "search_phrase": candidate.get("search_phrase"),
                        "product_url": final_url,
                        "candidate_anchor_text": candidate.get("anchorText"),
                        "candidate_text": candidate.get("rawText"),
                        "candidate_image_url": candidate.get("imageUrl"),
                        "page_title": detail.get("title"),
                        "page_description": detail.get("description"),
                        "page_image_url": detail.get("imageUrl"),
                        "price_text": self._extract_price(combined_text),
                        "candidate_score": candidate.get("candidate_score", 0),
                        "page_text_excerpt": (
                            detail.get("bodyText")
                            or candidate.get("rawText")
                            or ""
                        )[:2500],
                    }
                )

            return product_page_extracts

        finally:
            if browser:
                await browser.close()

            await playwright.stop()

    # --------------------------------------------------------
    # Final Gemini product cleanup/ranking
    # --------------------------------------------------------

    def rank_and_extract_products(
        self,
        user_query: str,
        plan: SearchPlan,
        page_extracts: List[Dict[str, Any]],
    ) -> ProductResults:
        compact_extracts = page_extracts[: self.max_product_pages]

        prompt = f"""
You are a product extraction and ranking agent for ecommerce recommendations.

User query:
{user_query}

Interpreted search plan:
{plan.model_dump_json(indent=2)}

Raw browser-extracted product candidates:
{json.dumps(compact_extracts, ensure_ascii=False, indent=2)}

Task:
1. Keep only actual purchasable product pages.
2. Do not invent product URLs, image URLs, prices, titles, categories, or descriptions.
3. Use only fields from the raw browser extraction.
4. Prefer items that match the user's room/use case, style, category, budget, material, color, and constraints.
5. Use candidate_image_url or page_image_url as image_url.
6. Summarize descriptions in your own words, but only from observed page/candidate text.
7. Rank products by relevance_score from 0 to 100.
8. Return at most {self.max_results} products.
9. If price is unavailable, set price_text to null.
10. Exclude search pages, category pages, blog pages, inspiration pages, and non-product pages.
11. Exclude products without product_url.
12. Prefer products with image_url.
13. Return JSON only.
"""

        try:
            results = self.llm.generate_structured(
                prompt,
                ProductResults,
                temperature=0.1,
            )
        except Exception as exc:
            fallback_products: List[ProductResult] = []

            for item in compact_extracts[: self.max_results]:
                title = clean_text(
                    item.get("page_title")
                    or item.get("candidate_anchor_text")
                    or item.get("candidate_text")
                    or "Untitled product",
                    max_len=180,
                )

                product_url = item.get("product_url") or ""
                image_url = item.get("page_image_url") or item.get("candidate_image_url")

                if not product_url:
                    continue

                fallback_products.append(
                    ProductResult(
                        title=title,
                        product_url=product_url,
                        image_url=image_url,
                        description=clean_text(
                            item.get("page_description")
                            or item.get("page_text_excerpt")
                            or "",
                            max_len=350,
                        ),
                        price_text=item.get("price_text"),
                        source_site=item.get("source_site") or "unknown",
                        category=None,
                        relevance_score=min(
                            100,
                            50 + int(item.get("candidate_score", 0)) * 5,
                        ),
                        why_it_matches=(
                            "Selected by deterministic fallback after "
                            f"Gemini ranking failed with {type(exc).__name__}."
                        ),
                    )
                )

            return ProductResults(
                products=fallback_products,
                notes=[
                    f"Gemini ranking fallback used due to {type(exc).__name__}."
                ],
            )

        cleaned_products: List[ProductResult] = []

        for product in results.products:
            if not product.product_url:
                continue

            cleaned_products.append(
                ProductResult(
                    title=clean_text(product.title, max_len=180),
                    product_url=product.product_url,
                    image_url=product.image_url,
                    description=clean_text(product.description, max_len=450),
                    price_text=clean_text(product.price_text, max_len=80) or None,
                    source_site=clean_text(product.source_site, max_len=80),
                    category=clean_text(product.category, max_len=80) or None,
                    relevance_score=product.relevance_score,
                    why_it_matches=clean_text(
                        product.why_it_matches,
                        max_len=350,
                    ),
                )
            )

        cleaned_products.sort(
            key=lambda p: p.relevance_score,
            reverse=True,
        )

        return ProductResults(
            products=cleaned_products[: self.max_results],
            notes=results.notes,
        )

    # --------------------------------------------------------
    # Main run method
    # --------------------------------------------------------

    async def run_async(self, user_query: str) -> ProductResults:
        plan = self.plan_query(user_query)

        print("\n[Browserbase Search Plan]")
        print(plan.model_dump_json(indent=2))

        search_urls = self.build_search_urls(plan)

        if not search_urls:
            return ProductResults(
                products=[],
                notes=["No search URLs were generated."],
            )

        page_extracts = await self.collect_candidates_async(search_urls)

        if not page_extracts:
            return ProductResults(
                products=[],
                notes=[
                    "No product candidates were extracted. "
                    "Try broader query terms, fewer sites, or inspect the "
                    "Browserbase session recording."
                ],
            )

        return self.rank_and_extract_products(
            user_query=user_query,
            plan=plan,
            page_extracts=page_extracts,
        )


# ============================================================
# 7. ADK tool function
# ============================================================

async def browse_products_with_browserbase(
    query: str,
    country: str = "US",
    max_results: int = 10,
    max_product_pages: int = 24,
    sites: Optional[List[str]] = None,
    use_proxy: bool = False,
    csv_data_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    ADK tool entrypoint.

    Args:
        query:
            Natural-language ecommerce query.
            Example:
            "Japandi living room coffee table rug floor lamp wall decor under $800"

        country:
            "US" is the intended market for this version.

        max_results:
            Number of final product cards to return.

        max_product_pages:
            Number of candidate product pages to visit.

        sites:
            Optional site keys. Example:
            ["article", "castlery", "rugs_usa", "nathan_james", "world_market", "west_elm", "amazon"]

        use_proxy:
            Whether to enable Browserbase proxy support.

        csv_data_path:
            Optional path to a CSV file containing additional product candidates.
            Example:
            "data/browserbase_results_final_with_ho_05.csv"

    Returns:
        JSON-serializable dict:
        {
          "products": [...],
          "notes": [...]
        }
    """
    load_dotenv()

    browserbase_api_key = os.environ.get("BROWSERBASE_API_KEY")
    gemini_model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    if not browserbase_api_key:
        return {
            "products": [],
            "notes": [
                "Missing BROWSERBASE_API_KEY environment variable."
            ],
        }

    country = (country or "US").upper()

    if sites is None:
        sites = DEFAULT_INDIA_SITES if country == "IN" else DEFAULT_US_SITES

    try:
        browser = BrowserbaseProductBrowser(
            browserbase_api_key=browserbase_api_key,
            gemini_model=gemini_model,
            country=country,
            sites=sites,
            max_candidates_per_search=20,
            max_product_pages=max_product_pages,
            max_results=max_results,
            use_proxy=use_proxy,
            csv_data_path=csv_data_path,
        )

        results = await browser.run_async(query)

        return results.model_dump()

    except ValidationError as exc:
        return {
            "products": [],
            "notes": [
                "Product browsing failed due to schema validation error.",
                str(exc),
            ],
        }

    except Exception as exc:
        return {
            "products": [],
            "notes": [
                "Product browsing failed due to runtime error.",
                f"{type(exc).__name__}: {exc}",
            ],
        }


# ============================================================
# 8. Optional local smoke test
# ============================================================

async def _smoke_test() -> None:
    result = await browse_products_with_browserbase(
        query=(
            "scratch resistant living room decor under $50"
        ),
        country="US",
        max_results=5,
        max_product_pages=12,
        sites=[
            "article",
            "castlery",
            "rugs_usa",
            "nathan_james",
            "world_market",
            "west_elm",
            "amazon",
        ],
        use_proxy=False,
    )

    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(_smoke_test())