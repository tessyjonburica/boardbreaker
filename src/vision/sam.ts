import { readFileSync } from "node:fs";
import sharp from "sharp";
import { metaFetch, readTextStream } from "./client.js";

export interface Box {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  h: number;
  confidence?: number;
}

export interface SegmentResult {
  prompt: string;
  boxes: Box[];
  raw: string;
}

/** Ask SAM 3.1 for every match of a short noun phrase in the image. */
export async function segmentImage(imagePath: string, prompt: string): Promise<SegmentResult> {
  const b64 = readFileSync(imagePath).toString("base64");
  const res = await metaFetch(
    "/responses",
    {
      model: "sam-3.1",
      input: [
        {
          type: "message",
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: `data:image/png;base64,${b64}` },
          ],
        },
      ],
      stream: true,
      metadata: { include_confidence: "true" },
    },
    true,
  );
  const raw = await readTextStream(res);
  return { prompt, boxes: parseBoxes(raw), raw };
}

export function parseBoxes(text: string): Box[] {
  const re =
    /<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=(\d+);h=(\d+)(?:;c=([\d.]+))?\|>/g;
  const boxes: Box[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    boxes.push({
      id: i++,
      x1: Number(m[1]),
      y1: Number(m[2]),
      x2: Number(m[3]),
      y2: Number(m[4]),
      w: Number(m[5]),
      h: Number(m[6]),
      confidence: m[7] ? Number(m[7]) : undefined,
    });
  }
  return boxes;
}

/** Draw labelled boxes over the board image. */
export async function drawBoxes(
  imagePath: string,
  boxes: Box[],
  outPath: string,
  width: number,
  height: number,
): Promise<void> {
  const colors = ["#ffd166", "#06d6a0", "#ef476f", "#118ab2", "#f78c6b", "#c77dff"];
  const marks = boxes
    .map((b, i) => {
      const color = colors[i % colors.length];
      const bw = b.x2 - b.x1;
      const bh = b.y2 - b.y1;
      return `<g>
        <rect x="${b.x1}" y="${b.y1}" width="${bw}" height="${bh}" fill="none" stroke="${color}" stroke-width="3"/>
        <rect x="${b.x1}" y="${Math.max(0, b.y1 - 22)}" width="28" height="22" fill="${color}" opacity="0.92"/>
        <text x="${b.x1 + 6}" y="${Math.max(16, b.y1 - 6)}" font-family="Consolas,monospace" font-size="16" fill="#101418">${i}</text>
      </g>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="none"/>
    ${marks}
  </svg>`;

  await sharp(imagePath)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outPath);
}
