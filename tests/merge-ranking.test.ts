import { describe, expect, it } from "vitest";
import { mergeRanking } from "../src/agent/diagnose.js";

const suspect = (ref: string, confidence: number) => ({ ref, confidence, reason: `${ref} reason` });

describe("mergeRanking", () => {
  it("ranks an exact-fit part above a more confident pure guess", () => {
    const ranked = mergeRanking(
      [suspect("R1", 0.6), suspect("SW1", 0.4)],
      [{ faultId: "F13", label: "switch stuck", expected: ["SW1"], score: 0 }],
    );
    expect(ranked.map((r) => r.ref)).toEqual(["SW1", "R1"]);
    expect(ranked[0].solver).toEqual(["F13"]);
    expect(ranked[1].solver).toBeUndefined();
  });

  it("keeps model order when the solver is not an exact fit", () => {
    const ranked = mergeRanking(
      [suspect("R1", 0.6), suspect("SW1", 0.4)],
      [{ faultId: "F13", label: "switch stuck", expected: ["SW1"], score: 0.42 }],
    );
    expect(ranked.map((r) => r.ref)).toEqual(["R1", "SW1"]);
    expect(ranked.every((r) => r.solver === undefined)).toBe(true);
  });

  it("adds a part the model never named when the solver fits it exactly", () => {
    const ranked = mergeRanking(
      [suspect("R1", 0.6)],
      [{ faultId: "F10", label: "MCU VCC short", expected: ["U3"], score: 0 }],
    );
    expect(ranked[0].ref).toBe("U3");
    expect(ranked[0].confidence).toBe(0.25);
    expect(ranked[0].solver).toEqual(["F10"]);
  });

  it("preserves model confidence so the display stays honest", () => {
    const ranked = mergeRanking(
      [suspect("C2", 0.31), suspect("U1", 0.28)],
      [{ faultId: "F04", label: "cap short", expected: ["C2"], score: 1e-9 }],
    );
    expect(ranked[0]).toMatchObject({ ref: "C2", confidence: 0.31, solver: ["F04"] });
  });

  it("sorts solver-backed parts by model confidence inside the group", () => {
    const ranked = mergeRanking(
      [suspect("R2", 0.9), suspect("C2", 0.5), suspect("U1", 0.7)],
      [
        { faultId: "F04", label: "cap short", expected: ["C2"], score: 0 },
        { faultId: "F07", label: "mcu rail short", expected: ["U1"], score: 0 },
      ],
    );
    expect(ranked.map((r) => r.ref)).toEqual(["U1", "C2", "R2"]);
  });
});
