/** Minimal S-expression reader for KiCad netlist files. */

export type Sexpr = string | Sexpr[];

export function parseSexpr(input: string): Sexpr[] {
  let i = 0;
  const n = input.length;

  const skipWs = () => {
    while (i < n) {
      const ch = input[i];
      if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") i++;
      else if (ch === ";") {
        while (i < n && input[i] !== "\n") i++;
      } else break;
    }
  };

  const readString = (): string => {
    let out = "";
    i++; // opening quote
    while (i < n) {
      const ch = input[i];
      if (ch === "\\") {
        const next = input[i + 1];
        out += next === "n" ? "\n" : next === "t" ? "\t" : next;
        i += 2;
      } else if (ch === '"') {
        i++;
        return out;
      } else {
        out += ch;
        i++;
      }
    }
    throw new Error("unterminated string in netlist");
  };

  const readAtom = (): string => {
    let out = "";
    while (i < n && !"() \n\r\t;\"".includes(input[i])) {
      out += input[i];
      i++;
    }
    return out;
  };

  const readList = (): Sexpr[] => {
    i++; // (
    const items: Sexpr[] = [];
    for (;;) {
      skipWs();
      if (i >= n) throw new Error("unexpected end of netlist");
      const ch = input[i];
      if (ch === ")") {
        i++;
        return items;
      }
      if (ch === "(") items.push(readList());
      else if (ch === '"') items.push(readString());
      else items.push(readAtom());
    }
  };

  const top: Sexpr[] = [];
  for (;;) {
    skipWs();
    if (i >= n) break;
    if (input[i] === "(") top.push(readList());
    else if (input[i] === ")") throw new Error("unbalanced ')' in netlist");
    else top.push(readAtom());
  }
  return top;
}

/** Finds the first child list whose head matches `head`. */
export function child(list: Sexpr[], head: string): Sexpr[] | undefined {
  for (const item of list) {
    if (Array.isArray(item) && item[0] === head) return item;
  }
  return undefined;
}

/** All child lists whose head matches `head`. */
export function children(list: Sexpr[], head: string): Sexpr[][] {
  return list.filter((item): item is Sexpr[] => Array.isArray(item) && item[0] === head);
}

export function atom(list: Sexpr[], head: string, fallback = ""): string {
  const c = child(list, head);
  const v = c?.[1];
  return typeof v === "string" ? v : fallback;
}
