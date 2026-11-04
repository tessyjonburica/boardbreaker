const fs = require("fs");
const path = "web/src/App.tsx";
let s = fs.readFileSync(path, "utf8");
const before = s;
s = s.replace(
  'import { useEffect, useMemo, useState } from "react";',
  'import { useEffect, useMemo, useRef, useState } from "react";',
);
s = s.replace(
  "  const [activeNode, setActiveNode] = useState<string | null>(null);",
  "  const [activeNode, setActiveNode] = useState<string | null>(null);\n  const autoStarted = useRef(false);",
);
s = s.replace("  async function run() {", "  async function run(id = faultId) {");
s = s.replace("await streamDiagnosis(faultId,", "await streamDiagnosis(id,");
s = s.replaceAll("onClick={run}", "onClick={() => run()}");
s = s.replace(
  "  function pickFault(id: string) {",
  [
    "  useEffect(() => {",
    "    if (!state || autoStarted.current) return;",
    '    const auto = new URLSearchParams(window.location.search).get("autorun");',
    "    if (!auto) return;",
    '    const id = auto === "1" ? "F01" : auto;',
    "    if (!state.faults.some((f) => f.id === id)) return;",
    "    autoStarted.current = true;",
    "    setFaultId(id);",
    "    const timer = window.setTimeout(() => run(id), 1400);",
    "    return () => window.clearTimeout(timer);",
    "  }, [state]);",
    "",
    "  function pickFault(id: string) {",
  ].join("\n"),
);
if (s === before) throw new Error("no changes");
fs.writeFileSync(path, s);
console.log("ok", (s.match(/onClick=\{\(\) => run\(\)\}/g) || []).length);
