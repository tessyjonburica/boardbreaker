import type { Board, ComponentSpec, Fault } from "./types.js";

/**
 * Turns a healthy board into the faulty board for a case.
 * Faults are physical: open, short, wrong value, reversed part.
 */
export function applyFault(board: Board, fault: Fault): ComponentSpec[] {
  return board.components.flatMap((c) => {
    if (c.id !== fault.componentId) return [c];

    switch (fault.mode) {
      case "open":
        return [];

      case "short": {
        if (c.type === "ic") {
          return [{ ...c, params: { ...c.params, load: 1 } }];
        }
        if (c.type === "regulator") {
          return [
            {
              ...c,
              type: "resistor",
              pins: { 1: c.pins.IN, 2: c.pins.OUT },
              params: { resistance: 0.5 },
            },
          ];
        }
        const pins = Object.values(c.pins);
        if (pins.length < 2) return [c];
        return [
          {
            ...c,
            type: "resistor",
            pins: { 1: pins[0], 2: pins[1] },
            params: { resistance: 0.01 },
          },
        ];
      }

      case "value": {
        if (c.type === "regulator") {
          return [{ ...c, params: { ...c.params, vtarget: fault.value ?? 3.0 } }];
        }
        return [
          { ...c, params: { ...c.params, resistance: fault.value ?? 100000 } },
        ];
      }

      case "reverse":
        return [{ ...c, pins: { A: c.pins.K, K: c.pins.A } }];
    }
  });
}

export const FAULTS: Fault[] = [
  {
    id: "F01",
    label: "Blown input fuse",
    description: "F1 open. No power reaches the board.",
    componentId: "F1",
    mode: "open",
    expectedSuspects: ["F1"],
    symptom: "Owners report the board is completely dead. No LEDs, no boot.",
  },
  {
    id: "F02",
    label: "Open reverse-polarity diode",
    description: "D1 open. Input present at the jack, nothing downstream.",
    componentId: "D1",
    mode: "open",
    expectedSuspects: ["D1"],
    symptom: "Board is dead. The 9V supply is confirmed good.",
  },
  {
    id: "F03",
    label: "Reverse-polarity diode installed backwards",
    description: "D1 reversed. It blocks the input.",
    componentId: "D1",
    mode: "reverse",
    expectedSuspects: ["D1"],
    symptom: "Board is dead after a repair. The diode was replaced recently.",
  },
  {
    id: "F04",
    label: "5V regulator dead",
    description: "U1 open. No 5V rail.",
    componentId: "U1",
    mode: "open",
    expectedSuspects: ["U1"],
    symptom: "No LEDs and the MCU does not boot. Input voltage is present.",
  },
  {
    id: "F05",
    label: "5V regulator pass transistor shorted",
    description: "U1 input-to-output short. 5V rail sees close to 9V.",
    componentId: "U1",
    mode: "short",
    expectedSuspects: ["U1"],
    symptom: "Power LED is unusually bright, MCU gets hot, board may boot then die.",
  },
  {
    id: "F06",
    label: "Shorted 5V decoupling capacitor",
    description: "C2 short. The 5V rail is pulled to ground.",
    componentId: "C2",
    mode: "short",
    expectedSuspects: ["C2"],
    symptom: "Board is dead and the 5V regulator gets hot within seconds.",
  },
  {
    id: "F07",
    label: "Open 5V trace",
    description: "TR5 open. Regulator output is good, downstream 5V rail is dead.",
    componentId: "TR5",
    mode: "open",
    expectedSuspects: ["TR5"],
    symptom: "No LEDs, MCU dead, but the regulator area looks powered.",
  },
  {
    id: "F08",
    label: "3.3V regulator dead",
    description: "U2 open. No 3.3V rail.",
    componentId: "U2",
    mode: "open",
    expectedSuspects: ["U2"],
    symptom: "5V LED works. 3.3V LED dark. Sensors on the 3.3V rail fail.",
  },
  {
    id: "F09",
    label: "Shorted 3.3V decoupling capacitor",
    description: "C3 short. The 3.3V rail is pulled to ground.",
    componentId: "C3",
    mode: "short",
    expectedSuspects: ["C3"],
    symptom: "3.3V LED dark, 3.3V regulator hot. 5V side looks normal.",
  },
  {
    id: "F10",
    label: "MCU VCC shorted to ground",
    description: "U3 VCC-GND short. 5V rail is loaded to near zero.",
    componentId: "U3",
    mode: "short",
    expectedSuspects: ["U3"],
    symptom: "Board dead, 5V regulator hot, no boot. Happened after a firmware session.",
  },
  {
    id: "F11",
    label: "Open power-LED resistor",
    description: "R2 open. Board works, power LED dark.",
    componentId: "R2",
    mode: "open",
    expectedSuspects: ["R2"],
    symptom: "Board boots and runs, but the power LED never lights.",
  },
  {
    id: "F12",
    label: "Wrong power-LED resistor",
    description: "R2 fitted at 100k instead of 1k. LED is barely visible.",
    componentId: "R2",
    mode: "value",
    value: 100000,
    expectedSuspects: ["R2"],
    symptom: "Board boots, power LED is extremely dim.",
  },
  {
    id: "F13",
    label: "Reset button stuck closed",
    description: "SW1 short. MCU is held in reset.",
    componentId: "SW1",
    mode: "short",
    expectedSuspects: ["SW1"],
    symptom: "Board never boots. Reset line measured low.",
  },
  {
    id: "F14",
    label: "Open power LED",
    description: "D2 open. Board works, power LED dark.",
    componentId: "D2",
    mode: "open",
    expectedSuspects: ["D2"],
    symptom: "Board boots and runs, but the power LED is dark.",
  },
  {
    id: "F15",
    label: "Open 3.3V LED resistor",
    description: "R3 open. 3.3V rail works, 3.3V LED dark.",
    componentId: "R3",
    mode: "open",
    expectedSuspects: ["R3"],
    symptom: "Board runs. The 3.3V indicator LED is dark.",
  },
  {
    id: "F16",
    label: "Open 3.3V LED",
    description: "D3 open. 3.3V rail works, 3.3V LED dark.",
    componentId: "D3",
    mode: "open",
    expectedSuspects: ["D3"],
    symptom: "Board runs. The 3.3V indicator LED is dark.",
  },
  {
    id: "F17",
    label: "Shorted input capacitor",
    description: "C1 short. Input rail droops, board dead.",
    componentId: "C1",
    mode: "short",
    expectedSuspects: ["C1"],
    symptom: "Board dead. Input capacitor gets hot. Supply current is very high.",
  },
  {
    id: "F18",
    label: "5V regulator output low",
    description: "U1 degraded, regulates at about 3.0V.",
    componentId: "U1",
    mode: "value",
    value: 3.0,
    expectedSuspects: ["U1"],
    symptom: "Board boots intermittently, resets randomly, 5V rail measured low.",
  },
];
