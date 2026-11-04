import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Board, ComponentSpec, Fault } from "../bench/types.js";
import { buildBoard, type BoardProfile } from "../netlist/board.js";
import { parseKicadNetlist, type Netlist } from "../netlist/kicad.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const NETLIST_PATH = join(HERE, "..", "..", "boards", "olimex-esp32-devkit-lipo", "rev-c.net");

/**
 * Olimex ESP32-DevKit-LiPo Rev C. Real open-hardware board, real KiCad netlist
 * (vendored under boards/, GPL as published by Olimex).
 *
 * Power tree, as drawn on the schematic:
 *   USB VBUS -> D1 -> +5V -> D2 -> VSYS -> U3 (SY8089 buck) -> L1 -> +3V3
 *   VBAT -> FET1 -> +5V   (battery path, FET off while USB is present)
 *   +5V -> U1 (BL4054) -> VBAT  (charger)
 */
export const ESP32_LIPO_PROFILE: BoardProfile = {
  id: "esp32-devkit-lipo",
  name: "Olimex ESP32-DevKit-LiPo",
  description:
    "Open-hardware ESP32 development board: USB input, steering diode, buck converter to 3.3V, LiPo charger and battery path.",
  source: { net: "+5V_USB", voltage: 5.0, seriesResistance: 0.6 },
  groundNet: "GND",
  nets: {
    VSYS: "Net-(C6-Pad1)",
    SW: "Net-(L1-Pad1)",
  },
  strict: true,
  parts: [
    // steering diode: USB VBUS -> +5V
    { ref: "D1", role: "diode", pins: { A: "2", K: "1" }, params: { vf: 0.3, resistance: 0.15 } },
    // steering diode: +5V -> buck input
    { ref: "D2", role: "diode", pins: { A: "2", K: "1" }, params: { vf: 0.3, resistance: 0.15 } },
    { ref: "R1" }, // 10k bleeder on +5V
    { ref: "R11" }, // 220k feedback top
    { ref: "R12" }, // 49.9k feedback bottom, 0.6V ref -> 3.24V out
    { ref: "R15" }, // 220k rail sense
    { ref: "R16" }, // 470k rail sense
    { ref: "C7", role: "capacitor" }, // 22uF on +3V3, open at DC but shorts when it fails
    { ref: "L1", role: "trace", resistance: 0.072 },
    {
      ref: "U3",
      role: "regulator",
      pins: { IN: "4", OUT: "3" },
      params: { vtarget: 3.24, dropout: 0.25, resistance: 0.08, currentLimit: 1.5, quiescent: 0.0002 },
    },
    { ref: "U5", role: "ic", pins: { VCC: "2", GND: "1" }, params: { load: 90 } },
    { ref: "U2", role: "ic", pins: { VCC: "19", GND: "8" }, params: { load: 200 } },
    // battery path P-MOSFET, off while USB is plugged in
    { ref: "FET1", role: "switch", pins: { "1": "1", "2": "3" }, params: { closed: false, resistance: 0.05 } },
  ],
  probes: [
    { id: "TP1", label: "VBUS at USB connector", net: "+5V_USB" },
    { id: "TP2", label: "5V after steering diode", net: "+5V" },
    { id: "TP3", label: "Buck input", net: "VSYS" },
    { id: "TP4", label: "3.3V rail", net: "+3V3" },
    { id: "TP5", label: "Buck switch node", net: "SW" },
    { id: "TP6", label: "Battery terminal", net: "VBAT" },
  ],
};

/** Faults planted on the real board. Every one changes a rail the probes can see. */
export const ESP32_LIPO_FAULTS: Fault[] = [
  {
    id: "F101",
    label: "USB steering diode open",
    description: "D1 open. VBUS arrives at the connector but nothing downstream is powered.",
    componentId: "D1",
    mode: "open",
    expectedSuspects: ["D1"],
    symptom: "Board is completely dead on USB power. No 3.3V rail, no boot, no LEDs.",
  },
  {
    id: "F102",
    label: "Buck input diode open",
    description: "D2 open. The +5V rail is alive but the buck never gets input.",
    componentId: "D2",
    mode: "open",
    expectedSuspects: ["D2"],
    symptom: "Board is dead on USB power. 5V is present at the input side.",
  },
  {
    id: "F103",
    label: "Buck converter dead",
    description: "U3 open. Input is fine, the converter produces nothing.",
    componentId: "U3",
    mode: "open",
    expectedSuspects: ["U3"],
    symptom: "Dead board on USB. Input rail measures normal.",
  },
  {
    id: "F104",
    label: "Buck inductor open",
    description: "L1 open. The converter switches but its output never reaches the rail.",
    componentId: "L1",
    mode: "open",
    expectedSuspects: ["L1"],
    symptom: "No 3.3V rail, board dead. Converter input is normal.",
  },
  {
    id: "F105",
    label: "3.3V rail shorted",
    description: "C7 shorted. The decoupling capacitor fails short and drags the rail to ground.",
    componentId: "C7",
    mode: "short",
    expectedSuspects: ["C7"],
    symptom: "Dead board, 3.3V rail reads near zero, supply gets warm.",
  },
  {
    id: "F106",
    label: "Module short on 3.3V",
    description: "U5 fails with a short across its supply pins.",
    componentId: "U5",
    mode: "short",
    expectedSuspects: ["U5"],
    symptom: "Dead board, 3.3V rail collapses, nothing gets warm enough to notice.",
  },
  {
    id: "F107",
    label: "USB bridge shorted on VBUS",
    description: "U2 fails short across its supply pins and drags the USB rail down.",
    componentId: "U2",
    mode: "short",
    expectedSuspects: ["U2"],
    symptom: "Board dead on USB power. The 5V rail at the connector reads low, not normal.",
  },
  {
    id: "F108",
    label: "USB-UART bridge dead",
    description: "U2 open. All rails are healthy, the board simply will not enumerate.",
    componentId: "U2",
    mode: "open",
    expectedSuspects: ["U2"],
    symptom: "Rails look normal but the board never appears on USB. No serial port.",
    symptomOnly: true,
  },
];

let cache: { netlist: Netlist; board: Board; components: ComponentSpec[] } | undefined;

export function loadEsp32Lipo() {
  if (cache) return cache;
  const netlist = parseKicadNetlist(readFileSync(NETLIST_PATH, "utf8"));
  const { board, components } = buildBoard(netlist, ESP32_LIPO_PROFILE);
  cache = { netlist, board, components };
  return cache;
}
