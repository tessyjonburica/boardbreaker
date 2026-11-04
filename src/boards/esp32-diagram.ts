import sharp from "sharp";
import type { Board, ComponentSpec, TestPoint } from "../bench/types.js";

/**
 * Schematic-style diagram of the real ESP32-DevKit-LiPo power tree, laid out by
 * hand from the netlist. This is a schematic, not a photo: the UI uses it as the
 * canvas for probes and suspects when a board has no photograph.
 */
export const DIAGRAM_W = 1320;
export const DIAGRAM_H = 790;

interface Box {
  ref: string;
  value: string;
  x: number;
  y: number;
  w: number;
  h: number;
  role?: "part" | "module" | "connector" | "battery";
}

const BOXES: Box[] = [
  { ref: "J1", value: "USB micro", x: 40, y: 150, w: 130, h: 74, role: "connector" },
  { ref: "D1", value: "1N5819", x: 220, y: 150, w: 110, h: 74 },
  { ref: "D2", value: "1N5819", x: 400, y: 150, w: 110, h: 74 },
  { ref: "U3", value: "SY8089 buck", x: 600, y: 140, w: 150, h: 94 },
  { ref: "L1", value: "2.2uH", x: 810, y: 150, w: 110, h: 74 },
  { ref: "U2", value: "CH340T", x: 220, y: 330, w: 140, h: 96 },
  { ref: "C7", value: "22uF", x: 930, y: 300, w: 80, h: 70 },
  { ref: "R11", value: "220k", x: 1010, y: 300, w: 80, h: 55 },
  { ref: "R12", value: "49.9k", x: 1010, y: 390, w: 80, h: 55 },
  { ref: "U5", value: "ESP32-WROOM-32D", x: 1110, y: 300, w: 150, h: 140, role: "module" },
  { ref: "U1", value: "BL4054 charger", x: 220, y: 520, w: 140, h: 90 },
  { ref: "FET1", value: "P-MOSFET", x: 460, y: 520, w: 120, h: 80 },
  { ref: "BAT1", value: "LiPo", x: 40, y: 520, w: 130, h: 80, role: "battery" },
];

const WIRES: { points: [number, number][]; label?: string }[] = [
  { points: [[170, 187], [220, 187]], label: "VBUS" },
  { points: [[330, 187], [400, 187]], label: "+5V" },
  { points: [[510, 187], [600, 187]], label: "VSYS" },
  { points: [[750, 187], [810, 187]], label: "SW" },
  { points: [[920, 187], [1240, 187]], label: "+3V3" },
  // 3V3 loads
  { points: [[960, 187], [960, 300]] },
  { points: [[1050, 187], [1050, 300]] },
  { points: [[1050, 355], [1050, 390]] },
  { points: [[1150, 187], [1150, 300]] },
  // USB data to the USB-serial bridge
  { points: [[105, 224], [105, 300], [220, 300], [220, 330]] },
  // +5V feeds the LiPo charger
  { points: [[365, 187], [365, 262], [200, 262], [200, 565], [220, 565]] },
  // battery path: cell -> charger, cell -> P-MOSFET -> +5V
  { points: [[170, 560], [220, 560]] },
  { points: [[105, 600], [105, 640], [460, 640], [460, 600]] },
  { points: [[560, 520], [560, 232], [365, 232], [365, 187]] },
  // ground bus
  { points: [[220, 400], [178, 400], [178, 700]] },
  { points: [[290, 610], [290, 700]] },
  { points: [[105, 600], [105, 700]] },
  { points: [[970, 370], [970, 700]] },
  { points: [[1050, 445], [1050, 700]] },
  { points: [[1185, 440], [1185, 700]] },
  { points: [[105, 700], [1240, 700]] },
];

const PROBES: { id: string; label: string; x: number; y: number }[] = [
  { id: "TP1", label: "VBUS", x: 195, y: 187 },
  { id: "TP2", label: "5V", x: 365, y: 187 },
  { id: "TP3", label: "VSYS", x: 555, y: 187 },
  { id: "TP4", label: "3V3", x: 1215, y: 187 },
  { id: "TP5", label: "SW", x: 780, y: 187 },
  { id: "TP6", label: "VBAT", x: 300, y: 640 },
];

