import { afterAll, describe, expect, it } from "vitest";
import { closePdfBrowser } from "@kalachakra/report/pdf";
import { createApp } from "../src/app.js";
import { todayInIndia } from "../src/rules.js";
import { diffResults } from "../src/diff.js";

process.env.API_QUIET = "1";
const app = createApp({ host: "127.0.0.1", port: 8787, webOrigin: "http://localhost:3000" });
const AS_OF = "2026-11-20";
const aarav = { name: "Aarav Mehra", dob: "1991-08-14", gender: "male" };
const myra = { name: "Myra Kapoor", dob: "2016-03-09", gender: "female" };

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return {
    status: res.status,
    body: (await res.json()) as Record<string, any>,
    headers: res.headers,
  };
}
async function get(path: string) {
  const res = await app.request(path);
  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

describe("service", () => {
  it("is alive and reports versions", async () => {
    expect((await get("/v1/health")).body).toEqual({ status: "ok" });
    expect((await get("/v1/version")).body).toEqual({
      engine: "0.1.0",
      rules: ["v1.0"],
      texts: "0.1",
    });
  });

  it("serves OpenAPI and the interactive docs", async () => {
    const spec = await get("/openapi.json");
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toBe("3.1.0");
    for (const path of [
      "/v1/profile",
      "/v1/names/suggest",
      "/v1/names/score",
      "/v1/mobile",
      "/v1/vehicle",
      "/v1/house",
      "/v1/business",
      "/v1/compatibility",
      "/v1/dates",
      "/v1/report",
      "/v1/report/pdf",
      "/v1/rules/profiles",
      "/v1/rules/profiles/{id}",
      "/v1/rules/diff",
      "/v1/health",
      "/v1/version",
    ]) {
      expect(spec.body.paths, path).toHaveProperty([path]);
    }
    const docs = await get("/docs");
    expect(docs.status).toBe(200);
    expect(String(docs.body)).toContain("openapi.json");
  });

  it("answers unknown paths with the error shape", async () => {
    const r = await get("/v1/nope");
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe("not_found");
  });

  it("allows only the web app's origin", async () => {
    const ok = await post(
      "/v1/profile",
      { person: aarav, as_of: AS_OF },
      { Origin: "http://localhost:3000" },
    );
    expect(ok.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    const other = await post(
      "/v1/profile",
      { person: aarav, as_of: AS_OF },
      { Origin: "https://example.com" },
    );
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("profile", () => {
  it("returns the full profile with meta", async () => {
    const r = await post("/v1/profile", { person: aarav, as_of: AS_OF });
    expect(r.status).toBe(200);
    expect(r.body.meta).toMatchObject({
      engine: "0.1.0",
      rules: "v1.0",
      texts: "0.1",
      profile: "house-default",
      as_of: AS_OF,
    });
    expect(r.body.date_numbers.bhagyank.chain).toEqual([33, 6]);
    expect(r.body.name_optimizer.suggestions).toHaveLength(5);
  });

  it("switches rule profiles, including an inline custom one", async () => {
    const house = await post("/v1/profile", { person: myra, as_of: AS_OF });
    const vp = await post("/v1/profile", {
      person: myra,
      as_of: AS_OF,
      rule_profile: "kalachakra-classic",
    });
    expect(house.body.loshu.missing).toEqual([5, 7, 8]);
    expect(vp.body.loshu.missing).toEqual([4, 5, 7, 8]);
    const custom = await post("/v1/profile", {
      person: myra,
      as_of: AS_OF,
      rule_profile: {
        id: "custom",
        name: "Custom",
        base: "v1.0",
        overrides: { "letters.y_vowel": "never" },
      },
    });
    expect(custom.body.meta.profile).toBe("custom");
    expect(custom.body.pythagorean.soul_urge.value).toBe(5);
  });

  it("defaults as_of to today in India", async () => {
    const r = await post("/v1/profile", { person: aarav, options: { name_suggestions: 0 } });
    expect(r.body.meta.as_of).toBe(todayInIndia());
    expect(r.body.name_optimizer).toBeUndefined();
    expect(todayInIndia(new Date("2026-11-20T20:00:00Z"))).toBe("2026-11-21");
  });

  it("uses one error shape", async () => {
    const bad = await post("/v1/profile", {
      person: { ...aarav, dob: "2026-02-30" },
      as_of: AS_OF,
    });
    expect(bad.status).toBe(400);
    expect(bad.body).toEqual({
      error: {
        code: "invalid_date",
        field: "person.dob",
        message: "30 February 2026 is not a date.",
      },
    });
    const missing = await post("/v1/profile", { person: { name: "X" } });
    expect(missing.status).toBe(400);
    expect(missing.body.error).toMatchObject({ code: "invalid_input", field: "person.dob" });
    const unknown = await post("/v1/profile", { person: aarav, rule_profile: "nope" });
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe("unknown_profile");
    const badSetting = await post("/v1/profile", {
      person: aarav,
      rule_profile: { id: "x", name: "X", base: "v1.0", overrides: { "loshu.extra": true } },
    });
    expect(badSetting.status).toBe(400);
    expect(badSetting.body.error.code).toMatch(/invalid_input|unknown_setting/);
    const res = await app.request("/v1/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });
});

describe("names", () => {
  it("suggests spellings and scores one", async () => {
    const s = await post("/v1/names/suggest", {
      person: aarav,
      as_of: AS_OF,
      limits: { top_n: 3 },
    });
    expect(s.status).toBe(200);
    expect(s.body.suggestions).toHaveLength(3);
    expect(s.body.meta.profile).toBe("house-default");
    const sc = await post("/v1/names/score", { person: aarav, name: "Aarave Mehra", as_of: AS_OF });
    expect(sc.body.chaldean.headline.name_number.number.chain).toEqual([33, 6]);
    expect(sc.body.chaldean.headline.fit.label).toBe("supported");
  });
});

describe("numbers in daily life", () => {
  it("reads mobiles and finds candidates", async () => {
    const r = await post("/v1/mobile", {
      person: aarav,
      as_of: AS_OF,
      rule_profile: "kalachakra-classic",
      numbers: ["+91 98765 24310"],
      goals: ["finance"],
      find_for: "9876524310",
      max_candidates: 3,
    });
    expect(r.status).toBe(200);
    expect(r.body.readings[0].total.chain).toEqual([45, 9]);
    expect(r.body.candidates.endings).toHaveLength(3);
    const bad = await post("/v1/mobile", { person: aarav, numbers: ["12345"] });
    expect(bad.status).toBe(400);
    expect(bad.body.error.field).toBe("numbers.0");
  });

  it("reads vehicles and houses", async () => {
    const v = await post("/v1/vehicle", {
      person: aarav,
      registrations: ["KA 05 MN 1234"],
      as_of: AS_OF,
    });
    expect(v.body.readings[0].full.total.chain).toEqual([27, 9]);
    const h = await post("/v1/house", {
      residents: [aarav, myra],
      flat: "12B",
      door: "E",
      as_of: AS_OF,
    });
    expect(h.body.numbers[0].number.value).toBe(5);
    expect(h.body.door.residents).toHaveLength(2);
    const bad = await post("/v1/house", { residents: [aarav], door: "UP" });
    expect(bad.status).toBe(400);
  });
});

describe("business, compatibility, dates", () => {
  it("ranks business names", async () => {
    const r = await post("/v1/business", {
      owner: aarav,
      partners: [{ name: "Ishaan Verma", dob: "2003-01-04", gender: "male" }],
      names: ["Loomcraft Works", "Aarav Weaves", "Mehra Textiles Pvt Ltd", "Loomcraft India"],
      rule_profile: "kalachakra-classic",
      as_of: AS_OF,
    });
    expect(r.status).toBe(200);
    expect(r.body.names.map((n: { total: number }) => n.total)).toEqual([7, 4, 3, 3]);
  });

  it("scores compatibility and finds dates", async () => {
    const c = await post("/v1/compatibility", {
      a: aarav,
      b: myra,
      relationship: "parent_child",
      as_of: AS_OF,
    });
    expect(c.body.components).toHaveLength(7);
    const d = await post("/v1/dates", {
      people: [aarav],
      from: "2026-12-01",
      to: "2026-12-31",
      purpose: "launch",
      top_n: 5,
      as_of: AS_OF,
    });
    expect(d.body.dates).toHaveLength(5);
    const bad = await post("/v1/dates", {
      people: [aarav],
      from: "2026-12-01",
      to: "2026-12-31",
      purpose: "wedding",
    });
    expect(bad.body.error.field).toBe("purpose");
  });
});

describe("rules", () => {
  it("lists and describes profiles", async () => {
    const l = await get("/v1/rules/profiles");
    expect(l.body.profiles.map((p: { id: string }) => p.id)).toEqual([
      "house-default",
      "kalachakra-classic",
      "sample-practitioner",
    ]);
    const d = await get("/v1/rules/profiles/kalachakra-classic");
    expect(
      d.body.settings.find((s: { key: string }) => s.key === "loshu.include_mulank"),
    ).toMatchObject({ decision: "D10", value: "always", source: "profile" });
    expect((await get("/v1/rules/profiles/nope")).status).toBe(404);
  });

  it("diffs one person under two profiles", async () => {
    const r = await post("/v1/rules/diff", {
      person: myra,
      a: "house-default",
      b: "kalachakra-classic",
      as_of: AS_OF,
    });
    expect(r.status).toBe(200);
    expect(r.body.settings.map((s: { decision: string }) => s.decision)).toContain("D10");
    const paths = r.body.changes.map((c: { path: string }) => c.path);
    expect(paths).toContain("pythagorean.soul_urge.value");
    expect(paths).toContain("loshu.missing");
    expect(
      r.body.changes.find((c: { path: string }) => c.path === "pythagorean.soul_urge.value"),
    ).toEqual({ path: "pythagorean.soul_urge.value", a: 3, b: 5 });
  });

  it("finds nested differences only", () => {
    expect(
      diffResults(
        { x: 1, y: { z: [1, 2] }, trace: ["a"] },
        { x: 1, y: { z: [1, 3] }, trace: ["b"] },
      ),
    ).toEqual([{ path: "y.z", a: [1, 2], b: [1, 3] }]);
    expect(diffResults([{ v: 1 }], [{ v: 2 }])).toEqual([{ path: "[0].v", a: 1, b: 2 }]);
  });
});

describe("reports", () => {
  it("returns the assembled report as JSON", async () => {
    const r = await post("/v1/report", {
      person: aarav,
      as_of: AS_OF,
      language: "ta",
      audience: "adult",
      modules: {
        mobile: { numbers: ["9876524310"] },
        compatibility: { partner: myra, relationship: "parent_child" },
      },
    });
    expect(r.status).toBe(200);
    expect(r.body.meta).toMatchObject({
      language: "ta",
      texts: "0.1",
      modules: ["mobile", "compatibility"],
    });
    expect(r.body.sections.length).toBeGreaterThan(25);
    expect(r.body.sections.map((s: { id: string }) => s.id)).toEqual(
      expect.arrayContaining(["mobile", "compatibility"]),
    );
  });

  it("applies a practitioner overlay and rejects a bad one", async () => {
    const r = await post("/v1/report", {
      person: aarav,
      as_of: AS_OF,
      overlay: { edits: [{ section: "health", action: "hide" }] },
    });
    expect(r.body.sections.map((s: { id: string }) => s.id)).not.toContain("health");
    const bad = await post("/v1/report", {
      person: aarav,
      overlay: { edits: [{ section: "x", action: "explode" }] },
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error.field).toBe("overlay");
  });

  it("returns a PDF", async () => {
    const res = await app.request("/v1/report/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person: myra, as_of: AS_OF, audience: "child" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain(
      "Kalachakra_Myra_Kapoor_Child_2026-11-20.pdf",
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(50_000);
  });
});

afterAll(async () => {
  await closePdfBrowser();
});
