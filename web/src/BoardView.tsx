import { useMemo } from "react";
import type { BoardState, Probe, Suspect, TestPoint } from "./types";
import { H, W, fmt } from "./types";

type Props = {
  state: BoardState;
  probes: Probe[];
  ranked: Suspect[];
  activeNode: string | null;
  hovered: string | null;
  onHover: (ref: string | null) => void;
};

type Box = { x: number; y: number; w: number; h: number; cx: number; cy: number };

function box(f: { x: number; y: number; w: number; h: number }): Box {
  const x = (f.x / 100) * W;
  const y = (f.y / 100) * H;
  const w = (f.w / 100) * W;
  const h = (f.h / 100) * H;
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

export function BoardView({ state, probes, ranked, activeNode, hovered, onHover }: Props) {
  const tps = state.board.testPoints;

  const byNode = useMemo(() => {
    const m = new Map<string, TestPoint>();
    for (const tp of tps) m.set(tp.node, tp);
    return m;
  }, [tps]);

  const compByRef = useMemo(
    () => new Map(state.board.components.map((c) => [c.ref, c])),
    [state.board.components],
  );

  const last = new Map<string, Probe>();
  const order = new Map<string, number>();
  for (const p of probes) {
    last.set(p.node, p);
    if (!order.has(p.node)) order.set(p.node, probes.indexOf(p) + 1);
  }

  // The order the agent measured the board in, drawn as one line.
  const path = probes
    .map((p) => byNode.get(p.node))
    .filter((tp): tp is TestPoint => !!tp)
    .map((tp) => {
      const b = box(tp.footprint);
      return `${b.cx},${b.cy}`;
    });

  return (
    <svg
      className="overlay"
      viewBox={`0 0 ${W} ${H}`}
      role="group"
      aria-label="Board overlay: probe points, suspect parts and measured parts"
    >
      {path.length > 1 && (
        <polyline className="path-line" points={path.join(" ")} pathLength={1} />
      )}

      {tps.map((tp) => {
        const b = box(tp.footprint);
        const probe = last.get(tp.node);
        const active = activeNode === tp.node;
        const right = b.cx < W * 0.78;
        const step = order.get(tp.node);
        return (
          <g key={tp.id}>
            {probe ? (
              <>
                <circle className={`ring${active ? " live" : ""}`} cx={b.cx} cy={b.cy} r={13} />
                <circle className="dot" cx={b.cx} cy={b.cy} r={3.5} />
                {step !== undefined && (
                  <g className="step-badge" transform={`translate(${b.cx - 15}, ${b.cy - 15})`}>
                    <circle r={8} />
                    <text y={3.2} textAnchor="middle">
                      {step}
                    </text>
                  </g>
                )}
                <g transform={`translate(${right ? b.cx + 20 : b.cx - 104}, ${b.cy - 15})`}>
                  <rect className="chip-bg" width={86} height={26} rx={2} />
                  <text className="chip-text" x={8} y={18}>
                    {fmt(probe)}
                  </text>
                </g>
              </>
            ) : (
              <g className="cross">
                <line x1={b.cx - 6} y1={b.cy} x2={b.cx + 6} y2={b.cy} />
                <line x1={b.cx} y1={b.cy - 6} x2={b.cx} y2={b.cy + 6} />
              </g>
            )}
          </g>
        );
      })}

      {ranked.slice(0, 3).map((s, i) => {
        const comp = compByRef.get(s.ref);
        if (!comp?.footprint) return null;
        const b = box(comp.footprint);
        return (
          <g
            key={s.ref}
            className={i === 0 ? "suspect first" : "suspect"}
            style={{ animationDelay: `${i * 140}ms` }}
          >
            <rect
              x={b.x - 6}
              y={b.y - 6}
              width={b.w + 12}
              height={b.h + 12}
              rx={3}
              pathLength={1}
            />
            <g transform={`translate(${b.x + 2}, ${b.y + 2})`}>
              <circle r={12} />
              <text x={0} y={4.5} textAnchor="middle">
                {i + 1}
              </text>
            </g>
          </g>
        );
      })}

      {state.board.components.map((c) => {
        if (!c.footprint) return null;
        const b = box(c.footprint);
        const on = hovered === c.ref;
        return (
          <rect
            key={c.id}
            className={`hit${on ? " on" : ""}`}
            x={b.x - 4}
            y={b.y - 4}
            width={b.w + 8}
            height={b.h + 8}
            rx={3}
            tabIndex={0}
            role="button"
            aria-label={`${c.ref}, ${c.type}, ${c.value}. Show part details.`}
            onMouseEnter={() => onHover(c.ref)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(c.ref)}
            onBlur={() => onHover(null)}
          />
        );
      })}
    </svg>
  );
}
