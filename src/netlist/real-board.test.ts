import { describe, expect, it } from "vitest";
import { ESP32_LIPO_FAULTS, loadEsp32Lipo } from "../boards/olimex-esp32-devkit-lipo.js";
import { parseResistance } from "./board.js";
import { applyFault } from "../bench/faults.js";
import { solveBoard } from "../bench/solver.js";

const { board, netlist } = loadEsp32Lipo();

function rails(components = board.components) {
  const r = solveBoard(board, components, { powered: true });
  const out: Record<string, number> = {};
  for (const tp of board.testPoints) out[tp.id] = r.voltages[tp.node] ?? 0;
  return { out, converged: r.converged };
}

describe("kicad netlist", () => {
  it("reads the real Olimex board", () => {
    expect(netlist.components.length).toBe(54);
    expect(netlist.nets.length).toBe(72);
    expect(netlist.title).toContain("ESP32-DevKit-Lipo");
    expect(netlist.rev).toBe("C");
  });

  it("gives every part its pin to net map", () => {
    const u3 = netlist.components.find((c) => c.ref === "U3")!;
    expect(u3.pins["3"]).toBe("Net-(L1-Pad1)");
    const u5 = netlist.components.find((c) => c.ref === "U5")!;
    expect(u5.pins["2"]).toBe("+3V3");
  });

  it("parses resistor values off the silkscreen", () => {
    expect(parseResistance("220k/R0402")).toBe(220000);
    expect(parseResistance("49.9k/1%/R0402")).toBeCloseTo(49900, 3);
    expect(parseResistance("220R/R0402")).toBe(220);
    expect(parseResistance("NA/R0402")).toBeUndefined();
    expect(parseResistance("DNP")).toBeUndefined();
  });
});

describe("esp32 devkit lipo dc model", () => {
  it("converges with a healthy power tree", () => {
    const { out, converged } = rails();
    expect(converged).toBe(true);
    // 5V from USB, one diode drop to +5V, another into the buck, 3.24V target
    expect(out.TP1).toBeGreaterThan(4.9);
    expect(out.TP2).toBeGreaterThan(4.5);
    expect(out.TP2).toBeLessThan(4.9);
    expect(out.TP3).toBeLessThan(out.TP2);
    expect(out.TP4).toBeGreaterThan(3.1);
    expect(out.TP4).toBeLessThan(3.3);
    // no battery fitted
    expect(out.TP6).toBeCloseTo(0, 3);
  });

  it("has a distinct probe signature for every rail fault", () => {
    const healthy = rails().out;
    const round = (out: Record<string, number>) =>
      board.testPoints.map((tp) => Math.round(out[tp.id] * 10) / 10);
    const healthyVector = round(healthy);
    const seen: { id: string; vector: number[] }[] = [];
    for (const fault of ESP32_LIPO_FAULTS) {
      const { out } = rails(applyFault(board, fault));
      const vector = round(out);
      if (fault.symptomOnly) {
        // A dead USB bridge is invisible on the rails; only enumeration changes.
        for (let i = 0; i < vector.length; i++) expect(vector[i]).toBeCloseTo(healthyVector[i], 1);
        continue;
      }
      expect(vector).not.toEqual(healthyVector);
      seen.push({ id: fault.id, vector });
    }
    for (let i = 0; i < seen.length; i++) {
      for (let j = i + 1; j < seen.length; j++) {
        expect(seen[i].vector, `${seen[i].id} collides with ${seen[j].id}`).not.toEqual(seen[j].vector);
      }
    }
  });

  it("keeps the switched node alive when only the inductor is open", () => {
    const fault = ESP32_LIPO_FAULTS.find((f) => f.id === "F104")!;
    const { out } = rails(applyFault(board, fault));
    expect(out.TP5).toBeGreaterThan(3.0); // converter still switching
    expect(out.TP4).toBeLessThan(0.1); // rail dead
  });

  it("shows a healthy rail when only the usb bridge is dead", () => {
    const fault = ESP32_LIPO_FAULTS.find((f) => f.id === "F108")!;
    const { out } = rails(applyFault(board, fault));
    expect(out.TP4).toBeGreaterThan(3.1);
  });
});
