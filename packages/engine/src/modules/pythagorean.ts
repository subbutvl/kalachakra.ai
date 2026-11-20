import type { ResolvedRules } from "../rules/loader.js";
import type { NumberResult } from "../schemas/common.js";
import type { CalendarDate } from "../core/dates.js";
import { digitSum, formatChain, reduce } from "../core/reduce.js";
import { keepMasters } from "../core/masters.js";
import { karmicDebtIn, numberKey, sumTrace, withExtras } from "../core/result.js";
import { isVowelAt, scoreName, sumByVowel, type NameScore } from "../core/letters.js";

export type ArrowId = "123" | "456" | "789" | "147" | "258" | "369" | "159" | "357";

export interface PythagoreanProfile {
  life_path: NumberResult;
  expression: NumberResult;
  soul_urge: NumberResult;
  personality: NumberResult;
  maturity: NumberResult & { system: "pythagorean" | "chaldean" };
  /** The other system's maturity, shown beside the headline (D9). */
  maturity_other?: NumberResult & { system: "pythagorean" | "chaldean" };
  hidden_passion: { values: number[]; count: number; text_keys: string[] };
  karmic_lessons: { values: number[]; text_keys: string[] };
  subconscious_self: { value: number; text_keys: string[] };
  balance: NumberResult;
  rational_thought: NumberResult;
  cornerstone: { letter: string; value: number; text_keys: string[] };
  capstone: { letter: string; value: number; text_keys: string[] };
  first_vowel?: { letter: string; value: number; text_keys: string[] };
  planes_of_expression: Record<
    "physical" | "mental" | "emotional" | "intuitive",
    { count: number; letters: string[]; text_keys: string[] }
  >;
  birth_chart: {
    /** Grid rows top to bottom: 3 6 9 / 2 5 8 / 1 4 7, with each digit's count. */
    cells: Record<string, number>;
    arrows: { id: ArrowId; kind: "strength" | "weakness"; text_key: string }[];
  };
  /** The name these numbers were read from (the birth certificate name when given). */
  name: string;
}

const CHART_LINES: ArrowId[] = ["369", "258", "147", "123", "456", "789", "159", "357"];

