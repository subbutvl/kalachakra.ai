import type { ResolvedRules } from "../rules/loader.js";
import type { NumberResult, Planet } from "../schemas/common.js";
import type { ProfileResult } from "../schemas/profile.js";
import { EngineError } from "../errors.js";
import { letterValue } from "../core/letters.js";
import { formatChain, reduce, toCompound } from "../core/reduce.js";
import { numberKey, withExtras } from "../core/result.js";
import { pairScore, planetOf, effectivePlanet, type PairScore } from "../core/planets.js";
import { parseDate } from "../core/dates.js";
import { compoundInfo, type CompoundInfo } from "./chaldean.js";
import { dateNumbers } from "./dateNumbers.js";
import { generateVariants } from "./nameOptimizer.js";
import { ownerOf, fitWith, type NumberFit } from "./mobile.js";

export interface CountedName {
  /** The text that was counted, e.g. "MEHRA TEXTILES". */
  text: string;
  total: number;
  number: NumberResult & { planet: Planet };
  compound?: CompoundInfo;
  trace: string[];
}

export interface PersonFit extends NumberFit {
  name: string;
  role: "owner" | "partner";
  label: "friendly" | "neutral" | "opposed";
}

export interface BusinessName {
  input: string;
  input_order: number;
  /** The headline count (D22): with the legal suffix left out by default. */
  counted: CountedName;
  /** The other version, always shown beside it. */
  other_version?: CountedName & { kind: "with_suffix" | "without_suffix" };
  people: PersonFit[];
  bonus: { kind: "popular" | "trade" | "none"; value: number };
  compound_class: number;
  incorporation?: { bhagyank: number; score: number };
  total: number;
  opposed_pairs: number;
  rank: number;
  text_keys: string[];
}

export interface BusinessRequest {
  names: string[];
  trade?: string;
  incorporation_date?: string;
  /** Spelling ideas per name (0 to switch off). */
  spelling_ideas?: number;
}

export interface BusinessResult {
  names: BusinessName[];
  best: string;
  spelling_ideas: { for: string; name: string; total: number; edits: string[] }[];
  domains: {
    extension: string;
    domain: string;
    with_extension: NumberResult;
    name_only: NumberResult;
    headline: "with_extension" | "name_only";
  }[];
  brand_kit: {
    number: number;
    planet: Planet;
    day: string;
    colours: string[];
    support_colours: string[];
    lucky_numbers: number[];
    launch_weekdays: string[];
    launch_days: number[];
    text_keys: string[];
  };
  partner_triangle: { name: string; role: "owner" | "partner"; total: number; label: string }[];
  rule_refs: string[];
}

function stripSuffix(rules: ResolvedRules, text: string): { base: string; suffix?: string } {
  const up = text.toUpperCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
  const suffixes = [...rules.data.business.legal_suffixes]
    .map((s) => s.replace(/\./g, ""))
    .sort((a, b) => b.length - a.length);
  for (const s of suffixes) {
    if (up.endsWith(` ${s}`)) return { base: up.slice(0, -s.length - 1).trim(), suffix: s };
  }
  return { base: up };
}

/** Counts a business name in Chaldean: letters by value, digits at face value, "&" per D22. */
export function countBusinessName(rules: ResolvedRules, text: string): CountedName {
  let t = text.toUpperCase().normalize("NFD").replace(/\p{M}/gu, "");
  t =
    rules.settings["business.ampersand"] === "as_and"
      ? t.replace(/&/g, " AND ")
      : t.replace(/&/g, " ");
  t = t
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!/[A-Z0-9]/.test(t))
    throw new EngineError("invalid_input", `"${text}" has no letters or digits to count.`, "names");
  const words = t.split(" ");
  const trace: string[] = [];
  let total = 0;
  for (const w of words) {
    const vals = [...w].map((c) =>
      /\d/.test(c) ? Number(c) : letterValue(rules.data.letters, "chaldean", c),
    );
    const sum = vals.reduce((a, b) => a + b, 0);
    trace.push(`${w}: ${[...w].map((c, i) => `${c}=${vals[i]}`).join(" + ")} = ${sum}`);
    total += sum;
  }
  if (words.length > 1) trace.push(`Total ${total}`);
  const r = reduce(total);
  const { compound, chain } = toCompound(total, rules.data.compounds.max_compound);
  if (chain.length > 1) trace.push(`Compound ${formatChain(chain)}`);
  const info = compoundInfo(rules, compound);
  trace.push(`Name number ${formatChain(r.chain)}`);
  return {
    text: t,
    total,
    number: {
      ...withExtras(r, {
        ...(info ? { compound: info.value } : {}),
        text_keys: [numberKey("business.number", r)],
      }),
      planet: planetOf(rules.data.planets, r.reduced),
    },
    ...(info ? { compound: info } : {}),
    trace,
  };
}

