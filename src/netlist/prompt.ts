import type { ComponentMap } from "../vision/map.js";
import type { Netlist } from "./kicad.js";

/**
 * Compact netlist text for the agent prompt. Multi-pin parts are summarised by
 * name instead of every pin, which keeps a 54-part board inside a short prompt
 * while still telling the model which refs exist and what they are.
 */
export function netlistToText(netlist: Netlist, maxPins = 4): string {
  return netlist.components
    .map((c) => {
      const pins = Object.entries(c.pins);
      const head = `${c.ref} ${c.value.split("/")[0]}`;
      if (!pins.length) return head;
      if (pins.length > maxPins) return `${head} (${pins.length} pins, connector or module)`;
      const mapped = pins.map(([pin, net]) => `${pin}=${net}`).join(" ");
      return `${head} [${mapped}]`;
    })
    .join("; ");
}

/**
 * Component list straight from the design files, used when no photo has been
 * segmented yet. Coordinates are absent, so this never claims to be a vision
 * result.
 */
export function mapFromNetlist(netlist: Netlist): ComponentMap {
  return {
    components: netlist.components.map((c, i) => ({
      box: i,
      ref: c.ref,
      type: c.part || c.value.split("/")[0],
      value: c.value.split("/")[0],
    })),
  };
}
