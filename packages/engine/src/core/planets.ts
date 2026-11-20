import type { ClassicalPlanet, Planet } from "../schemas/common.js";
import type { RulesVersion } from "../schemas/rules.js";
import type { Settings } from "../schemas/settings.js";
import { EngineError } from "../errors.js";

type PlanetData = RulesVersion["planets"];
type PlanetSettings = Pick<
  Settings,
  "planets.rahu_proxy" | "planets.ketu_proxy" | "planets.view_overrides"
>;

export type View = -1 | 0 | 1;
export type PairLabel = "friendly" | "neutral" | "opposed";

const NAMES: Record<Planet, string> = {
  sun: "Sun",
  moon: "Moon",
  jupiter: "Jupiter",
  rahu: "Rahu",
  mercury: "Mercury",
  venus: "Venus",
  ketu: "Ketu",
  saturn: "Saturn",
  mars: "Mars",
};

export function planetName(p: Planet): string {
  return NAMES[p];
}

/** The planet of a single digit 1 to 9 (rules spec 3.4). */
export function planetOf(data: PlanetData, n: number): Planet {
  const p = data.numbers[String(n)];
  if (p === undefined) {
    throw new EngineError("invalid_input", `Only 1 to 9 have a planet, got ${n}.`);
  }
  return p;
}

/** Rahu and Ketu are read through their proxy planets (D6); the rest are themselves. */
export function effectivePlanet(settings: PlanetSettings, p: Planet): ClassicalPlanet {
  if (p === "rahu") return settings["planets.rahu_proxy"];
  if (p === "ketu") return settings["planets.ketu_proxy"];
  return p;
}

export interface ViewResult {
  view: View;
  /** How the view was decided, in plain words. */
  reason: string;
}

/**
 * How planet A sees planet B: +1 friend, 0 neutral, -1 enemy. An explicit
 * entry in planets.view_overrides wins; otherwise both planets are read
 * through their proxies and looked up in the natural friendship table.
 */
export function viewOf(
  data: PlanetData,
  settings: PlanetSettings,
  a: Planet,
  b: Planet,
): ViewResult {
  const override = settings["planets.view_overrides"][a]?.[b];
  if (override !== undefined) {
    return {
      view: override,
      reason: `override table: ${NAMES[a]} sees ${NAMES[b]} as ${word(override)}`,
    };
  }
  const ea = effectivePlanet(settings, a);
  const eb = effectivePlanet(settings, b);
  const row = data.friendship[ea];
  if (!row) throw new EngineError("invalid_rules", `No friendship row for ${ea}.`);
  const view: View = row.friends.includes(eb) ? 1 : row.enemies.includes(eb) ? -1 : 0;
  const via = ea !== a || eb !== b ? ` (read as ${NAMES[ea]} → ${NAMES[eb]})` : "";
  return { view, reason: `${NAMES[a]} sees ${NAMES[b]} as ${word(view)}${via}` };
}

export interface PairScore {
  a: number;
  b: number;
  planetA: Planet;
  planetB: Planet;
  /** −2 to +2. */
  score: number;
  label: PairLabel;
  /** A's view of B and B's view of A; absent when the pair is the same planet. */
  views?: { aToB: View; bToA: View };
  samePlanet: boolean;
  trace: string[];
}

/**
 * Pair score of two numbers 1 to 9 (rules spec 3.4): A's view of B plus B's
 * view of A, so −2 to +2. The same planet scores +2. A Rahu or Ketu number
 * paired with its own proxy (4-8, 7-9 by default) counts as the same planet,
 * unless the override table sets a view for that pair.
 *
 * This one function drives Driver–Conductor harmony, name fit, mobile and
 * vehicle fit, lucky numbers and compatibility.
 */
export function pairScore(
  data: PlanetData,
  settings: PlanetSettings,
  a: number,
  b: number,
): PairScore {
  const planetA = planetOf(data, a);
  const planetB = planetOf(data, b);
  const overrides = settings["planets.view_overrides"];
  const hasOverride =
    overrides[planetA]?.[planetB] !== undefined || overrides[planetB]?.[planetA] !== undefined;
  const sameEffective = effectivePlanet(settings, planetA) === effectivePlanet(settings, planetB);

  if (planetA === planetB || (sameEffective && !hasOverride)) {
    const score = data.pair_score.same_planet;
    const why =
      planetA === planetB
        ? `${NAMES[planetA]} (${a}) and ${NAMES[planetB]} (${b}) are the same planet`
        : `${NAMES[planetA]} (${a}) and ${NAMES[planetB]} (${b}) are read as the same planet, ${NAMES[effectivePlanet(settings, planetA)]}`;
    return {
      a,
      b,
      planetA,
      planetB,
      score,
      label: labelOf(score),
      samePlanet: true,
      trace: [`${why}: ${signed(score)}`],
    };
  }

  const ab = viewOf(data, settings, planetA, planetB);
  const ba = viewOf(data, settings, planetB, planetA);
  const score = ab.view + ba.view;
  return {
    a,
    b,
    planetA,
    planetB,
    score,
    label: labelOf(score),
    views: { aToB: ab.view, bToA: ba.view },
    samePlanet: false,
    trace: [
      `${ab.reason}: ${signed(ab.view)}`,
      `${ba.reason}: ${signed(ba.view)}`,
      `Pair score ${a}–${b}: ${signed(ab.view)} ${ba.view < 0 ? "−" : "+"} ${Math.abs(ba.view)} = ${signed(score)} (${labelOf(score)})`,
    ],
  };
}

export function labelOf(score: number): PairLabel {
  return score > 0 ? "friendly" : score < 0 ? "opposed" : "neutral";
}

function word(v: View): string {
  return v === 1 ? "friend" : v === -1 ? "enemy" : "neutral";
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
}
