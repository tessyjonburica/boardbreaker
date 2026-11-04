import sharp from "sharp";
import { BB100 } from "./board.js";
import type { Board, ComponentSpec } from "./types.js";

const W = 130;
const H = 96;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function compSvg(c: ComponentSpec): string {
  const f = c.footprint;
  if (!f || c.type === "trace") return "";
  const { x, y, w, h } = f;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const ref = c.ref;
  const val = c.value ?? "";
  let body = "";

  switch (c.type) {
    case "resistor":
      body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="#c9b28a" stroke="#6b5a3c" stroke-width="0.35"/>
      <rect x="${x + 0.5}" y="${y + h * 0.35}" width="${w - 1}" height="${h * 0.3}" fill="#7a5f3a" opacity="0.5"/>`;
      break;
    case "capacitor":
      body = `<circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) / 2}" fill="#2a2f36" stroke="#8a949e" stroke-width="0.4"/>
      <path d="M ${cx - w * 0.28} ${cy - h * 0.3} L ${cx - w * 0.28} ${cy + h * 0.3}" stroke="#d8dde2" stroke-width="0.9"/>
      <path d="M ${cx + w * 0.28} ${cy - h * 0.3} L ${cx + w * 0.28} ${cy + h * 0.3}" stroke="#d8dde2" stroke-width="0.9"/>`;
      break;
    case "diode":
      body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.6" fill="#1e2228" stroke="#8a949e" stroke-width="0.35"/>
      <rect x="${x + w - 1.1}" y="${y}" width="1.1" height="${h}" fill="#d8dde2"/>`;
      break;
    case "led":
      body = `<circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) / 2}" fill="#7a1f1f" stroke="#d8dde2" stroke-width="0.3" opacity="0.9"/>
      <circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) / 3.2}" fill="#e04a4a" opacity="0.85"/>`;
      break;
    case "regulator":
      body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.8" fill="#171a1f" stroke="#9aa4ae" stroke-width="0.45"/>
      <rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="1.2" fill="#3a414a"/>`;
      break;
    case "ic":
      body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.6" fill="#121417" stroke="#8a949e" stroke-width="0.4"/>
      <circle cx="${x + 3}" cy="${y + 3}" r="1" fill="#2a2f36" stroke="#6b747e" stroke-width="0.3"/>
      ${Array.from({ length: 7 }, (_, i) => `<rect x="${x + 2 + i * 2.2}" y="${y - 1}" width="1.1" height="1" fill="#c9a227"/>`).join("")}
      ${Array.from({ length: 7 }, (_, i) => `<rect x="${x + 2 + i * 2.2}" y="${y + h}" width="1.1" height="1" fill="#c9a227"/>`).join("")}
      <text x="${cx}" y="${cy + 0.7}" font-family="Consolas,monospace" font-size="1.7" fill="#9aa4ae" text-anchor="middle">${esc(val)}</text>`;
      break;
    case "connector":
      body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.8" fill="#20242a" stroke="#8a949e" stroke-width="0.45"/>
      ${Array.from({ length: 3 }, (_, i) => `<circle cx="${x + 2.5 + i * 3.2}" cy="${cy}" r="1.1" fill="#0b0d10" stroke="#c9a227" stroke-width="0.35"/>`).join("")}`;
      break;
    case "switch":
      body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.8" fill="#2a2f36" stroke="#9aa4ae" stroke-width="0.4"/>
      <circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) / 3}" fill="#c9c2b4" stroke="#6b5a3c" stroke-width="0.4"/>`;
      break;
    case "crystal":
      body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.2" fill="#b8c0c8" stroke="#6b747e" stroke-width="0.4"/>
      <rect x="${x + 0.8}" y="${y + 0.8}" width="${w - 1.6}" height="${h - 1.6}" rx="0.8" fill="#d8dde2" opacity="0.5"/>`;
      break;
    default:
      body = "";
  }

  if (c.type === "testpoint") {
    return `<g><circle cx="${cx}" cy="${cy}" r="1.4" fill="#c9a227" stroke="#f0d98a" stroke-width="0.3"/>
      <text x="${cx + 2.2}" y="${cy + 0.6}" font-family="Consolas,monospace" font-size="1.7" fill="#e8e2c8">${esc(ref)}</text></g>`;
  }

  let valueLine = "";
  if (c.type === "capacitor") {
    valueLine = `<text x="${x + w + 0.9}" y="${cy + 0.5}" font-family="Consolas,monospace" font-size="1.35" fill="#c8d2c0">${esc(val)}</text>`;
  } else if (c.type === "regulator") {
    valueLine = `<text x="${cx}" y="${y + h + 2.0}" font-family="Consolas,monospace" font-size="1.15" fill="#c8d2c0" text-anchor="middle">${esc(val)}</text>`;
  } else if (c.type !== "ic") {
    valueLine = `<text x="${cx}" y="${y + h + 2.1}" font-family="Consolas,monospace" font-size="1.45" fill="#c8d2c0" text-anchor="middle">${esc(val)}</text>`;
  }
  return `<g>${body}
    <text x="${cx}" y="${y - 1.1}" font-family="Consolas,monospace" font-size="2.0" fill="#f0ead6" text-anchor="middle">${esc(ref)}</text>
    ${valueLine}
  </g>`;
}

function trace(points: [number, number][], color: string, width: number): string {
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

export function boardSvg(board: Board = BB100): string {
  const comps = board.components.map(compSvg).join("\n");
  const tps = board.testPoints
    .map((tp) => {
      const f = tp.footprint ?? { x: 10, y: 76, w: 3, h: 3 };
      const x = f.x + f.w / 2;
      const y = f.y + f.h / 2;
      return `<g><circle cx="${x}" cy="${y}" r="1.35" fill="#c9a227" stroke="#f0d98a" stroke-width="0.3"/>
        <text x="${x + 2.0}" y="${y + 0.6}" font-family="Consolas,monospace" font-size="1.65" fill="#e8e2c8">${tp.id}</text></g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 10}" height="${H * 10}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="pcb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1f6b45"/>
      <stop offset="55%" stop-color="#18573a"/>
      <stop offset="100%" stop-color="#12422c"/>
    </linearGradient>
    <pattern id="pour" width="4" height="4" patternUnits="userSpaceOnUse">
      <path d="M 0 0 L 0 4 M 0 0 L 4 0" stroke="#2f8f5b" stroke-width="0.18"/>
    </pattern>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0.8" dy="1.2" stdDeviation="1.0" flood-color="#000" flood-opacity="0.55"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="#0b0f12"/>
  <rect x="5" y="5" width="120" height="80" rx="3.5" fill="url(#pcb)" stroke="#0a2a1c" stroke-width="0.7" filter="url(#shadow)"/>
  <rect x="7" y="7" width="116" height="76" rx="2.5" fill="url(#pour)" opacity="0.35"/>

  <g opacity="0.9">
    ${trace([[20, 17], [26, 17]], "#c9a227", 0.9)}
    ${trace([[33, 17], [38, 17]], "#c9a227", 0.9)}
    ${trace([[43, 17], [48, 17], [48, 19], [58, 19]], "#c9a227", 0.9)}
    ${trace([[66, 18], [70, 18], [70, 20], [72, 20]], "#c9a227", 0.9)}
    ${trace([[70, 18], [84, 18]], "#c9a227", 0.9)}
    ${trace([[66, 18], [66, 30], [61, 30], [61, 38]], "#c9a227", 0.9)}
    ${trace([[72, 20], [72, 56]], "#c9a227", 0.7)}
    ${trace([[72, 20], [72, 66], [34, 66]], "#c9a227", 0.7)}
    ${trace([[92, 18], [96, 18], [96, 20]], "#c9a227", 0.8)}
    ${trace([[92, 18], [92, 56]], "#c9a227", 0.7)}
    ${trace([[41.5, 45], [39, 45], [39, 50]], "#7fd1a3", 0.55)}
    ${trace([[41.5, 45], [52, 45], [52, 38]], "#7fd1a3", 0.55)}
    ${trace([[73.5, 63], [80, 63], [80, 60]], "#7fd1a3", 0.5)}
    ${trace([[93.5, 63], [100, 63], [100, 60]], "#7fd1a3", 0.5)}
    ${trace([[78, 40], [88, 40]], "#7fd1a3", 0.45)}
    ${trace([[78, 42], [88, 48]], "#7fd1a3", 0.45)}
    ${trace([[10, 72], [115, 72]], "#3f7f5f", 1.1)}
  </g>

  ${comps}
  ${tps}

  <g>
    <text x="7" y="93.4" font-family="Consolas,monospace" font-size="3.0" fill="#d8d2b8" letter-spacing="0.4">BB-100 SENSOR NODE</text>
    <text x="7" y="90.2" font-family="Consolas,monospace" font-size="1.7" fill="#9aa48e">REV A  /  BoardBreaker bench</text>
    <text x="123" y="93.4" font-family="Consolas,monospace" font-size="1.8" fill="#9aa48e" text-anchor="end">9V DC</text>
  </g>
</svg>`;
}

export async function renderBoardPng(board: Board = BB100, scale = 10): Promise<Buffer> {
  const svg = boardSvg(board);
  return sharp(Buffer.from(svg), { density: 72 * (scale / 10) })
    .resize(W * scale, H * scale)
    .png()
    .toBuffer();
}