/** The Pythagorean (Western) core set, rules spec 3.6. */
export function pythagorean(
  rules: ResolvedRules,
  birthName: string,
  date: CalendarDate,
  chaldeanNameDigit: number,
): PythagoreanProfile {
  const keep = keepMasters(rules.settings, "pythagorean");
  const red = (n: number) => reduce(n, { keepMasters: keep });
  const tables = rules.data.letters;
  const yMode = rules.settings["letters.y_vowel"];
  const score: NameScore = scoreName(tables, "pythagorean", birthName, yMode);
  const letters = score.parts.flatMap((p) => p.letters);

  // Life path: day, month and year each reduced (masters kept), then summed and reduced.
  const d = red(date.day);
  const m = red(date.month);
  const y = red(digitSum(date.year));
  const lp = red(d.value + m.value + y.value);
  const life_path = withExtras(lp, {
    trace: [
      `Day ${formatChain(d.chain)}, month ${formatChain(m.chain)}, year ${date.year} → ${formatChain(y.chain)}`,
      sumTrace([d.value, m.value, y.value], lp),
    ],
    rule_refs: ["D3", "D5"],
    text_keys: [numberKey("pythagorean.life_path", lp)],
  });

  const fromTotal = (
    key: string,
    total: number,
    label: string,
    debtCheck: boolean,
  ): NumberResult => {
    const r = red(total);
    const debt = debtCheck ? karmicDebtIn(r.chain) : [];
    return withExtras(r, {
      trace: [`${label}: ${formatChain(r.chain)}`],
      rule_refs: ["D3", "D4"],
      text_keys: [numberKey(`pythagorean.${key}`, r), ...debt.map((n) => `karmic_debt.${n}`)],
      flags: debt.length ? ["karmic_debt"] : [],
    });
  };

  const expression = fromTotal("expression", score.total, "All letters", true);
  expression.trace = [...score.trace, ...(expression.trace ?? [])];
  const vowelLetters = letters.filter((l) => l.vowel);
  const soul_urge = fromTotal(
    "soul_urge",
    sumByVowel(score, true),
    `Vowels ${vowelLetters.map((l) => `${l.letter}=${l.value}`).join(" + ")}`,
    true,
  );
  const personality = fromTotal("personality", sumByVowel(score, false), "Consonants", false);

  // Maturity (D9): life path + expression; the Chaldean version uses the Chaldean name number.
  const pyMat = red(lp.reduced + expression.reduced);
  const chMat = red(lp.reduced + chaldeanNameDigit);
  const mk = (r: NumberResult, system: "pythagorean" | "chaldean", nameDigit: number) => ({
    ...withExtras(r, {
      trace: [
        `Life path ${lp.reduced} + ${system === "pythagorean" ? "Pythagorean expression" : "Chaldean name number"} ${nameDigit} = ${formatChain(r.chain)}`,
      ],
      rule_refs: ["D9"],
      text_keys: [numberKey("pythagorean.maturity", r)],
    }),
    system,
  });
  const pyM = mk(pyMat, "pythagorean", expression.reduced);
  const chM = mk(chMat, "chaldean", chaldeanNameDigit);
  const headlinePy = rules.settings["maturity.headline"] === "pythagorean";

  // Hidden passion and karmic lessons from how often each value 1 to 9 occurs in the name.
  const counts = new Map<number, number>();
  for (const l of letters) counts.set(l.value, (counts.get(l.value) ?? 0) + 1);
  const max = Math.max(...counts.values());
  const passion = [...counts.entries()]
    .filter(([, c]) => c === max)
    .map(([v]) => v)
    .sort((a, b) => a - b);
  const lessons = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => !counts.has(v));
  const subconscious = 9 - lessons.length;

  // Balance: sum of the initials. Rational thought: first name value + birth day.
  const initials = score.parts.map((p) => p.letters[0]!);
  const bal = red(initials.reduce((s, l) => s + l.value, 0));
  const balance = withExtras(bal, {
    trace: [
      sumTrace(
        initials.map((l) => `${l.letter}=${l.value}`),
        bal,
      ),
    ],
    text_keys: [numberKey("pythagorean.balance", bal)],
  });
  const first = score.parts[0]!;
  const rt = red(first.total + date.day);
  const rational_thought = withExtras(rt, {
    trace: [`First name ${first.total} + birth day ${date.day} = ${formatChain(rt.chain)}`],
    text_keys: [numberKey("pythagorean.rational_thought", rt)],
  });

  const firstLetters = first.letters;
  const cornerLetter = firstLetters[0]!;
  const capLetter = firstLetters.at(-1)!;
  const fvIndex = [...first.part].findIndex((_, i) => isVowelAt(tables, first.part, i, yMode));
  const fv = fvIndex >= 0 ? firstLetters[fvIndex] : undefined;

  // Planes of expression.
  const planeLetters = tables.planes_of_expression;
  const planes = {} as PythagoreanProfile["planes_of_expression"];
  for (const plane of ["physical", "mental", "emotional", "intuitive"] as const) {
    const inPlane = letters
      .filter((l) => planeLetters[plane].includes(l.letter))
      .map((l) => l.letter);
    planes[plane] = {
      count: inPlane.length,
      letters: inPlane,
      text_keys: [`pythagorean.plane.${plane}`],
    };
  }

  // Birth chart: non-zero date digits on the 3-6-9 grid; full lines are strengths, empty lines weaknesses.
  const digits = `${date.day}${date.month}${date.year}`
    .split("")
    .map(Number)
    .filter((n) => n > 0);
  const cells: Record<string, number> = {};
  for (let n = 1; n <= 9; n++) cells[String(n)] = digits.filter((x) => x === n).length;
  const arrows: PythagoreanProfile["birth_chart"]["arrows"] = [];
  for (const id of CHART_LINES) {
    const present = [...id].map((c) => (cells[c] ?? 0) > 0);
    if (present.every(Boolean))
      arrows.push({ id, kind: "strength", text_key: `pythagorean.arrow.${id}.strength` });
    else if (!present.some(Boolean))
      arrows.push({ id, kind: "weakness", text_key: `pythagorean.arrow.${id}.weakness` });
  }

  const out: PythagoreanProfile = {
    life_path,
    expression,
    soul_urge,
    personality,
    maturity: headlinePy ? pyM : chM,
    hidden_passion: {
      values: passion,
      count: max,
      text_keys: passion.map((v) => `pythagorean.hidden_passion.${v}`),
    },
    karmic_lessons: {
      values: lessons,
      text_keys: lessons.map((v) => `pythagorean.karmic_lesson.${v}`),
    },
    subconscious_self: {
      value: subconscious,
      text_keys: [`pythagorean.subconscious.${subconscious}`],
    },
    balance,
    rational_thought,
    cornerstone: {
      letter: cornerLetter.letter,
      value: cornerLetter.value,
      text_keys: [`pythagorean.cornerstone.${cornerLetter.letter}`],
    },
    capstone: {
      letter: capLetter.letter,
      value: capLetter.value,
      text_keys: [`pythagorean.capstone.${capLetter.letter}`],
    },
    planes_of_expression: planes,
    birth_chart: { cells, arrows },
    name: score.name.text,
  };
  if (rules.settings["maturity.show_other"]) out.maturity_other = headlinePy ? chM : pyM;
  if (fv)
    out.first_vowel = {
      letter: fv.letter,
      value: fv.value,
      text_keys: [`pythagorean.first_vowel.${fv.letter}`],
    };
  return out;
}