interface Scored {
  people: PersonFit[];
  bonus: BusinessName["bonus"];
  compound_class: number;
  incorporation?: { bhagyank: number; score: number };
  total: number;
  opposed_pairs: number;
}

function scoreCounted(
  rules: ResolvedRules,
  counted: CountedName,
  people: { profile: ProfileResult; role: "owner" | "partner" }[],
  trade: string | undefined,
  incorporationBhagyank: number | undefined,
): Scored {
  const d = counted.number.reduced;
  const fits: PersonFit[] = people.map(({ profile, role }) => {
    const f = fitWith(rules, d, ownerOf(profile));
    return {
      ...f,
      name: profile.person.name,
      role,
      label: f.total > 0 ? "friendly" : f.total < 0 ? "opposed" : "neutral",
    };
  });
  const b = rules.data.business;
  const mode = rules.settings["business.bonus"];
  let bonus: BusinessName["bonus"] = { kind: "none", value: 0 };
  if (mode === "popular" || (mode === "by_trade" && !trade)) {
    bonus = { kind: "popular", value: b.popular_numbers.includes(d) ? b.popular_bonus : 0 };
  } else if (mode === "by_trade" && trade) {
    const suits = (b.trade_map as unknown as Record<string, number[]>)[trade] ?? [];
    bonus = { kind: "trade", value: suits.includes(d) ? b.trade_bonus : 0 };
  }
  const cls = counted.compound?.class;
  const compound_class = cls === "favourable" ? 1 : cls === "unfavourable" ? -1 : 0;
  let incorporation: Scored["incorporation"];
  if (incorporationBhagyank !== undefined) {
    incorporation = {
      bhagyank: incorporationBhagyank,
      score: pairScore(rules.data.planets, rules.settings, d, incorporationBhagyank).score,
    };
  }
  const opposed_pairs =
    fits.flatMap((f) => f.pairs).filter((p: PairScore) => p.score < 0).length +
    (incorporation && incorporation.score < 0 ? 1 : 0);
  const total =
    fits.reduce((s, f) => s + f.total, 0) +
    bonus.value +
    compound_class +
    (incorporation?.score ?? 0);
  return {
    people: fits,
    bonus,
    compound_class,
    ...(incorporation ? { incorporation } : {}),
    total,
    opposed_pairs,
  };
}

