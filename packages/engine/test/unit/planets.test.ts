import { describe, expect, it } from "vitest";
import {
  EngineError,
  effectivePlanet,
  labelOf,
  pairScore,
  planetName,
  planetOf,
  viewOf,
  type Settings,
} from "../../src/index.js";
import { rules } from "../helpers.js";

const data = rules.house.data.planets;
const s = rules.house.settings;

describe("planets (rules spec 3.4)", () => {
  it("maps 1 to 9 in the fixed order Sun to Mars", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => planetOf(data, n))).toEqual([
      "sun",
      "moon",
      "jupiter",
      "rahu",
      "mercury",
      "venus",
      "ketu",
      "saturn",
      "mars",
    ]);
    expect(planetName("mercury")).toBe("Mercury");
    expect(() => planetOf(data, 0)).toThrow(EngineError);
    expect(() => planetOf(data, 10)).toThrow(/Only 1 to 9/);
  });

  it("reads Rahu as Saturn and Ketu as Mars by default (D6)", () => {
    expect(effectivePlanet(s, "rahu")).toBe("saturn");
    expect(effectivePlanet(s, "ketu")).toBe("mars");
    expect(effectivePlanet(s, "sun")).toBe("sun");
    expect(viewOf(data, s, "rahu", "mercury")).toEqual({
      view: 1,
      reason: "Rahu sees Mercury as friend (read as Saturn → Mercury)",
    });
  });
});

describe("pairScore", () => {
  it("is +2 for the same number", () => {
    const p = pairScore(data, s, 5, 5);
    expect(p).toMatchObject({ score: 2, label: "friendly", samePlanet: true });
    expect(p.views).toBeUndefined();
  });

  it("counts a Rahu or Ketu number with its proxy as the same planet (4-8, 7-9)", () => {
    expect(pairScore(data, s, 4, 8)).toMatchObject({ score: 2, samePlanet: true });
    expect(pairScore(data, s, 9, 7).trace[0]).toBe(
      "Mars (9) and Ketu (7) are read as the same planet, Mars: +2",
    );
  });

  it("adds both views and explains them", () => {
    const p = pairScore(data, s, 1, 6); // Sun–Venus
    expect(p).toMatchObject({ score: -2, label: "opposed", views: { aToB: -1, bToA: -1 } });
    expect(p.trace).toEqual([
      "Sun sees Venus as enemy: −1",
      "Venus sees Sun as enemy: −1",
      "Pair score 1–6: −1 − 1 = −2 (opposed)",
    ]);
    expect(pairScore(data, s, 8, 3).label).toBe("neutral"); // Saturn–Jupiter 0 + 0
    expect(pairScore(data, s, 2, 3).score).toBe(1); // Moon–Jupiter 0 + 1
  });

  it("lets the override table change one side's view (D6)", () => {
    const custom: Settings = {
      ...s,
      "planets.view_overrides": { rahu: { saturn: -1 }, saturn: { rahu: -1 } },
    };
    const p = pairScore(data, custom, 4, 8);
    expect(p).toMatchObject({ score: -2, samePlanet: false });
    expect(p.trace[0]).toBe("override table: Rahu sees Saturn as enemy: −1");

    const ketuAsSun: Settings = { ...s, "planets.ketu_proxy": "sun" };
    expect(pairScore(data, ketuAsSun, 7, 1)).toMatchObject({ score: 2, samePlanet: true });
    expect(pairScore(data, ketuAsSun, 7, 6).score).toBe(-2);
  });

  it("labels scores", () => {
    expect([labelOf(1), labelOf(0), labelOf(-1)]).toEqual(["friendly", "neutral", "opposed"]);
  });
});
