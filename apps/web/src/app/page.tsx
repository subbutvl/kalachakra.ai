"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProfileResult } from "@kalachakra/engine";
import { Button, Input } from "@kalachakra/ui";
import { Wheel } from "@/components/wheel";
import { useT } from "@/i18n/locale";
import { profileFor, rulesFor } from "@/lib/engine";
import { firstSentence, libText, PLANET_NAMES, planetOf } from "@/lib/texts";
import { checkDate, checkName, longDate } from "@/lib/validate";

const RULES = rulesFor({ kind: "id", id: "house-default" });
const SAMPLE = { name: "Aarav Mehra", dob: "1991-08-14" };

function profile(name: string, dob: string): ProfileResult | undefined {
  if (checkDate(dob) || checkName(name)) return undefined;
  try {
    return profileFor({ name, dob, gender: "male" }, RULES, 0);
  } catch {
    return undefined;
  }
}

/** "14 → 1 + 4 = 5", one reduction step at a time. */
function steps(chain: number[]): string[] {
  return chain.slice(0, -1).map((n, i) => `${String(n).split("").join(" + ")} = ${chain[i + 1]}`);
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The Lo Shu square: each row, column and diagonal adds up to 15. */
const LOSHU = [4, 9, 2, 3, 5, 7, 8, 1, 6];

const PARTS: [string, string[]][] = [
  ["vedic", ["mulank", "bhagyank", "driver_conductor", "planets"]],
  ["name", ["name_number", "name_correction"]],
  ["loshu", ["loshu_grid", "loshu_planes", "missing_repeated", "kua"]],
  ["pythagorean", ["core_four", "inner_layers", "planes_chart", "maturity"]],
  ["life", ["career_money", "love_family", "health"]],
  ["timing", ["this_year", "months", "life_cycles", "ten_years"]],
  ["daily", ["mobile", "vehicle_house", "lucky", "remedies"]],
];

export default function Home() {
  const { t, locale } = useT();
  const other = locale === "ta" ? "en" : "ta";
  const [dob, setDob] = useState("");
  const [name, setName] = useState(SAMPLE.name);
  const mine = useMemo(() => profile("Example", dob), [dob]);
  const worked = useMemo(
    () => profile(name, dob && !checkDate(dob) ? dob : SAMPLE.dob),
    [name, dob],
  );
  const mulank = mine?.date_numbers.mulank.reduced;
  const bhagyank = mine?.date_numbers.bhagyank.reduced;
  const shown = mulank ?? 5;
  const planetName = (n: number) => PLANET_NAMES[planetOf(n)][locale];

  const nameNumber = worked?.chaldean.headline.name_number;
  const letters = (nameNumber?.number.trace ?? [])
    .map((l) => /^([A-Z]+): (.+) = (\d+)$/.exec(l))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => ({
      word: m[1]!,
      values: m[2]!.split(" + ").map((x) => x.split("=")),
      total: Number(m[3]),
    }));

  return (
    <div className="kc-home">
      {/* The wheel of time: the one moving thing on the page. */}
      <section className="kc-bleed bg-ink text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.15fr_1fr] md:py-20">
          <div className="order-2 md:order-1">
            <h1 className="max-w-xl text-[2rem] leading-[1.15] text-white sm:text-[2.6rem] sm:leading-[1.15]">
              {t("Your date of birth, read on the wheel of time")}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-sand/85 sm:text-lg">
              {t(
                "KalaChakra reads your name and date of birth in three systems, with the Lo Shu grid and your Kua. Every number is worked out step by step, in Tamil or English.",
              )}
            </p>
            <div className="mt-8 max-w-sm">
              <label htmlFor="hero-dob" className="font-label text-sm text-sand">
                {t("Try it with your date of birth")}
              </label>
              <Input
                id="hero-dob"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="mt-2 border-ink-500 bg-ink-700 text-white [color-scheme:dark] focus:border-gold"
              />
            </div>
            <p
              className="mt-4 min-h-[3.5rem] max-w-lg text-sand"
              aria-live="polite"
              data-testid="hero-result"
            >
              {mine && mulank && bhagyank ? (
                <>
                  {t(
                    "Born on {date}: Mulank {m}, ruled by {planet}. Bhagyank {b}, ruled by {planet2}.",
                    {
                      date: longDate(dob, locale),
                      m: mulank,
                      planet: planetName(mulank),
                      b: bhagyank,
                      planet2: planetName(bhagyank),
                    },
                  )}{" "}
                  <span className="text-sand/70">
                    {firstSentence(libText(locale, `planet.${planetOf(mulank)}`))}
                  </span>
                </>
              ) : (
                <span className="text-sand/60">
                  {t("Your Mulank turns to the top of the wheel.")}
                </span>
              )}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="gold">
                <Link href="/choose">{t("Get your full report")}</Link>
              </Button>
              <Button asChild size="lg" variant="onInk">
                <Link href="/report?sample=1">{t("See a sample report")}</Link>
              </Button>
            </div>
          </div>
          <div className="order-1 mx-auto w-full max-w-[19rem] sm:max-w-sm md:order-2 md:max-w-md">
            <Wheel
              selected={mulank}
              locale={locale}
              label={t("The nine numbers and their planets on a wheel")}
            />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="nine"
        className="mt-16 grid gap-10 md:mt-24 md:grid-cols-[1fr_1.4fr]"
      >
        <div>
          <h2 id="nine" className="text-2xl sm:text-3xl">
            {t("Nine numbers, nine planets")}
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-muted">
            {t(
              "Every root number from 1 to 9 has a ruling planet. They sit here in the Lo Shu square, where each row, column and diagonal adds up to 15. Your report places your own date in this grid.",
            )}
          </p>
          {mulank ? (
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-label text-sm">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-gold" /> {t("Your Mulank")}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm border-2 border-gold" /> {t("Your Bhagyank")}
              </span>
            </p>
          ) : null}
        </div>
        <ol
          className="grid grid-cols-3 border-l border-t border-sand"
          aria-label={t("The Lo Shu square")}
        >
          {LOSHU.map((n) => {
            const p = planetOf(n);
            const isM = n === mulank;
            const isB = n === bhagyank && !isM;
            return (
              <li
                key={n}
                className={`relative border-b border-r border-sand p-3 sm:p-5 ${isM ? "bg-gold/15" : ""}`}
                data-testid={`loshu-${n}`}
              >
                {isB ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-1 rounded-sm border-2 border-gold"
                  />
                ) : null}
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`font-heading text-3xl sm:text-4xl ${isM ? "text-gold-700" : "text-ink"}`}
                  >
                    {n}
                  </span>
                  <span className="text-right font-label text-xs text-muted sm:text-sm">
                    {PLANET_NAMES[p][other]}
                  </span>
                </div>
                <p className="mt-1 font-label text-sm font-medium sm:text-base">
                  {PLANET_NAMES[p][locale]}
                </p>
                <p className="mt-2 hidden text-sm leading-snug text-muted sm:block">
                  {capital(
                    firstSentence(libText(locale, `planet.${p}`)).replace(/^[^()]*\(\d\)\s*/, ""),
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="worked" className="mt-16 md:mt-24">
        <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="worked" className="text-2xl sm:text-3xl">
              {t("Every number, worked out")}
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted">
              {t(
                "Nothing in a KalaChakra report is a black box. The appendix shows each sum, so you or your numerologist can check it by hand. Here are the first three.",
              )}
            </p>
            <div className="mt-6 max-w-xs">
              <label htmlFor="worked-name" className="font-label text-sm">
                {t("Try a name")}
              </label>
              <Input
                id="worked-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2"
              />
              <p className="mt-2 text-xs text-muted">
                {t("With the date {date}.", {
                  date: longDate(dob && !checkDate(dob) ? dob : SAMPLE.dob, locale),
                })}
              </p>
            </div>
          </div>
          {worked ? (
            <ol className="divide-y divide-sand border-y border-sand" data-testid="worked-steps">
              <li className="grid gap-2 py-5 sm:grid-cols-[2.5rem_1fr]">
                <span className="font-heading text-xl text-gold-700">1</span>
                <div>
                  <h3 className="text-lg">{t("Mulank, from the day you were born")}</h3>
                  <p className="mt-2 font-label text-lg">
                    {steps(worked.date_numbers.mulank.chain).join("   ") ||
                      worked.date_numbers.mulank.reduced}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {t("Mulank {n}, ruled by {planet}.", {
                      n: worked.date_numbers.mulank.reduced,
                      planet: planetName(worked.date_numbers.mulank.reduced),
                    })}
                  </p>
                </div>
              </li>
              <li className="grid gap-2 py-5 sm:grid-cols-[2.5rem_1fr]">
                <span className="font-heading text-xl text-gold-700">2</span>
                <div>
                  <h3 className="text-lg">{t("Bhagyank, from the whole date")}</h3>
                  <p className="mt-2 font-label text-lg">
                    {worked.date_numbers.bhagyank.trace?.[0]}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {t("Bhagyank {n}, ruled by {planet}.", {
                      n: worked.date_numbers.bhagyank.reduced,
                      planet: planetName(worked.date_numbers.bhagyank.reduced),
                    })}
                    {worked.date_numbers.bhagyank.master
                      ? ` ${t("{n} is a master number, and the report reads it too.", { n: worked.date_numbers.bhagyank.master })}`
                      : ""}
                  </p>
                </div>
              </li>
              <li className="grid gap-2 py-5 sm:grid-cols-[2.5rem_1fr]">
                <span className="font-heading text-xl text-gold-700">3</span>
                <div>
                  <h3 className="text-lg">{t("Name number, from the letters (Chaldean)")}</h3>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
                    {letters.map((w) => (
                      <div key={w.word} className="flex items-end gap-1">
                        {w.values.map(([ch, v], i) => (
                          <span
                            key={i}
                            className="flex w-7 flex-col items-center rounded-md bg-sand-50 py-1"
                          >
                            <span className="font-heading text-base">{ch}</span>
                            <span className="font-label text-xs text-gold-700">{v}</span>
                          </span>
                        ))}
                        <span className="ml-1 font-label text-sm text-muted">= {w.total}</span>
                      </div>
                    ))}
                  </div>
                  {nameNumber ? (
                    <>
                      <p className="mt-3 font-label text-lg">
                        {nameNumber.number.chain.join(" → ")}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {t(
                          "Name number {n}, ruled by {planet}. The report also reads the compound {c} and how well the name fits your birth numbers.",
                          {
                            n: nameNumber.number.reduced,
                            planet: planetName(nameNumber.number.reduced),
                            c: nameNumber.number.compound ?? nameNumber.total,
                          },
                        )}
                      </p>
                    </>
                  ) : null}
                </div>
              </li>
            </ol>
          ) : (
            <p className="text-muted">{t("Type a name in English letters to see the sums.")}</p>
          )}
        </div>
      </section>

      <section aria-labelledby="systems" className="mt-16 md:mt-24">
        <h2 id="systems" className="text-2xl sm:text-3xl">
          {t("Three systems, one report")}
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted">
          {t(
            "Each system reads something different. Where they agree, the report says so; where they differ, it shows both.",
          )}
        </p>
        <div className="mt-8 overflow-x-auto" data-scrolls>
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-ink font-label text-sm">
                <th scope="col" className="py-3 pr-4 font-medium">
                  {t("System")}
                </th>
                <th scope="col" className="py-3 pr-4 font-medium">
                  {t("Reads")}
                </th>
                <th scope="col" className="py-3 font-medium">
                  {t("Tells you")}
                </th>
              </tr>
            </thead>
            <tbody className="text-sm sm:text-base">
              {
                /* i18n */ (
                  [
                    [
                      "Vedic",
                      "Your date of birth",
                      "Mulank and Bhagyank, how they work together, your planets and lucky set",
                    ],
                    [
                      "Chaldean",
                      "The name you use every day",
                      "Your name number and compound, its fit with your birth numbers, and better spellings",
                    ],
                    [
                      "Pythagorean",
                      "Your full name and date",
                      "Life path, expression, soul urge, personality and your birth chart",
                    ],
                    [
                      "Lo Shu and Kua",
                      "Your date, year and gender",
                      "Missing and repeated numbers, the eight planes, and your best directions",
                    ],
                  ] as const
                ).map(([sys, reads, tells]) => (
                  <tr key={sys} className="border-b border-sand align-top">
                    <th
                      scope="row"
                      className="py-4 pr-4 font-heading text-base font-normal tracking-wide sm:text-lg"
                    >
                      {t(sys)}
                    </th>
                    <td className="py-4 pr-4 text-muted">{t(reads)}</td>
                    <td className="py-4">{t(tells)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </section>

      <section
        aria-labelledby="inside"
        className="mt-16 grid gap-10 md:mt-24 md:grid-cols-[1fr_1.4fr]"
      >
        <div>
          <h2 id="inside" className="text-2xl sm:text-3xl">
            {t("Inside the report")}
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-muted">
            {t(
              "Thirty sections in seven parts, from your core numbers to the next ten years. Add compatibility, a business name, mobile numbers, vehicles and your home if you need them.",
            )}
          </p>
          <p className="mt-4 max-w-md leading-relaxed text-muted">
            {t(
              "A child edition is written for parents: learning style instead of career, and spelling choices for school records.",
            )}
          </p>
        </div>
        <div className="columns-1 gap-8 sm:columns-2">
          {PARTS.map(([part, sections]) => (
            <div key={part} className="mb-6 break-inside-avoid">
              <h3 className="border-b border-gold pb-1 font-label text-sm font-medium text-gold-700">
                {libText(locale, `ui.part.${part}`)}
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {sections.map((s) => (
                  <li key={s}>{libText(locale, `ui.section.${s}`)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="languages" className="kc-bleed mt-16 bg-sand-50 md:mt-24">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="languages" className="text-2xl sm:text-3xl">
            {t("Written in Tamil and English")}
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            {t(
              "Every section is written in both languages, not machine translated on the fly. Here is the opening of the Mulank {n} section in each.",
              { n: shown },
            )}
          </p>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <blockquote lang="en" className="border-l-2 border-gold pl-5">
              <p className="font-label text-sm text-gold-700">English</p>
              <p className="mt-2 leading-relaxed">{libText("en", `mulank.${shown}.nature`)}</p>
            </blockquote>
            <blockquote lang="ta" className="border-l-2 border-gold pl-5">
              <p className="font-label text-sm text-gold-700">தமிழ்</p>
              <p className="mt-2 leading-[1.9]">{libText("ta", `mulank.${shown}.nature`)}</p>
            </blockquote>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="faq"
        className="mt-16 grid gap-10 md:mt-24 md:grid-cols-[1fr_1.4fr]"
      >
        <h2 id="faq" className="text-2xl sm:text-3xl">
          {t("Questions people ask")}
        </h2>
        <div className="divide-y divide-sand border-y border-sand">
          {
            /* i18n */ (
              [
                [
                  "What do I need to enter?",
                  "Your name as you use it every day and your date of birth. A birth certificate name, your gender for the Kua number and your time of birth help, but they are optional.",
                ],
                [
                  "Is my information saved?",
                  "No. Your details stay in this browser tab and are cleared when you start again. Nothing is stored on a server.",
                ],
                [
                  "Can I read the report in Tamil?",
                  "Yes. Choose Tamil as the report language on the details page. Switching the site to தமிழ் above sets it for you.",
                ],
                [
                  "Why do my numbers differ from another site?",
                  "Systems and schools differ on details such as master numbers and how letters are counted. KalaChakra shows each sum, so you can see exactly how a number was reached.",
                ],
                [
                  "Is numerology a prediction?",
                  "No. It describes tendencies. Use the report for reflection and planning, not for medical, legal or money decisions.",
                ],
              ] as const
            ).map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {t(q)}
                  <span
                    aria-hidden="true"
                    className="font-heading text-xl text-gold-700 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl leading-relaxed text-muted">{t(a)}</p>
              </details>
            ))
          }
        </div>
      </section>

      <section className="mt-16 flex flex-col items-start justify-between gap-6 border-t-2 border-ink pt-10 md:mt-24 md:flex-row md:items-center">
        <p className="max-w-xl font-heading text-2xl leading-snug sm:text-3xl">
          {t("Start with your name and date of birth")}
        </p>
        <Button asChild size="lg">
          <Link href="/choose">{t("Get your full report")}</Link>
        </Button>
      </section>
    </div>
  );
}
