import { readFileSync } from "node:fs";
import { metaJson } from "./client.js";
import type { Box } from "./sam.js";

export interface MappedComponent {
  box: number;
  ref: string;
  type: string;
  value: string;
}

export interface ComponentMap {
  components: MappedComponent[];
}

const SCHEMA = {
  type: "object",
  properties: {
    components: {
      type: "array",
      items: {
        type: "object",
        properties: {
          box: { type: "integer" },
          ref: { type: "string" },
          type: { type: "string" },
          value: { type: "string" },
        },
        required: ["box", "ref", "type", "value"],
      },
    },
  },
  required: ["components"],
} as const;

/**
 * Read the silkscreen for each SAM box and turn segmentation into a component
 * map. The image is load-bearing: the refs and values come from the photo.
 */
export async function mapComponents(imagePath: string, boxes: Box[]): Promise<ComponentMap> {
  const b64 = readFileSync(imagePath).toString("base64");
  const boxList = boxes.map((b) => b.id).join(", ");
  const prompt = [
    "You are reading a PCB image. A segmentation model drew numbered boxes on it.",
    `The box ids are: ${boxList}.`,
    "For each box that contains a real component, read the white silkscreen reference designator printed next to it (for example J1, F1, D1, C1, U1, C2, U2, C3, U3, R1, SW1, R2, D2, R3, D3, Y1, C4, C5, J2) and the component type and value.",
    "Skip boxes that are only test-point pads (TP1 to TP10) or bare copper. Do not invent a ref you cannot read.",
    "Return one entry per real component box.",
  ].join(" ");

  const res = await metaJson<any>("/responses", {
    model: "muse-spark-1.3",
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
    text: {
      format: {
        type: "json_schema",
        name: "ComponentMap",
        schema: SCHEMA,
      },
    },
  });

  const text = extractText(res);
  return JSON.parse(text) as ComponentMap;
}

export function extractText(res: any): string {
  for (const item of res.output ?? []) {
    if (item.type === "message") {
      for (const c of item.content ?? []) {
        if (c.type === "output_text" && c.text) return c.text;
      }
    }
  }
  throw new Error("No output_text in response");
}
