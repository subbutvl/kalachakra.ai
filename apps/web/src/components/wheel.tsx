import { PLANET_NAMES, planetOf } from "@/lib/texts";
import type { Locale } from "@/i18n/locale";

const C = 200;
const polar = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  // Rounded, so the server and the browser print the same numbers.
  const round = (v: number) => Math.round(v * 100) / 100;
  return [round(C + r * Math.cos(a)), round(C + r * Math.sin(a))] as const;
};

/**
 * The KalaChakra: the nine root numbers and their planets on a wheel of 108
 * marks. The chosen number turns to the top. Drawn for the ink band.
 */
export function Wheel({ selected, locale, label }: { selected?: number; locale: Locale; label: string }) {
  const turn = selected ? -(selected - 1) * 40 : 0;
  const spin = { transform: `rotate(${turn}deg)`, transformOrigin: "200px 200px" };
  const upright = { transform: `rotate(${-turn}deg)`, transformBox: "fill-box", transformOrigin: "center" } as const;
  return (
    <svg viewBox="0 0 400 400" role="img" aria-label={label} className="kc-wheel h-auto w-full">
      <circle cx={C} cy={C} r={196} fill="none" stroke="var(--color-ink-500)" strokeWidth="1" />
      <g className="kc-wheel-spin" style={spin}>
        {Array.from({ length: 108 }, (_, i) => {
          const long = i % 12 === 0;
          const [x1, y1] = polar(196, i * (360 / 108));
          const [x2, y2] = polar(long ? 182 : 189, i * (360 / 108));
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={long ? "var(--color-gold)" : "var(--color-ink-500)"} strokeWidth={long ? 1.5 : 1} />;
        })}
        <circle cx={C} cy={C} r={150} fill="none" stroke="var(--color-ink-700)" strokeWidth="44" />
        {Array.from({ length: 9 }, (_, i) => {
          const n = i + 1;
          const deg = i * 40;
          // Spokes divide the wheel into nine sectors; each planet sits in its number's sector.
          const [sx1, sy1] = polar(76, deg + 20);
          const [sx2, sy2] = polar(128, deg + 20);
          const [x, y] = polar(150, deg);
          const [lx, ly] = polar(104, deg);
          const on = n === selected;
          const planet = PLANET_NAMES[planetOf(n)];
          return (
            <g key={n}>
              <line x1={sx1} y1={sy1} x2={sx2} y2={sy2} stroke="var(--color-ink-500)" strokeWidth="1" />
              <circle cx={x} cy={y} r={19} fill={on ? "var(--color-gold)" : "var(--color-ink)"} stroke={on ? "var(--color-gold)" : "var(--color-sand)"} strokeOpacity={on ? 1 : 0.5} />
              <text x={x} y={y} dy="0.36em" textAnchor="middle" className="font-heading" fontSize="18" fill={on ? "var(--color-ink)" : "var(--color-sand)"} style={upright}>
                {n}
              </text>
              <text x={lx} y={ly} dy="0.35em" textAnchor="middle" className="font-label" fontSize={locale === "ta" ? 9 : 10} fill="var(--color-sand)" fillOpacity={on ? 1 : 0.55} style={upright}>
                {planet[locale]}
              </text>
            </g>
          );
        })}
      </g>
      <circle cx={C} cy={C} r={70} fill="var(--color-ink)" stroke="var(--color-gold)" strokeWidth="1" />
      {selected ? (
        <text x={C} y={C} dy="0.36em" textAnchor="middle" className="font-heading" fontSize="64" fill="var(--color-gold)">
          {selected}
        </text>
      ) : (
        <text textAnchor="middle" className="font-heading" fontSize="14" fill="var(--color-sand)" letterSpacing="3">
          <tspan x={C} y={C - 4}>KALA</tspan>
          <tspan x={C} y={C + 16}>CHAKRA</tspan>
        </text>
      )}
    </svg>
  );
}