const FONT = "'IBM Plex Mono', 'Consolas', monospace";

export function diagramSvg(): string {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${DIAGRAM_W}" height="${DIAGRAM_H}" viewBox="0 0 ${DIAGRAM_W} ${DIAGRAM_H}">`,
  );
  parts.push(`<rect width="100%" height="100%" fill="#0b120e"/>`);
  // grid
  for (let x = 40; x < DIAGRAM_W; x += 40) {
    parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${DIAGRAM_H}" stroke="#121c16" stroke-width="1"/>`);
  }
  for (let y = 40; y < DIAGRAM_H; y += 40) {
    parts.push(`<line x1="0" y1="${y}" x2="${DIAGRAM_W}" y2="${y}" stroke="#121c16" stroke-width="1"/>`);
  }

  for (const w of WIRES) {
    const d = w.points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ");
    parts.push(`<path d="${d}" fill="none" stroke="#4d7f63" stroke-width="3" stroke-linecap="round"/>`);
  }

  for (const b of BOXES) {
    const stroke = b.role === "module" ? "#d8a13a" : "#3b4a40";
    const fill = b.role === "module" ? "#1c2418" : "#141d18";
    parts.push(
      `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`,
    );
    parts.push(
      `<text x="${b.x + 8}" y="${b.y - 10}" fill="#d8a13a" font-family="${FONT}" font-size="15" letter-spacing="0.5">${b.ref}</text>`,
    );
    parts.push(
      `<text x="${b.x + 10}" y="${b.y + 26}" fill="#e8f0ea" font-family="${FONT}" font-size="13">${escapeXml(b.value)}</text>`,
    );
  }

  // rail labels
  const labels: [string, number, number][] = [
    ["+5V_USB", 90, 116],
    ["+5V", 350, 140],
    ["VSYS", 540, 140],
    ["+3V3", 1030, 143],
    ["GND", 105, 700],
  ];
  for (const [text, x, y] of labels) {
    parts.push(
      `<text x="${x}" y="${y}" fill="#7fd1a0" font-family="${FONT}" font-size="14" letter-spacing="1">${text}</text>`,
    );
  }

  // ground bus
  parts.push(`<line x1="40" y1="680" x2="1140" y2="680" stroke="#3b4a40" stroke-width="3"/>`);
  for (const x of [105, 290, 560, 700, 910, 1080]) {
    parts.push(`<line x1="${x}" y1="${x === 105 ? 600 : 640}" x2="${x}" y2="680" stroke="#3b4a40" stroke-width="2"/>`);
  }

  for (const p of PROBES) {
    parts.push(
      `<circle cx="${p.x}" cy="${p.y}" r="9" fill="#0b120e" stroke="#7fd1a0" stroke-width="2.5"/>`,
      `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#7fd1a0"/>`,
      `<text x="${p.x - 14}" y="${p.y - 18}" fill="#a9c9b6" font-family="${FONT}" font-size="13">${p.id}</text>`,
    );
  }

  parts.push(`</svg>`);
  return parts.join("\n");
}

function escapeXml(s: string): string {
  return s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c);
}

export async function renderDiagramPng(scale = 1.5): Promise<Buffer> {
  return sharp(Buffer.from(diagramSvg()))
    .resize(Math.round(DIAGRAM_W * scale))
    .png()
    .toBuffer();
}

/** Attaches diagram geometry so the existing overlay can place markers. */
export function withDiagramGeometry(board: Board): {
  board: Board;
  components: ComponentSpec[];
  testPoints: TestPoint[];
} {
  const boxes = new Map(BOXES.map((b) => [b.ref, b]));
  const probes = new Map(PROBES.map((p) => [p.id, p]));

  const components = board.components.map((c) => {
    const box = boxes.get(c.id);
    return box
      ? { ...c, footprint: { x: box.x, y: box.y, w: box.w, h: box.h } }
      : c;
  });

  const testPoints = board.testPoints.map((tp) => {
    const p = probes.get(tp.id);
    return p
      ? { ...tp, footprint: { x: p.x - 9, y: p.y - 9, w: 18, h: 18 } }
      : tp;
  });

  return {
    board: { ...board, components, testPoints },
    components,
    testPoints,
  };
}
