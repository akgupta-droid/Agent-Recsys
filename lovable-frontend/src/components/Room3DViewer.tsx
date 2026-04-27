import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Loader2, AlertCircle } from "lucide-react";

interface Props {
  dreamImage?: string | null;
  apiKey?: string;
  fallbackWallColor?: string;
}

type FurnitureType =
  | "sofa" | "armchair" | "coffee_table" | "side_table" | "desk"
  | "office_chair" | "dining_table" | "dining_chair" | "chair"
  | "bookshelf" | "floor_lamp" | "table_lamp" | "pendant_light"
  | "rug" | "wall_art" | "plant" | "mirror" | "curtains" | "cushion" | "vase"
  | "other";

type WallId = "left_wall" | "right_wall" | "back_wall" | "front_wall";
type WallProximity =
  | "against_left_wall" | "against_right_wall" | "against_back_wall" | "against_front_wall"
  | "center" | "corner_left_back" | "corner_right_back"
  | "corner_left_front" | "corner_right_front";
type ArchType = "window" | "door" | "beam" | "pendant_light";
type DoorStyle = "sliding" | "barn" | "standard" | "french";
type WindowKind = "single" | "double" | "floor_to_ceiling" | "small";

interface ArchFeature {
  type: ArchType;
  wall: WallId;
  position_along_wall: number; // 0-100
  vertical_position: number;   // 0-100 from floor
  width_cm: number;
  height_cm: number;
  color: string;
  style: string; // door style or window kind
}
interface FurnitureItem {
  name: string;
  type: FurnitureType;
  color: string;
  width_cm: number;
  depth_cm: number;
  height_cm: number;
  wall_proximity: WallProximity;
  x_position: number;
  z_position: number;
}
interface RoomMeta {
  wall_color_hex: string;
  floor_color_hex: string;
  ceiling_color_hex: string;
  room_width_estimate_cm: number;
  room_depth_estimate_cm: number;
}
interface AnalysisResult {
  architectural: ArchFeature[];
  furniture: FurnitureItem[];
  room: RoomMeta;
}

const ROOM_H = 280;
const MIN_W = 350, MAX_W = 800, MIN_D = 300, MAX_D = 700;

function isHex(s: unknown): s is string {
  return typeof s === "string" && /^#?[0-9a-f]{6}$/i.test((s as string).replace("#", ""));
}
function normHex(s: unknown, fallback = "#cccccc"): string {
  const str = String(s ?? "");
  if (!isHex(str)) return fallback;
  return str.startsWith("#") ? str : `#${str}`;
}
function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

