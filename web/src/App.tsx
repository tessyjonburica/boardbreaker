import { useEffect, useMemo, useRef, useState } from "react";
import { fetchState, streamDiagnosis } from "./api";
import { BoardView } from "./BoardView";
import type { BoardState, Final, Probe } from "./types";
import { BUDGET, H, W, fmt, seconds } from "./types";

type Status = "idle" | "running" | "done" | "error";

export default function App() {
  const [state, setState] = useState<BoardState | null>(null);
  const [faultId, setFaultId] = useState("F01");
  const [probes, setProbes] = useState<Probe[]>([]);
  const [final, setFinal] = useState<Final | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const autoStarted = useRef(false);
  const startedAt = useRef(0);

  function loadState() {
    setError("");
    fetchState()
      .then((s) => {
        setState(s);
        setFaultId((id) => (s.faults.some((f) => f.id === id) ? id : s.faults[0]?.id ?? "F01"));
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      });
  }

  useEffect(loadState, []);

  const fault = state?.faults.find((f) => f.id === faultId);
  const ranked = final?.result.ranked ?? [];
  const lastProbe = probes[probes.length - 1];
  const compByRef = useMemo(
    () => new Map((state?.board.components ?? []).map((c) => [c.ref, c])),
    [state],
  );
  const tpByNode = useMemo(
    () => new Map((state?.board.testPoints ?? []).map((t) => [t.node, t])),
    [state],
  );

  async function run(id = faultId) {
    if (!state || status === "running") return;
    setProbes([]);
    setFinal(null);
    setError("");
    setActiveNode(null);
    setElapsed(null);
    setStatus("running");
    startedAt.current = performance.now();
    try {
      let sawFinal = false;
      await streamDiagnosis(id, BUDGET, (event, data) => {
        if (event === "probe") {
          const p = data as Probe;
          setProbes((prev) => [...prev, p]);
          setActiveNode(p.node);
        } else if (event === "final") {
          sawFinal = true;
          setFinal(data as Final);
          setActiveNode(null);
          setElapsed(performance.now() - startedAt.current);
          setStatus("done");
        } else if (event === "error") {
          setError(String(data.message ?? "Diagnosis failed"));
          setStatus("error");
        }
      });
      if (!sawFinal) {
        setStatus("error");
        setError("The stream ended without a diagnosis.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  useEffect(() => {
    if (!state || autoStarted.current) return;
    const auto = new URLSearchParams(window.location.search).get("autorun");
    if (!auto) return;
    const id = auto === "1" ? "F01" : auto;
    if (!state.faults.some((f) => f.id === id)) return;
    autoStarted.current = true;
    setFaultId(id);
    const timer = window.setTimeout(() => run(id), 1400);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
      if (e.key === "r" || e.key === "R") {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          run();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, faultId, status]);

  function pickFault(id: string) {
    setFaultId(id);
    setProbes([]);
    setFinal(null);
    setError("");
    setActiveNode(null);
    setElapsed(null);
    setStatus("idle");
  }

  const hit = final?.expected.includes(ranked[0]?.ref ?? "") ?? false;
  const inTop3 = final?.expected.some((ref) => ranked.slice(0, 3).some((r) => r.ref === ref)) ?? false;
  const measuredNodes = new Set(probes.map((p) => p.node)).size;
  const totalNodes = state?.board.testPoints.length ?? 0;
  const hoveredPart = hovered ? compByRef.get(hovered) : undefined;
  const lastTp = lastProbe ? tpByNode.get(lastProbe.node) : undefined;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="3" y="3" width="26" height="26" rx="2" />
            <path d="M8 12h6v8h10M14 12v-4M20 20v4" />
            <circle cx="8" cy="12" r="1.8" />
            <circle cx="24" cy="20" r="1.8" />
          </svg>
          <div>
            <h1>BoardBreaker</h1>
            <p>PCB fault isolation</p>
          </div>
        </div>

        <div className="controls">
          <span className="bench-badge">Simulated bench · BB-100</span>
          <label className="field">
            <span>Fault case</span>
            <select
              value={faultId}
              onChange={(e) => pickFault(e.target.value)}
              disabled={status === "running" || !state}
            >
              {(state?.faults ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.id} · {f.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="run"
            onClick={() => run()}
            disabled={!state || status === "running"}
            aria-keyshortcuts="r"
          >
            {status === "running" ? "Diagnosing…" : status === "done" ? "Run again" : "Run diagnosis"}
            <kbd>R</kbd>
          </button>
        </div>
      </header>

      <main className="main">
        <section className="board-panel" aria-label="Board under test">
          <div className="panel-head">
            <p className="eyebrow">Board under test</p>
            {lastProbe ? (
              <p className="meter-inline" key={probes.length}>
                <span className="meter-label">
                  {lastProbe.kind === "voltage" ? "DC volts" : "Resistance"}
                </span>
                <strong className={lastProbe.open ? "open" : ""}>{fmt(lastProbe)}</strong>
                <span className="meter-node">
                  {lastTp ? `${lastTp.id} · ${lastTp.label}` : lastProbe.node}
                </span>
              </p>
            ) : (
              <p className="board-name">
                {state?.board.name ?? "Loading board"}
                <span>{state?.board.description ?? ""}</span>
              </p>
            )}
          </div>

          <figure className={`board-frame${status === "running" ? " running" : ""}`}>
            <img
              src="/board.png"
              width={W}
              height={H}
              alt="BB-100 sensor node board with silkscreen references and ten test points"
            />
            {state && (
              <BoardView
                state={state}
                probes={probes}
                ranked={ranked}
                activeNode={activeNode}
                hovered={hovered}
                onHover={setHovered}
              />
            )}

            {hoveredPart && hoveredPart.footprint && (
              <div
                className="part-card"
                style={{
                  left: `${hoveredPart.footprint.x + hoveredPart.footprint.w / 2}%`,
                  top: `${hoveredPart.footprint.y}%`,
                }}
              >
                <b>{hoveredPart.ref}</b>
                <span>
                  {hoveredPart.type} · {hoveredPart.value}
                </span>
                <em>read from photo</em>
              </div>
            )}

            <span className="tick tl" />
            <span className="tick tr" />
            <span className="tick bl" />
            <span className="tick br" />
          </figure>

          <figcaption className="legend">
            <span>
              <i className="key probe" /> Probe point
            </span>
            <span>
              <i className="key suspect" /> Ranked suspect
            </span>
            <span className="hint">Hover the board to inspect parts</span>
            <span className="legend-right">
              SAM 3.1 component map · {state?.map.components.length ?? 0} parts read from the photo
            </span>
          </figcaption>
        </section>

        <aside className="side">
          <div className="side-head">
            <div>
              <p className="eyebrow">Diagnostic run</p>
              <h2>{fault?.symptom ?? "Select a fault case"}</h2>
            </div>
            <div className="budget" aria-label={`${probes.length} of ${BUDGET} probes used`}>
              <div className="ticks">
                {Array.from({ length: BUDGET }).map((_, i) => (
                  <span key={i} className={i < probes.length ? "pip on" : "pip"} />
                ))}
              </div>
              <b>
                {probes.length}/{BUDGET}
              </b>
            </div>
          </div>

          <div className="log" aria-live="polite">
            {probes.length === 0 && status !== "done" && (
              <div className="intro">
                <p>
                  The agent reads the board photo, maps the parts, then asks for
                  measurements one at a time until it can name the fault.
                </p>
                <ol>
                  <li>
                    <span>01</span> Segment the board and read silkscreen refs
                  </li>
                  <li>
                    <span>02</span> Choose the next probe from the power tree
                  </li>
                  <li>
                    <span>03</span> Rank suspects against the evidence
                  </li>
                </ol>
                <dl className="facts">
                  <div>
                    <dt>Parts mapped</dt>
                    <dd>{state?.map.components.length ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Test points</dt>
                    <dd>{totalNodes || "—"}</dd>
                  </div>
                  <div>
                    <dt>Fault cases</dt>
                    <dd>{state?.faults.length ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Probe budget</dt>
                    <dd>{BUDGET}</dd>
                  </div>
                </dl>
                <button className="run ghost" onClick={() => run()} disabled={!state}>
                  Start with this case
                </button>
              </div>
            )}

            {probes.map((p, i) => {
              const tp = tpByNode.get(p.node);
              return (
                <article className="entry" key={`${p.node}-${i}`}>
                  <div className="entry-top">
                    <span className="index">{String(i + 1).padStart(2, "0")}</span>
                    <span className="probe-node">
                      <b>{tp?.id ?? "—"}</b> {tp?.label ?? p.node}
                    </span>
                    <span className={`reading${p.open ? " open" : ""}`}>{fmt(p)}</span>
                  </div>
                  <p className="why">{p.why || `${p.kind} measurement at ${p.node}`}</p>
                </article>
              );
            })}

            {status === "running" && (
              <div className="thinking">
                <span className="pulse" />
                Agent is choosing the next probe
              </div>
            )}

            {error && (
              <div className="error-box">
                <p className="error">{error}</p>
                <button className="run ghost" onClick={() => (state ? run() : loadState())}>
                  Try again
                </button>
              </div>
            )}
          </div>

          {final && (
            <section className="result">
              <div className="result-head">
                <p className="eyebrow">Ranked suspects</p>
                <span className={`verdict ${hit ? "good" : inTop3 ? "warn" : "bad"}`}>
                  {hit ? "Top-1 match" : inTop3 ? "In top 3" : "Missed"}
                </span>
              </div>

              {ranked.length === 0 ? (
                <p className="empty">No diagnosis returned.</p>
              ) : (
                <ol className="suspects">
                  {ranked.slice(0, 3).map((s, i) => {
                    const comp = compByRef.get(s.ref);
                    const pct = Math.max(0, Math.min(100, Math.round(s.confidence * 100)));
                    return (
                      <li key={s.ref} className={i === 0 ? "top" : undefined}>
                        <span className="rank">{i + 1}</span>
                        <div className="suspect-body">
                          <div className="suspect-line">
                            <b>{s.ref}</b>
                            <span>{comp ? `${comp.type} · ${comp.value}` : "net"}</span>
                            {s.solver && (
                              <i className="fit" title={`Exact simulation fit: ${s.solver.join(", ")}`}>
                                physics
                              </i>
                            )}
                            <em>{pct}%</em>
                          </div>
                          <div className="bar">
                            <span style={{ width: `${pct}%` }} />
                          </div>
                          <p>{s.reason}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              <p className="summary">{final.result.summary}</p>

              {final.result.verified?.[0] && (
                <p className="solver">
                  Solver cross-check{" "}
                  <b>{final.result.verified[0].expected.join(" / ")}</b>{" "}
                  {final.result.verified[0].label}
                  <span>
                    {final.result.verified[0].score < 0.005
                      ? "exact fit"
                      : `fit ${final.result.verified[0].score.toFixed(2)}`}
                  </span>
                </p>
              )}

              <dl className="run-stats">
                <div>
                  <dt>Probes</dt>
                  <dd>
                    {probes.length}
                    <span>/{BUDGET}</span>
                  </dd>
                </div>
                <div>
                  <dt>Nodes measured</dt>
                  <dd>
                    {measuredNodes}
                    <span>/{totalNodes}</span>
                  </dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>{elapsed === null ? "—" : seconds(elapsed).replace("s", "")}<span>s</span></dd>
                </div>
              </dl>

              <p className="truth">
                Bench truth <b>{final.expected.join(" / ")}</b> ·{" "}
                {hit ? "matched top-1" : inTop3 ? "matched in top-3" : "not in top-3"}
              </p>
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}
