import { createServerFn } from "@tanstack/react-start";
import type { DesignBrief, PhotoAnalysis } from "@/context/DesignContext";

const PRIMARY_MODEL = "google/gemini-3.1-flash-image-preview";
const FALLBACK_MODEL = "google/gemini-2.5-flash-image";

export function buildDreamPrompt(brief: DesignBrief): string {
  const lightingText: Record<DesignBrief["lighting"], string> = {
    "Bright & airy": "bright daylight streaming through tall windows, airy and luminous",
    "Warm & cozy": "warm golden-hour lamp light, cozy and inviting",
    "Dim & moody": "dim moody low-key lighting, dramatic shadows, cinematic",
  };
  return [
    `Professional interior design photograph of a ${brief.roomType.toLowerCase()}.`,
    `Style: ${brief.style}.`,
    `Wall color base: ${brief.wallColorName} (${brief.wallColor}).`,
    `Lighting: ${lightingText[brief.lighting]}.`,
    `Budget feel: ${brief.budget} — furnishings should look appropriate for that price range.`,
    `Composition: wide-angle architectural shot, realistic materials, layered lighting,`,
    `tasteful furniture arrangement, decorative accents, plants, art on walls.`,
    `Magazine-quality, photorealistic, 8k, architectural digest aesthetic.`,
  ].join(" ");
}

async function callGateway(model: string, prompt: string, key: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`AI Gateway ${res.status}: ${txt.slice(0, 200)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  const json = await res.json();
  const url: string | undefined =
    json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("AI Gateway response did not include an image.");
  return url;
}

export const generateDreamImageServer = createServerFn({ method: "POST" })
  .inputValidator((data: { brief: DesignBrief }) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured.");
    const prompt = buildDreamPrompt(data.brief);
    try {
      return { url: await callGateway(PRIMARY_MODEL, prompt, key) };
    } catch (e) {
      const status = (e as Error & { status?: number }).status;
      if (status === 404 || status === 400) {
        return { url: await callGateway(FALLBACK_MODEL, prompt, key) };
      }
      throw e;
    }
  });

export async function generateDreamImage(brief: DesignBrief): Promise<string> {
  const { url } = await generateDreamImageServer({ data: { brief } });
  return url;
}

// ===== Photo analysis (Gemini vision) =====

const ANALYSIS_MODEL = "google/gemini-2.5-flash";

export const analyzeRoomPhotoServer = createServerFn({ method: "POST" })
  .inputValidator((data: { imageDataUrl: string }) => data)
  .handler(async ({ data }): Promise<PhotoAnalysis> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured.");

    const systemPrompt =
      "You analyze interior room photos. Always respond by calling the report_room tool exactly once with concise, accurate values.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this room photo and report what you see." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_room",
              description: "Report observed properties of the room.",
              parameters: {
                type: "object",
                properties: {
                  roomType: {
                    type: "string",
                    enum: ["Living Room", "Bedroom", "Kitchen", "Dining Room", "Home Office"],
                  },
                  wallColorName: {
                    type: "string",
                    enum: ["White", "Warm Beige", "Soft Grey", "Sand", "Deep Navy", "Terracotta"],
                  },
                  wallColorHex: { type: "string", description: "Hex like #F8F6F1" },
                  lighting: {
                    type: "string",
                    enum: ["Bright & airy", "Warm & cozy", "Dim & moody"],
                  },
                  floor: {
                    type: "string",
                    enum: ["Hardwood", "Tile", "Carpet", "Concrete", "Marble"],
                  },
                  description: {
                    type: "string",
                    description:
                      "One short sentence: room type, wall color, floor type — plain language.",
                  },
                },
                required: [
                  "roomType",
                  "wallColorName",
                  "wallColorHex",
                  "lighting",
                  "floor",
                  "description",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_room" } },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI Gateway ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No analysis returned by model.");
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    return parsed as PhotoAnalysis;
  });

export async function analyzeRoomPhoto(imageDataUrl: string): Promise<PhotoAnalysis> {
  return analyzeRoomPhotoServer({ data: { imageDataUrl } });
}

// ===== Text description parser (no photo path) =====

export const parseRoomDescriptionServer = createServerFn({ method: "POST" })
  .inputValidator((data: { roomType: string; description: string }) => data)
  .handler(async ({ data }): Promise<PhotoAnalysis> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured.");

    const systemPrompt =
      "You translate a user's short text description of their room into structured design fields. Always call the report_room tool exactly once. Infer reasonable defaults if the user didn't mention something.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Room type: ${data.roomType}\nUser description: ${data.description}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_room",
              description: "Report inferred properties of the room from the description.",
              parameters: {
                type: "object",
                properties: {
                  roomType: {
                    type: "string",
                    enum: ["Living Room", "Bedroom", "Kitchen", "Dining Room", "Home Office"],
                  },
                  wallColorName: {
                    type: "string",
                    enum: ["White", "Warm Beige", "Soft Grey", "Sand", "Deep Navy", "Terracotta"],
                  },
                  wallColorHex: { type: "string" },
                  lighting: {
                    type: "string",
                    enum: ["Bright & airy", "Warm & cozy", "Dim & moody"],
                  },
                  floor: {
                    type: "string",
                    enum: ["Hardwood", "Tile", "Carpet", "Concrete", "Marble"],
                  },
                  description: { type: "string" },
                },
                required: ["roomType", "wallColorName", "wallColorHex", "lighting", "floor", "description"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_room" } },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI Gateway ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No analysis returned by model.");
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    return parsed as PhotoAnalysis;
  });

export async function parseRoomDescription(roomType: string, description: string): Promise<PhotoAnalysis> {
  return parseRoomDescriptionServer({ data: { roomType, description } });
}

// Simulated curated product list — used by Shopping + Products in Room screens.
export interface CuratedProduct {
  id: string;
  name: string;
  category: string;
  priceLow: number;
  priceHigh: number;
  description: string;
  image: string;
  // overlay position (percent of image)
  pinX: number;
  pinY: number;
}

export const CURATED_PRODUCTS: CuratedProduct[] = [
  {
    id: "elowen",
    name: "Elowen Armchair",
    category: "Living Room",
    priceLow: 850,
    priceHigh: 1200,
    description:
      "A sculptural piece that brings organic warmth to your reading nook. Matches your sage palette perfectly.",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600",
    pinX: 30,
    pinY: 60,
  },
  {
    id: "horizon",
    name: "Horizon Abstract",
    category: "Decor",
    priceLow: 320,
    priceHigh: 450,
    description:
      "Hand-painted canvas that bridges your accent wall color with the rest of the room's neutral tones.",
    image:
      "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?w=600",
    pinX: 55,
    pinY: 35,
  },
  {
    id: "luna",
    name: "Luna Floor Lamp",
    category: "Lighting",
    priceLow: 180,
    priceHigh: 290,
    description:
      "Minimalist lighting that adds vertical interest without cluttering your floor space. Satin brass finish.",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600",
    pinX: 78,
    pinY: 50,
  },
];