const FURNITURE_TYPES: FurnitureType[] = [
  "sofa","armchair","coffee_table","side_table","desk","office_chair",
  "dining_table","dining_chair","chair","bookshelf","floor_lamp","table_lamp",
  "pendant_light","rug","wall_art","plant","mirror","curtains","cushion","vase",
];
function coerceFurnitureType(raw: unknown): FurnitureType {
  const s = String(raw ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  return (FURNITURE_TYPES as string[]).includes(s) ? (s as FurnitureType) : "other";
}
function coerceWall(raw: unknown): WallId {
  const s = String(raw ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "left_wall" || s === "right_wall" || s === "back_wall" || s === "front_wall") return s;
  return "back_wall";
}
function coerceProximity(raw: unknown): WallProximity {
  const s = String(raw ?? "center").toLowerCase().replace(/[\s-]+/g, "_");
  const allowed: WallProximity[] = [
    "against_left_wall","against_right_wall","against_back_wall","against_front_wall",
    "center","corner_left_back","corner_right_back","corner_left_front","corner_right_front",
  ];
  return (allowed as string[]).includes(s) ? (s as WallProximity) : "center";
}
function coerceArchType(raw: unknown): ArchType {
  const s = String(raw ?? "").toLowerCase();
  if (s === "window" || s === "door" || s === "beam" || s === "pendant_light") return s;
  return "window";
}

async function imageToInline(src: string): Promise<{ mimeType: string; data: string }> {
  const m = src.match(/^data:([^;]+);base64,(.+)$/);
  if (m) return { mimeType: m[1], data: m[2] };
  const res = await fetch(src);
  const blob = await res.blob();
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return { mimeType: blob.type || "image/png", data: btoa(bin) };
}

const ANALYSIS_PROMPT =
  'You are a precise 3D room scanner. Analyze this interior room image very carefully. Identify and list every item you can see. Respond with ONLY a valid JSON object, no markdown, no backticks, no explanation.\n\n' +
  'Include TWO categories:\n\n' +
  'ARCHITECTURAL FEATURES (walls, windows, doors):\n' +
  '- For each window: its wall location (left_wall, right_wall, back_wall, front_wall), position along that wall (percentage 0-100 from left), vertical position (percentage from floor), width_cm, height_cm, and type (single, double, floor_to_ceiling, small)\n' +
  '- For each door: same format as windows plus door style (sliding, barn, standard, french)\n' +
  '- Wall color as hex for each wall if different\n' +
  '- Ceiling features (exposed beams, pipes, pendant lights and their positions)\n\n' +
  'FURNITURE AND DECOR:\n' +
  '- name, type (sofa, armchair, coffee_table, side_table, desk, office_chair, dining_table, dining_chair, bookshelf, floor_lamp, table_lamp, pendant_light, rug, wall_art, plant, mirror, curtains, cushion, vase), color (hex), width_cm, depth_cm, height_cm, wall_proximity (against_left_wall, against_right_wall, against_back_wall, center, corner_left_back, corner_right_back), x_position (0-100), z_position (0-100)\n\n' +
  'Format: {architectural: [{type, wall, position_along_wall, vertical_position, width_cm, height_cm, color, style}], furniture: [{name, type, color, width_cm, depth_cm, height_cm, wall_proximity, x_position, z_position}], room: {wall_color_hex, floor_color_hex, ceiling_color_hex, room_width_estimate_cm, room_depth_estimate_cm}}\n\n' +
  'Be very precise about WHERE things are — which wall the window is on, which corner the lamp is in, whether the sofa is against the left or back wall. This data will be used to build an accurate 3D model.';

async function analyzeDreamImage(imageSrc: string, apiKey: string): Promise<AnalysisResult> {
  const inline = await imageToInline(imageSrc);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inlineData: inline }, { text: ANALYSIS_PROMPT }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Vision ${res.status}: ${t.slice(0, 160)}`);
  }
  const json = await res.json();
  const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object in response");
  const raw = JSON.parse(match[0]);

  const architectural: ArchFeature[] = Array.isArray(raw.architectural)
    ? raw.architectural.map((a: Record<string, unknown>): ArchFeature => ({
        type: coerceArchType(a.type),
        wall: coerceWall(a.wall),
        position_along_wall: clamp(a.position_along_wall, 0, 100, 50),
        vertical_position: clamp(a.vertical_position, 0, 100, 35),
        width_cm: clamp(a.width_cm, 20, 500, 100),
        height_cm: clamp(a.height_cm, 20, 280, 120),
        color: normHex(a.color, "#dceaf0"),
        style: String(a.style ?? "single"),
      }))
    : [];
  const furniture: FurnitureItem[] = Array.isArray(raw.furniture)
    ? raw.furniture.map((f: Record<string, unknown>): FurnitureItem => ({
        name: String(f.name ?? "item"),
        type: coerceFurnitureType(f.type),
        color: normHex(f.color, "#b8a890"),
        width_cm: clamp(f.width_cm, 5, 600, 80),
        depth_cm: clamp(f.depth_cm, 5, 600, 80),
        height_cm: clamp(f.height_cm, 1, 280, 80),
        wall_proximity: coerceProximity(f.wall_proximity),
        x_position: clamp(f.x_position, 0, 100, 50),
        z_position: clamp(f.z_position, 0, 100, 50),
      }))
    : [];
  const r = (raw.room ?? {}) as Record<string, unknown>;
  const room: RoomMeta = {
    wall_color_hex: normHex(r.wall_color_hex, "#ece7df"),
    floor_color_hex: normHex(r.floor_color_hex, "#a17449"),
    ceiling_color_hex: normHex(r.ceiling_color_hex, "#fafafa"),
    room_width_estimate_cm: clamp(r.room_width_estimate_cm, MIN_W, MAX_W, 500),
    room_depth_estimate_cm: clamp(r.room_depth_estimate_cm, MIN_D, MAX_D, 400),
  };
  return { architectural, furniture, room };
}

function setShadow(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
  });
}

function buildFurnitureGroup(item: FurnitureItem): THREE.Object3D {
  const w = Math.max(5, item.width_cm);
  const d = Math.max(5, item.depth_cm);
  const h = Math.max(1, item.height_cm);
  const color = new THREE.Color(item.color);
  const mat = () => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const dark = () => new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
  const wood = () => new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.85 });
  const group = new THREE.Group();

  const addLegs = (topW: number, topD: number, topY: number, legR = 2) => {
    const legGeo = new THREE.CylinderGeometry(legR, legR, topY, 12);
    const offX = topW / 2 - legR * 2;
    const offZ = topD / 2 - legR * 2;
    [[-offX,-offZ],[offX,-offZ],[-offX,offZ],[offX,offZ]].forEach(([lx,lz]) => {
      const leg = new THREE.Mesh(legGeo, wood());
      leg.position.set(lx, topY/2, lz);
      group.add(leg);
    });
  };

  switch (item.type) {
    case "sofa": {
      const seatH = h*0.4;
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, seatH, d), mat());
      base.position.y = seatH/2; group.add(base);
      const back = new THREE.Mesh(new THREE.BoxGeometry(w, h-seatH, d*0.25), mat());
      back.position.set(0, seatH+(h-seatH)/2, -d/2 + (d*0.25)/2); group.add(back);
      const armW = w*0.08;
      const armGeo = new THREE.BoxGeometry(armW, h*0.6, d);
      const armL = new THREE.Mesh(armGeo, mat()); armL.position.set(-w/2+armW/2, (h*0.6)/2, 0);
      const armR = new THREE.Mesh(armGeo, mat()); armR.position.set(w/2-armW/2, (h*0.6)/2, 0);
      group.add(armL, armR);
      break;
    }
    case "armchair": {
      const seatH = h*0.45;
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, seatH, d), mat());
      base.position.y = seatH/2; group.add(base);
      const back = new THREE.Mesh(new THREE.BoxGeometry(w, h-seatH, d*0.2), mat());
      back.position.set(0, seatH+(h-seatH)/2, -d/2 + (d*0.2)/2); group.add(back);
      const armW = w*0.1;
      const armGeo = new THREE.BoxGeometry(armW, h*0.55, d*0.9);
      const armL = new THREE.Mesh(armGeo, mat()); armL.position.set(-w/2+armW/2, (h*0.55)/2, 0);
      const armR = new THREE.Mesh(armGeo, mat()); armR.position.set(w/2-armW/2, (h*0.55)/2, 0);
      group.add(armL, armR);
      break;
    }
    case "coffee_table":
    case "side_table":
    case "desk":
    case "dining_table": {
      const topH = Math.max(2, h*0.08);
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, topH, d), mat());
      top.position.y = h - topH/2; group.add(top);
      addLegs(w, d, h-topH, 2);
      break;
    }
    case "chair":
    case "dining_chair":
    case "office_chair": {
      const seatH = Math.max(2, h*0.06);
      const seatY = h*0.45;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w, seatH, d), mat());
      seat.position.y = seatY; group.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(w, h-seatY, Math.max(2, d*0.1)), mat());
      back.position.set(0, seatY+(h-seatY)/2, -d/2 + (d*0.1)/2); group.add(back);
      addLegs(w, d, seatY, 1.5);
      break;
    }
    case "bookshelf": {
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat());
      body.position.y = h/2; group.add(body);
      const shelfMat = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.7), roughness: 0.9 });
      for (let i = 1; i < 4; i++) {
        const sh = new THREE.Mesh(new THREE.BoxGeometry(w*0.95, 1, d*0.95), shelfMat);
        sh.position.y = (h/4)*i; group.add(sh);
      }
      break;
    }
    case "floor_lamp": {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, h*0.85, 12), dark());
      pole.position.y = (h*0.85)/2; group.add(pole);
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(10, w/2), Math.max(8, w/2.4), h*0.18, 16), mat());
      shade.position.y = h*0.85 + (h*0.18)/2; group.add(shade);
      break;
    }
    case "table_lamp": {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(w/3, w/2.5, h*0.5, 16), dark());
      base.position.y = (h*0.5)/2; group.add(base);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(Math.max(8, w/1.6), h*0.5, 16, 1, true), mat());
      shade.position.y = h*0.5 + (h*0.5)/2; group.add(shade);
      break;
    }
    case "rug": {
      const rug = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), mat());
      rug.position.y = 0.5; group.add(rug);
      break;
    }
    case "wall_art":
    case "mirror": {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }));
      const inner = new THREE.Mesh(new THREE.BoxGeometry(w*0.92, h*0.92, 1),
        item.type === "mirror"
          ? new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.1, metalness: 0.6 })
          : mat());
      inner.position.z = 1.2;
      group.add(frame, inner);
      break;
    }
    case "plant": {
      const potH = Math.min(h*0.3, 25);
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(w/2.5, w/3, potH, 16),
        new THREE.MeshStandardMaterial({ color: 0x5a3a25, roughness: 0.9 }));
      pot.position.y = potH/2; group.add(pot);
      const foliageR = Math.max(15, w/2);
      const foliage = new THREE.Mesh(new THREE.SphereGeometry(foliageR, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.9 }));
      foliage.position.y = potH + foliageR*0.85; group.add(foliage);
      break;
    }
    case "curtains": {
      const curtain = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4), mat());
      curtain.position.y = h/2; group.add(curtain);
      break;
    }
    case "vase": {
      const v = new THREE.Mesh(new THREE.CylinderGeometry(w/2.5, w/2, h, 18), mat());
      v.position.y = h/2; group.add(v);
      break;
    }
    case "cushion": {
      const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat());
      c.position.y = h/2; group.add(c);
      break;
    }
    case "pendant_light": {
      const cordLen = Math.max(20, h);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, cordLen, 6),
        new THREE.MeshStandardMaterial({ color: 0x111111 }));
      cord.position.y = -cordLen/2; group.add(cord);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(Math.max(6, w/2), 16, 12),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, roughness: 0.4 }));
      bulb.position.y = -cordLen - Math.max(6, w/2); group.add(bulb);
      break;
    }
    default: {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat());
      box.position.y = h/2; group.add(box);
    }
  }

  setShadow(group);
  return group;
}

/** Place furniture in world space, snapping to walls based on wall_proximity. */
function placeFurniture(item: FurnitureItem, group: THREE.Object3D, roomW: number, roomD: number) {
  const halfW = roomW/2, halfD = roomD/2;
  const fw = item.width_cm, fd = item.depth_cm;
  let x = (item.x_position/100) * roomW - halfW;
  let z = (item.z_position/100) * roomD - halfD;

  const snapLeft = () => { x = -halfW + fw/2 + 2; };
  const snapRight = () => { x = halfW - fw/2 - 2; };
  const snapBack = () => { z = -halfD + fd/2 + 2; };
  const snapFront = () => { z = halfD - fd/2 - 2; };

  switch (item.wall_proximity) {
    case "against_left_wall": snapLeft(); break;
    case "against_right_wall": snapRight(); break;
    case "against_back_wall": snapBack(); break;
    case "against_front_wall": snapFront(); break;
    case "corner_left_back": snapLeft(); snapBack(); break;
    case "corner_right_back": snapRight(); snapBack(); break;
    case "corner_left_front": snapLeft(); snapFront(); break;
    case "corner_right_front": snapRight(); snapFront(); break;
    default: break;
  }

  // Keep inside room
  x = Math.max(-halfW + fw/2, Math.min(halfW - fw/2, x));
  z = Math.max(-halfD + fd/2, Math.min(halfD - fd/2, z));

  if (item.type === "wall_art" || item.type === "mirror") {
    // hang on back wall, centered using x_position
    group.position.set(x, Math.max(120, item.height_cm/2 + 100), -halfD + 2);
    return;
  }
  if (item.type === "curtains") {
    group.position.set(x, Math.max(item.height_cm/2, 100), -halfD + 2);
    return;
  }
  if (item.type === "pendant_light") {
    group.position.set(x, ROOM_H, z);
    return;
  }
  group.position.set(x, 0, z);
}

/** Build a window or door panel and attach it to the correct wall. */
function buildArchOnWall(feature: ArchFeature, roomW: number, roomD: number): THREE.Object3D {
  const isDoor = feature.type === "door";
  const w = feature.width_cm;
  const h = isDoor ? Math.max(180, feature.height_cm) : feature.height_cm;

  const group = new THREE.Group();
  const frameThick = 4;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xb6dcef, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.75,
    emissive: 0x6fa8c4, emissiveIntensity: 0.15,
  });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x8b6a4a, roughness: 0.85 });

  if (isDoor) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3), doorMat);
    group.add(door);
    if (feature.style === "barn") {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(w * 1.6, 4, 4),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 }),
      );
      rail.position.y = h/2 + 8;
      group.add(rail);
    } else if (feature.style === "french") {
      // split door with center gap
      const gap = new THREE.Mesh(new THREE.BoxGeometry(2, h, 4),
        new THREE.MeshStandardMaterial({ color: 0xffffff }));
      group.add(gap);
    } else if (feature.style === "sliding") {
      const track = new THREE.Mesh(new THREE.BoxGeometry(w, 2, 5),
        new THREE.MeshStandardMaterial({ color: 0x444444 }));
      track.position.y = h/2 + 4;
      group.add(track);
    }
  } else {
    // window: white frame border + light blue glass
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1), glassMat);
    group.add(glass);
    // 4 frame sides
    const top = new THREE.Mesh(new THREE.BoxGeometry(w + frameThick*2, frameThick, 3), frameMat);
    top.position.y = h/2 + frameThick/2;
    const bot = new THREE.Mesh(new THREE.BoxGeometry(w + frameThick*2, frameThick, 3), frameMat);
    bot.position.y = -h/2 - frameThick/2;
    const left = new THREE.Mesh(new THREE.BoxGeometry(frameThick, h, 3), frameMat);
    left.position.x = -w/2 - frameThick/2;
    const right = new THREE.Mesh(new THREE.BoxGeometry(frameThick, h, 3), frameMat);
    right.position.x = w/2 + frameThick/2;
    group.add(top, bot, left, right);
    if (feature.style === "double") {
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(2, h, 3), frameMat);
      group.add(mullion);
    }
  }

  // Position group on the correct wall
  const halfW = roomW/2, halfD = roomD/2;
  const along = feature.position_along_wall / 100;
  const verticalCenter = isDoor
    ? h/2 + 2
    : (feature.vertical_position/100) * ROOM_H + h/2;

  // small offset off the wall surface to avoid z-fighting
  const off = 2;
  switch (feature.wall) {
    case "back_wall": {
      const x = along * roomW - halfW;
      group.position.set(x, verticalCenter, -halfD + off);
      // facing into room (+z)
      break;
    }
    case "front_wall": {
      const x = along * roomW - halfW;
      group.position.set(x, verticalCenter, halfD - off);
      group.rotation.y = Math.PI;
      break;
    }
    case "left_wall": {
      const z = along * roomD - halfD;
      group.position.set(-halfW + off, verticalCenter, z);
      group.rotation.y = Math.PI / 2;
      break;
    }
    case "right_wall": {
      const z = along * roomD - halfD;
      group.position.set(halfW - off, verticalCenter, z);
      group.rotation.y = -Math.PI / 2;
      break;
    }
  }

  setShadow(group);
  return group;
}

export function Room3DViewer({ dreamImage, apiKey, fallbackWallColor = "#ece7df" }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (!dreamImage) { setAnalysis(null); return; }
    if (!apiKey) {
      setError("Add your Google AI Studio key in Settings to render the 3D view from your image.");
      setAnalysis(null);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const result = await analyzeDreamImage(dreamImage, apiKey);
        if (!cancelled) setAnalysis(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to analyze image");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dreamImage, apiKey]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !analysis) return;

    const roomW = analysis.room.room_width_estimate_cm;
    const roomD = analysis.room.room_depth_estimate_cm;
    const halfW = roomW/2, halfD = roomD/2;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f4f4f2");

    const camera = new THREE.PerspectiveCamera(40, width/height, 1, 5000);
    const camDist = Math.max(roomW, roomD) * 0.8;
    camera.position.set(camDist, 250, camDist);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, ROOM_H/3, 0);
    controls.minDistance = 150;
    controls.maxDistance = 1600;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.95);
    dir.position.set(roomW*0.6, 500, roomD*0.6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    scene.add(dir);

    const wallHex = normHex(analysis.room.wall_color_hex, fallbackWallColor);
    const floorHex = normHex(analysis.room.floor_color_hex, "#a17449");
    const ceilingHex = normHex(analysis.room.ceiling_color_hex, "#fafafa");

    const wallMat = new THREE.MeshStandardMaterial({ color: wallHex, side: THREE.BackSide, roughness: 0.95 });
    const floorMat = new THREE.MeshStandardMaterial({ color: floorHex, roughness: 0.85 });
    const ceilingMat = new THREE.MeshStandardMaterial({ color: ceilingHex, side: THREE.BackSide, roughness: 1 });

    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, ROOM_H), wallMat);
    backWall.position.set(0, ROOM_H/2, -halfD);
    backWall.rotation.y = Math.PI;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, ROOM_H), wallMat);
    leftWall.position.set(-halfW, ROOM_H/2, 0);
    leftWall.rotation.y = -Math.PI/2;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, ROOM_H),
      new THREE.MeshStandardMaterial({ color: wallHex, side: THREE.BackSide, roughness: 0.95, transparent: true, opacity: 0.18 }));
    rightWall.position.set(halfW, ROOM_H/2, 0);
    rightWall.rotation.y = Math.PI/2;
    scene.add(rightWall);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), ceilingMat);
    ceiling.position.y = ROOM_H;
    ceiling.rotation.x = Math.PI/2;
    scene.add(ceiling);

    // Architectural features (windows, doors, beams, ceiling lights)
    analysis.architectural.forEach((f) => {
      if (f.type === "beam") {
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(roomW, 12, 18),
          new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 }),
        );
        beam.position.set(0, ROOM_H - 8, (f.position_along_wall/100)*roomD - halfD);
        scene.add(beam);
        return;
      }
      if (f.type === "pendant_light") {
        const cordLen = Math.max(30, ROOM_H - f.vertical_position/100*ROOM_H);
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, cordLen, 6),
          new THREE.MeshStandardMaterial({ color: 0x111111 }));
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd97a, emissiveIntensity: 0.5 }));
        const x = (f.position_along_wall/100)*roomW - halfW;
        cord.position.set(x, ROOM_H - cordLen/2, 0);
        bulb.position.set(x, ROOM_H - cordLen - 8, 0);
        scene.add(cord, bulb);
        return;
      }
      const obj = buildArchOnWall(f, roomW, roomD);
      scene.add(obj);
    });

    // Furniture
    analysis.furniture.forEach((item) => {
      const obj = buildFurnitureGroup(item);
      placeFurniture(item, obj, roomW, roomD);
      scene.add(obj);
    });

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w/h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) (mat as THREE.Material).dispose();
      });
    };
  }, [analysis, fallbackWallColor]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted/80 backdrop-blur-sm">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm font-medium">Sage is scanning your room…</p>
        </div>
      )}
      {!loading && error && (
        <div className="absolute bottom-4 left-4 right-4 bg-destructive/90 text-destructive-foreground text-xs px-4 py-2.5 rounded-xl flex items-start gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {!loading && !error && !analysis && !dreamImage && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          Generate a 2D dream room first to view it in 3D.
        </div>
      )}
    </div>
  );
}