/** Business names (rules spec 3.5a; phase 1 spec 4.1 computeBusiness). */
export function computeBusiness(
  request: BusinessRequest,
  owner: ProfileResult,
  partners: ProfileResult[],
  rules: ResolvedRules,
): BusinessResult {
  const lim = rules.data.business.limits;
  if (request.names.length === 0 || request.names.length > lim.names) {
    throw new EngineError("invalid_input", `Give 1 to ${lim.names} business names.`, "names");
  }
  if (partners.length > lim.partners)
    throw new EngineError("invalid_input", `At most ${lim.partners} partners.`, "partners");
  if (request.trade !== undefined && !(request.trade in rules.data.business.trade_map)) {
    throw new EngineError("invalid_input", `Unknown trade "${request.trade}".`, "trade");
  }
  const incBhagyank = request.incorporation_date
    ? dateNumbers(parseDate(request.incorporation_date, "incorporation_date"), rules).bhagyank
        .reduced
    : undefined;
  const people = [
    { profile: owner, role: "owner" as const },
    ...partners.map((profile) => ({ profile, role: "partner" as const })),
  ];
  const exclude = rules.settings["business.legal_suffix"] === "exclude";

  const names = request.names.map((input, i): Omit<BusinessName, "rank"> => {
    const { base, suffix } = stripSuffix(rules, input);
    const withSuffix = countBusinessName(rules, input);
    const without = suffix ? countBusinessName(rules, base) : withSuffix;
    const counted = exclude ? without : withSuffix;
    const scored = scoreCounted(rules, counted, people, request.trade, incBhagyank);
    const out: Omit<BusinessName, "rank"> = {
      input,
      input_order: i,
      counted,
      ...scored,
      text_keys: [
        numberKey("business.number", counted.number),
        ...(counted.compound ? [counted.compound.text_key] : []),
      ],
    };
    if (suffix)
      out.other_version = {
        ...(exclude ? withSuffix : without),
        kind: exclude ? "with_suffix" : "without_suffix",
      };
    return out;
  });
  const ranked = [...names]
    .sort(
      (a, b) =>
        b.total - a.total || a.opposed_pairs - b.opposed_pairs || a.input_order - b.input_order,
    )
    .map((n, i) => ({ ...n, rank: i + 1 }));
  const byOrder = [...ranked].sort((a, b) => a.input_order - b.input_order);
  const best = ranked[0]!;

  // Spelling ideas from the optimiser's edit rules, scored the same way as the names.
  const ideasPer = request.spelling_ideas ?? 1;
  const spelling_ideas: BusinessResult["spelling_ideas"] = [];
  if (ideasPer > 0) {
    for (const n of byOrder) {
      // Names with digits keep their digits as written; spelling ideas only change letters.
      if (/\d/.test(n.counted.text)) continue;
      const variants = generateVariants(
        n.counted.text,
        rules.settings["optimizer.max_edits"],
        rules.settings["optimizer.lock_first_letter"],
        rules.data.optimizer.max_candidates,
      );
      const scored = variants
        .map((v) => ({
          v,
          s: scoreCounted(
            rules,
            countBusinessName(rules, v.name),
            people,
            request.trade,
            incBhagyank,
          ),
        }))
        .filter((x) => x.s.total > n.total)
        .sort(
          (a, b) =>
            b.s.total - a.s.total ||
            a.s.opposed_pairs - b.s.opposed_pairs ||
            a.v.edits.length - b.v.edits.length ||
            (a.v.name < b.v.name ? -1 : 1),
        )
        .slice(0, ideasPer);
      for (const x of scored)
        spelling_ideas.push({ for: n.input, name: x.v.name, total: x.s.total, edits: x.v.edits });
    }
  }

  // Domains for the best name: the letters of the extension are counted too (D24).
  const plain = best.counted.text.replace(/ /g, "");
  const nameOnly = countBusinessName(rules, plain);
  const domains = rules.data.business.domain_extensions.map((ext) => {
    const letters = ext.replace(/\./g, "");
    const extVal = [...letters.toUpperCase()].reduce(
      (s, c) => s + letterValue(rules.data.letters, "chaldean", c),
      0,
    );
    const r = reduce(nameOnly.total + extVal);
    return {
      extension: ext,
      domain: `${plain.toLowerCase()}${ext}`,
      with_extension: withExtras(r, {
        trace: [
          `${plain} ${nameOnly.total} + ${letters.toUpperCase()} ${extVal} = ${formatChain(r.chain)}`,
        ],
      }),
      name_only: withExtras(reduce(nameOnly.total), {}),
      headline: rules.settings["business.domain_count"],
    };
  });

  // Brand kit from the best name's number and planet.
  const pd = rules.data.planets;
  const num = best.counted.number.reduced;
  const planet = planetOf(pd, num);
  const friends = (pd.friendship[effectivePlanet(rules.settings, planet)]?.friends ??
    []) as readonly string[];
  const friendNums = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(
    (n) => n !== num && friends.includes(planetOf(pd, n)),
  );
  const dayOf = (p: Planet) => pd.days[p] as string;
  const coloursOf = (p: Planet) => (pd.colours[p] as string[] | undefined) ?? [];
  const brand_kit = {
    number: num,
    planet,
    day: dayOf(planet),
    colours: coloursOf(planet),
    support_colours: [...new Set(friendNums.flatMap((n) => coloursOf(planetOf(pd, n))))],
    lucky_numbers: [num, ...friendNums].sort((a, b) => a - b),
    launch_weekdays: [
      ...new Set([dayOf(planet), ...friendNums.map((n) => dayOf(planetOf(pd, n)))]),
    ],
    launch_days: Array.from({ length: 31 }, (_, i) => i + 1).filter(
      (d) => reduce(d).reduced === num,
    ),
    text_keys: [`business.logo_feel.${num}`, `business.brand.${planet}`],
  };

  return {
    names: ranked,
    best: best.input,
    spelling_ideas,
    domains,
    brand_kit,
    partner_triangle: best.people.map((p) => ({
      name: p.name,
      role: p.role,
      total: p.total,
      label: p.label,
    })),
    rule_refs: ["D8", "D22", "D23", "D24"],
  };
}
