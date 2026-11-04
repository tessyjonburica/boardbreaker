import { describe, expect, it } from "vitest";
import { BB100 } from "../src/bench/board.js";
import { applyFault, FAULTS } from "../src/bench/faults.js";
import { measureResistance, measureVoltage, allVoltages } from "../src/bench/readings.js";
import { solveBoard } from "../src/bench/solver.js";

const healthy = BB100.components;

describe("BB-100 healthy board", () => {
  it("powers all rails", () => {
    const v = allVoltages(BB100, healthy);
    expect(v.TP1).toBeGreaterThan(8.9);
    expect(v.TP2).toBeGreaterThan(8.2);
    expect(v.TP2).toBeLessThan(8.4);
    expect(v.TP3).toBeCloseTo(5.0, 1);
    expect(v.TP4).toBeCloseTo(5.0, 1);
    expect(v.TP5).toBeCloseTo(3.3, 1);
    expect(v.TP6).toBeCloseTo(5.0, 1);
    expect(v.TP7).toBeGreaterThan(1.9);
    expect(v.TP7).toBeLessThan(2.2);
  });

  it("has a plausible resistance at the 5V rail", () => {
    const r = measureResistance(BB100, healthy, "5V");
    expect(r.value).toBeGreaterThan(150);
    expect(r.value).toBeLessThan(260);
  });
});

describe("fault cases", () => {
  it("has a distinct snapshot for every fault", () => {
    const baseline = JSON.stringify(allVoltages(BB100, healthy));
    for (const fault of FAULTS) {
      const board = applyFault(BB100, fault);
      const solved = solveBoard(BB100, board, { powered: true });
      expect(solved.converged, fault.id).toBe(true);
      expect(JSON.stringify(allVoltages(BB100, board)), fault.id).not.toBe(baseline);
    }
  });

  it("blown fuse kills every rail", () => {
    const f = FAULTS.find((x) => x.id === "F01")!;
    const v = allVoltages(BB100, applyFault(BB100, f));
    expect(v.TP4).toBeCloseTo(0, 1);
    expect(v.TP5).toBeCloseTo(0, 1);
  });

  it("open 5V trace leaves the regulator output alive", () => {
    const f = FAULTS.find((x) => x.id === "F07")!;
    const v = allVoltages(BB100, applyFault(BB100, f));
    expect(v.TP3).toBeCloseTo(5.0, 1);
    expect(v.TP4).toBeCloseTo(0, 1);
  });

  it("dead 3V3 regulator leaves 5V alive", () => {
    const f = FAULTS.find((x) => x.id === "F08")!;
    const v = allVoltages(BB100, applyFault(BB100, f));
    expect(v.TP4).toBeCloseTo(5.0, 1);
    expect(v.TP5).toBeCloseTo(0, 1);
  });

  it("shorted 5V cap and shorted MCU differ by resistance", () => {
    const capFault = FAULTS.find((x) => x.id === "F06")!;
    const mcuFault = FAULTS.find((x) => x.id === "F10")!;
    const capR = measureResistance(BB100, applyFault(BB100, capFault), "5V");
    const mcuR = measureResistance(BB100, applyFault(BB100, mcuFault), "5V");
    expect(capR.value).toBeLessThan(1);
    expect(mcuR.value).toBeGreaterThan(0.5);
    expect(mcuR.value).toBeLessThan(1.5);
  });

  it("stuck reset reads zero", () => {
    const f = FAULTS.find((x) => x.id === "F13")!;
    const reading = measureVoltage(BB100, applyFault(BB100, f), "RESET");
    expect(reading.value).toBeCloseTo(0, 2);
  });

  it("registry fault keeps the LED node at 5V", () => {
    const f = FAULTS.find((x) => x.id === "F14")!;
    const reading = measureVoltage(BB100, applyFault(BB100, f), "LED_A");
    expect(reading.value).toBeCloseTo(5.0, 1);
  });
});
