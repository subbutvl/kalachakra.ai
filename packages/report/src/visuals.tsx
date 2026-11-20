/**
 * Report visuals as hand-built SVG (phase 1 spec 8). Colours come from the
 * brand tokens in print.css through CSS variables, so screen and PDF match.
 */
import type { ReactElement } from "react";

const GOLD = "var(--kc-gold)";
const INK = "var(--kc-ink)";
const SAND = "var(--kc-sand)";
const MUTED = "var(--kc-muted)";

type Cell = { count: number; sources?: string[] };

export function LoshuGrid({ layout, cells }: { layout: number[][]; cells: Record<string, Cell> }) {
  const size = 92;
  return (
    <svg
      viewBox={`0 0 ${size * 3 + 24} ${size * 3 + 24}`}
      className="kc-visual kc-loshu"
      role="img"
      aria-label="Lo Shu grid"
    >
      {layout.map((row, r) =>
        row.map((n, c) => {
          const cell = cells[String(n)] ?? { count: 0 };
          const x = 12 + c * size;
          const y = 12 + r * size;
          const marks = (cell.sources ?? []).map((s) => (s === "dob" ? "" : s[0]!));
          const filled = cell.count > 0;
          return (
            <g key={n}>
              <rect
                x={x}
                y={y}
                width={size - 6}
                height={size - 6}
                rx={10}
                fill={filled ? SAND : "transparent"}
                stroke={GOLD}
                strokeWidth={1.5}
              />
              <text x={x + 8} y={y + 16} fontSize={10} fill={MUTED} className="kc-label">
                {n}
              </text>
              {filled ? (
                <text
                  x={x + (size - 6) / 2}
                  y={y + (size - 6) / 2 + 8}
                  textAnchor="middle"
                  fontSize={cell.count > 3 ? 16 : 22}
                  fill={INK}
                  className="kc-num"
                >
                  {String(n).repeat(Math.min(cell.count, 5))}
                </text>
              ) : (
                <text
                  x={x + (size - 6) / 2}
                  y={y + (size - 6) / 2 + 6}
                  textAnchor="middle"
                  fontSize={18}
                  fill={MUTED}
                >
                  ·
                </text>
              )}
              {marks.filter(Boolean).length > 0 && (
                <text
                  x={x + size - 14}
                  y={y + size - 14}
                  textAnchor="end"
                  fontSize={10}
                  fill={GOLD}
                  className="kc-label"
                >
                  {marks.filter(Boolean).join(" ")}
                </text>
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}

const CHART: number[][] = [
  [3, 6, 9],
  [2, 5, 8],
  [1, 4, 7],
];
const ARROW_CELLS: Record<string, [number, number][]> = {
  "369": [
    [0, 0],
    [0, 1],
    [0, 2],
  ],
  "258": [
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  "147": [
    [2, 0],
    [2, 1],
    [2, 2],
  ],
  "123": [
    [2, 0],
    [1, 0],
    [0, 0],
  ],
  "456": [
    [2, 1],
    [1, 1],
    [0, 1],
  ],
  "789": [
    [2, 2],
    [1, 2],
    [0, 2],
  ],
  "159": [
    [2, 0],
    [1, 1],
    [0, 2],
  ],
  "357": [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
};

export function BirthChart({
  cells,
  arrows,
}: {
  cells: Record<string, number>;
  arrows: { id: string; kind: string }[];
}) {
  const s = 80;
  const centre = (r: number, c: number) =>
    [12 + c * s + (s - 6) / 2, 12 + r * s + (s - 6) / 2] as const;
  return (
    <svg
      viewBox={`0 0 ${s * 3 + 24} ${s * 3 + 24}`}
      className="kc-visual kc-chart"
      role="img"
      aria-label="Birth chart"
    >
      {CHART.map((row, r) =>
        row.map((n, c) => {
          const count = cells[String(n)] ?? 0;
          return (
            <g key={n}>
              <rect
                x={12 + c * s}
                y={12 + r * s}
                width={s - 6}
                height={s - 6}
                rx={8}
                fill={count ? SAND : "transparent"}
                stroke={GOLD}
                strokeWidth={1.2}
              />
              <text
                x={12 + c * s + (s - 6) / 2}
                y={12 + r * s + (s - 6) / 2 + 7}
                textAnchor="middle"
                fontSize={count > 3 ? 14 : 19}
                fill={count ? INK : MUTED}
                className="kc-num"
              >
                {count ? String(n).repeat(Math.min(count, 5)) : n}
              </text>
            </g>
          );
        }),
      )}
      {arrows.map((a) => {
        const pts = ARROW_CELLS[a.id];
        if (!pts) return null;
        const [x1, y1] = centre(...pts[0]!);
        const [x2, y2] = centre(...pts[2]!);
        return (
          <line
            key={a.id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={a.kind === "strength" ? GOLD : MUTED}
            strokeWidth={3}
            strokeDasharray={a.kind === "strength" ? undefined : "6 5"}
            strokeLinecap="round"
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export function KuaCompass({
  directions,
  good,
}: {
  directions: Record<string, string>;
  good: string[];
}) {
  const byDir = Object.fromEntries(Object.entries(directions).map(([k, d]) => [d, k]));
  const R = 110;
  return (
    <svg viewBox="0 0 300 300" className="kc-visual kc-kua" role="img" aria-label="Kua directions">
      <circle cx={150} cy={150} r={R + 20} fill="none" stroke={SAND} strokeWidth={2} />
      {COMPASS.map((d, i) => {
        const a = (i * Math.PI) / 4 - Math.PI / 2;
        const x = 150 + Math.cos(a) * R;
        const y = 150 + Math.sin(a) * R;
        const kind = byDir[d];
        const isGood = kind ? good.includes(kind) : false;
        return (
          <g key={d}>
            <line
              x1={150}
              y1={150}
              x2={150 + Math.cos(a) * (R - 26)}
              y2={150 + Math.sin(a) * (R - 26)}
              stroke={isGood ? GOLD : MUTED}
              strokeWidth={isGood ? 3 : 1.2}
            />
            <circle
              cx={x}
              cy={y}
              r={24}
              fill={isGood ? GOLD : "transparent"}
              stroke={isGood ? GOLD : MUTED}
            />
            <text
              x={x}
              y={y + 5}
              textAnchor="middle"
              fontSize={13}
              fill={isGood ? "#FFFFFF" : INK}
              className="kc-label"
            >
              {d}
            </text>
          </g>
        );
      })}
      <circle cx={150} cy={150} r={6} fill={INK} />
    </svg>
  );
}

export function YearWheel({ current }: { current: number }) {
  return (
    <svg
      viewBox="0 0 260 260"
      className="kc-visual kc-wheel"
      role="img"
      aria-label="Nine-year cycle"
    >
      {Array.from({ length: 9 }, (_, i) => {
        const n = i + 1;
        const a0 = (i * 2 * Math.PI) / 9 - Math.PI / 2;
        const a1 = ((i + 1) * 2 * Math.PI) / 9 - Math.PI / 2;
        const r = 110;
        const path = `M130 130 L${130 + r * Math.cos(a0)} ${130 + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${130 + r * Math.cos(a1)} ${130 + r * Math.sin(a1)} Z`;
        const am = (a0 + a1) / 2;
        return (
          <g key={n}>
            <path d={path} fill={n === current ? GOLD : SAND} stroke="#FFFFFF" strokeWidth={3} />
            <text
              x={130 + 72 * Math.cos(am)}
              y={130 + 72 * Math.sin(am) + 7}
              textAnchor="middle"
              fontSize={20}
              fill={n === current ? "#FFFFFF" : INK}
              className="kc-num"
            >
              {n}
            </text>
          </g>
        );
      })}
      <circle cx={130} cy={130} r={34} fill="#FFFFFF" />
    </svg>
  );
}

export function MonthStrip({ data }: { data: { label: string; year: number; value: string }[] }) {
  const w = 52;
  return (
    <svg
      viewBox={`0 0 ${w * 12 + 8} 86`}
      className="kc-visual kc-months"
      role="img"
      aria-label="Twelve months"
    >
      {data.map((m, i) => (
        <g key={i}>
          <rect x={4 + i * w} y={4} width={w - 6} height={72} rx={8} fill={i === 0 ? GOLD : SAND} />
          <text
            x={4 + i * w + (w - 6) / 2}
            y={26}
            textAnchor="middle"
            fontSize={11}
            fill={i === 0 ? "#FFFFFF" : INK}
            className="kc-label"
          >
            {m.label}
          </text>
          <text
            x={4 + i * w + (w - 6) / 2}
            y={58}
            textAnchor="middle"
            fontSize={20}
            fill={i === 0 ? "#FFFFFF" : INK}
            className="kc-num"
          >
            {m.value}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function Timeline({
  pinnacles,
  dasha,
  age,
}: {
  pinnacles: { value: string; from: number; to?: number }[];
  dasha: { number: number; from_age: number; to_age: number }[];
  age: number;
}) {
  const max = 90;
  const W = 640;
  const x = (a: number) => 10 + (Math.min(a, max) / max) * (W - 20);
  return (
    <svg
      viewBox={`0 0 ${W} 130`}
      className="kc-visual kc-timeline"
      role="img"
      aria-label="Life cycles"
    >
      {pinnacles.map((p, i) => (
        <g key={i}>
          <rect
            x={x(p.from)}
            y={18}
            width={x(p.to ?? max) - x(p.from) - 2}
            height={34}
            rx={6}
            fill={i % 2 ? SAND : GOLD}
          />
          <text
            x={(x(p.from) + x(p.to ?? max)) / 2}
            y={41}
            textAnchor="middle"
            fontSize={15}
            fill={i % 2 ? INK : "#FFFFFF"}
            className="kc-num"
          >
            {p.value}
          </text>
        </g>
      ))}
      {dasha.map((d, i) => (
        <g key={`d${i}`}>
          <rect
            x={x(d.from_age)}
            y={62}
            width={Math.max(1, x(d.to_age) - x(d.from_age) - 1)}
            height={22}
            fill={i % 2 ? "transparent" : SAND}
            stroke={SAND}
          />
          {d.to_age - d.from_age >= 3 && (
            <text
              x={(x(d.from_age) + x(d.to_age)) / 2}
              y={78}
              textAnchor="middle"
              fontSize={10}
              fill={INK}
              className="kc-label"
            >
              {d.number}
            </text>
          )}
        </g>
      ))}
      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((a) => (
        <text
          key={a}
          x={x(a)}
          y={104}
          textAnchor="middle"
          fontSize={10}
          fill={MUTED}
          className="kc-label"
        >
          {a}
        </text>
      ))}
      <line x1={x(age)} y1={8} x2={x(age)} y2={92} stroke={INK} strokeWidth={2} />
      <text x={x(age)} y={122} textAnchor="middle" fontSize={11} fill={INK} className="kc-label">
        {age}
      </text>
    </svg>
  );
}

export function TenYears({
  data,
}: {
  data: { year: number; age: number; py: string; pinnacle: number; dasha: number }[];
}) {
  const w = 62;
  return (
    <svg
      viewBox={`0 0 ${w * 10 + 8} 120`}
      className="kc-visual kc-ten"
      role="img"
      aria-label="Next ten years"
    >
      {data.map((y, i) => (
        <g key={y.year}>
          <rect
            x={4 + i * w}
            y={4}
            width={w - 6}
            height={110}
            rx={8}
            fill={i === 0 ? GOLD : SAND}
          />
          <text
            x={4 + i * w + (w - 6) / 2}
            y={22}
            textAnchor="middle"
            fontSize={11}
            fill={i === 0 ? "#FFFFFF" : INK}
            className="kc-label"
          >
            {y.year}
          </text>
          <text
            x={4 + i * w + (w - 6) / 2}
            y={56}
            textAnchor="middle"
            fontSize={22}
            fill={i === 0 ? "#FFFFFF" : INK}
            className="kc-num"
          >
            {y.py}
          </text>
          <text
            x={4 + i * w + (w - 6) / 2}
            y={80}
            textAnchor="middle"
            fontSize={10}
            fill={i === 0 ? "#FFFFFF" : MUTED}
            className="kc-label"
          >
            P {y.pinnacle}
          </text>
          <text
            x={4 + i * w + (w - 6) / 2}
            y={98}
            textAnchor="middle"
            fontSize={10}
            fill={i === 0 ? "#FFFFFF" : MUTED}
            className="kc-label"
          >
            D {y.dasha || "–"}
          </text>
        </g>
      ))}
    </svg>
  );
}

const FLOW_FILL: Record<string, string> = {
  smooth: GOLD,
  neutral: SAND,
  clash: INK,
  pause: "transparent",
  amplifier: SAND,
};
export function FlowStrip({ pairs }: { pairs: { pair: string; kind: string }[] }) {
  const w = 64;
  return (
    <svg
      viewBox={`0 0 ${w * pairs.length + 8} 64`}
      className="kc-visual kc-flow"
      role="img"
      aria-label="Element flow"
    >
      {pairs.map((p, i) => (
        <g key={i}>
          <rect
            x={4 + i * w}
            y={6}
            width={w - 8}
            height={40}
            rx={20}
            fill={FLOW_FILL[p.kind] ?? SAND}
            stroke={GOLD}
          />
          <text
            x={4 + i * w + (w - 8) / 2}
            y={32}
            textAnchor="middle"
            fontSize={15}
            fill={p.kind === "clash" || p.kind === "smooth" ? "#FFFFFF" : INK}
            className="kc-num"
          >
            {p.pair}
          </text>
          <text
            x={4 + i * w + (w - 8) / 2}
            y={60}
            textAnchor="middle"
            fontSize={9}
            fill={MUTED}
            className="kc-label"
          >
            {p.kind}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function CompatibilityBars({
  data,
}: {
  data: { id: string; label: string; points: number; weight: number }[];
}) {
  const W = 600;
  return (
    <svg
      viewBox={`0 0 ${W} ${data.length * 34 + 8}`}
      className="kc-visual kc-compat"
      role="img"
      aria-label="Compatibility parts"
    >
      {data.map((d, i) => {
        const full = 330;
        return (
          <g key={d.id}>
            <text x={4} y={i * 34 + 24} fontSize={12} fill={INK} className="kc-label">
              {d.label}
            </text>
            <rect x={200} y={i * 34 + 8} width={full} height={20} rx={10} fill={SAND} />
            <rect
              x={200}
              y={i * 34 + 8}
              width={d.weight ? (full * d.points) / d.weight : 0}
              height={20}
              rx={10}
              fill={GOLD}
            />
            <text x={200 + full + 10} y={i * 34 + 23} fontSize={12} fill={INK} className="kc-label">
              {d.points}/{d.weight}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function PartnerTriangle({
  people,
  name,
}: {
  people: { name: string; total: number; label: string }[];
  name: string;
}) {
  const n = people.length;
  return (
    <svg
      viewBox="0 0 360 260"
      className="kc-visual kc-triangle"
      role="img"
      aria-label="Partner triangle"
    >
      {people.map((p, i) => {
        const a = (i * 2 * Math.PI) / Math.max(n, 1) - Math.PI / 2;
        const x = 180 + Math.cos(a) * 100;
        const y = 130 + Math.sin(a) * 95;
        const colour = p.total > 0 ? GOLD : p.total < 0 ? INK : MUTED;
        return (
          <g key={i}>
            <line x1={180} y1={130} x2={x} y2={y} stroke={colour} strokeWidth={3} />
            <circle cx={x} cy={y} r={8} fill={colour} />
            <text
              x={x}
              y={y + (y < 130 ? -14 : 24)}
              textAnchor="middle"
              fontSize={11}
              fill={INK}
              className="kc-label"
            >{`${p.name} (${p.total > 0 ? "+" : ""}${p.total})`}</text>
          </g>
        );
      })}
      <rect x={120} y={112} width={120} height={36} rx={18} fill={SAND} stroke={GOLD} />
      <text x={180} y={135} textAnchor="middle" fontSize={11} fill={INK} className="kc-label">
        {name}
      </text>
    </svg>
  );
}

export function Visual({ visual, data }: { visual: string; data: unknown }): ReactElement | null {
  const d = data as never;
  switch (visual) {
    case "loshu":
      return <LoshuGrid {...(d as { layout: number[][]; cells: Record<string, Cell> })} />;
    case "birth_chart":
      return (
        <BirthChart
          {...(d as { cells: Record<string, number>; arrows: { id: string; kind: string }[] })}
        />
      );
    case "kua":
      return <KuaCompass {...(d as { directions: Record<string, string>; good: string[] })} />;
    case "year_wheel":
      return <YearWheel {...(d as { current: number })} />;
    case "months":
      return <MonthStrip data={d} />;
    case "timeline":
      return (
        <Timeline
          {...(d as {
            pinnacles: { value: string; from: number; to?: number }[];
            dasha: { number: number; from_age: number; to_age: number }[];
            age: number;
          })}
        />
      );
    case "ten_years":
      return <TenYears data={d} />;
    case "flow":
      return <FlowStrip pairs={d} />;
    case "compatibility":
      return <CompatibilityBars data={d} />;
    case "triangle":
      return (
        <PartnerTriangle
          {...(d as { people: { name: string; total: number; label: string }[]; name: string })}
        />
      );
    default:
      return null;
  }
}
