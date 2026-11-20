import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { z } from "zod";
import {
  computeBusiness,
  computeCompatibility,
  computeHouse,
  computeMobile,
  computeProfile,
  computeVehicle,
  describeRules,
  ENGINE_VERSION,
  findDates,
  listRuleProfiles,
  ProfileResultSchema,
  suggestNames,
  type PersonInput,
  type ProfileResult,
  type ResolvedRules,
} from "@kalachakra/engine";
import { rulesVersions } from "@kalachakra/rules";
import {
  buildReport,
  library,
  renderReportHtml,
  OverlaySchema,
  TEXTS_VERSION as LIBRARY_VERSION,
  type Overlay,
  type ReportDocument,
  type ReportModules,
} from "@kalachakra/report";
import { renderReportPdf } from "@kalachakra/report/pdf";
import { embeddedFontCss } from "@kalachakra/report/fonts";
import { readEnv, type Env } from "./env.js";
import { ApiError, ErrorSchema, handleError, validationHook } from "./errors.js";
import { catalog, rulesFor, todayInIndia } from "./rules.js";
import { diffResults } from "./diff.js";
import {
  BusinessBody,
  CompatibilityBody,
  DatesBody,
  DiffBody,
  HouseBody,
  MobileBody,
  NameScoreBody,
  NameSuggestBody,
  ProfileBody,
  ReportBody,
  Result,
  VehicleBody,
} from "./schemas.js";

/** The text library version recorded in every response. */
export const TEXTS_VERSION: string = LIBRARY_VERSION;

const json = <S extends z.ZodType>(schema: S, description: string) => ({
  content: { "application/json": { schema } },
  description,
});
const errors = {
  400: json(ErrorSchema, "Invalid input: the error names the field."),
  404: json(ErrorSchema, "Unknown rule profile."),
  500: json(ErrorSchema, "Unexpected error."),
};

function post<B extends z.ZodType, R extends z.ZodType = typeof Result>(
  path: string,
  tag: string,
  summary: string,
  body: B,
  response?: R,
) {
  return createRoute({
    method: "post",
    path,
    tags: [tag],
    summary,
    request: { body: { content: { "application/json": { schema: body } }, required: true } },
    responses: { 200: json(response ?? Result, "OK"), ...errors },
  });
}

function meta(rules: ResolvedRules, asOf: string) {
  return {
    engine: ENGINE_VERSION,
    rules: rules.rulesVersion,
    texts: TEXTS_VERSION,
    profile: rules.profile.id,
    as_of: asOf,
  };
}

/** A person's profile, without name suggestions, for use inside other modules. */
function profileOf(person: PersonInput, asOf: string, rules: ResolvedRules): ProfileResult {
  return computeProfile({ person, as_of: asOf, options: { name_suggestions: 0 } }, rules);
}

export function createApp(env: Env = readEnv()) {
  const app = new OpenAPIHono({ defaultHook: validationHook });

  // Request logs keep only method, path, status and timing: never bodies or personal data.
  app.use("*", async (c, next) => {
    const start = performance.now();
    await next();
    if (process.env.API_QUIET !== "1") {
      console.log(
        `${c.req.method} ${c.req.path} ${c.res.status} ${(performance.now() - start).toFixed(1)}ms`,
      );
    }
  });
  app.use(
    "/v1/*",
    cors({
      origin: env.webOrigin,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    }),
  );
  app.onError(handleError);
  app.notFound((c) =>
    c.json(
      { error: { code: "not_found", message: `No endpoint ${c.req.method} ${c.req.path}.` } },
      404,
    ),
  );

  // ---- People --------------------------------------------------------------
  app.openapi(
    post("/v1/profile", "People", "Full person profile", ProfileBody, ProfileResultSchema),
    (c) => {
      const b = c.req.valid("json");
      const rules = rulesFor(b.rule_profile);
      const result = computeProfile(
        {
          person: b.person,
          as_of: b.as_of ?? todayInIndia(),
          ...(b.options ? { options: b.options } : {}),
        },
        rules,
      );
      return c.json({ ...result, meta: { ...result.meta, texts: TEXTS_VERSION } } as never, 200);
    },
  );

  app.openapi(
    post("/v1/names/suggest", "Names", "Ranked spellings for a name", NameSuggestBody),
    (c) => {
      const b = c.req.valid("json");
      const rules = rulesFor(b.rule_profile);
      const asOf = b.as_of ?? todayInIndia();
      const p = profileOf(b.person, asOf, rules);
      const result = suggestNames(
        rules,
        b.name ?? b.person.name,
        p.date_numbers.mulank.reduced,
        p.date_numbers.bhagyank.reduced,
        b.limits?.top_n,
      );
      return c.json({ meta: meta(rules, asOf), ...result }, 200);
    },
  );

  app.openapi(
    post("/v1/names/score", "Names", "Score one spelling (Name lab)", NameScoreBody),
    (c) => {
      const b = c.req.valid("json");
      const rules = rulesFor(b.rule_profile);
      const asOf = b.as_of ?? todayInIndia();
      const p = profileOf({ ...b.person, name: b.name }, asOf, rules);
      return c.json(
        {
          meta: { ...p.meta, texts: TEXTS_VERSION },
          name: b.name,
          chaldean: p.chaldean,
          pythagorean: p.pythagorean,
        },
        200,
      );
    },
  );

  // ---- Numbers in daily life ----------------------------------------------
  app.openapi(
    post("/v1/mobile", "Numbers", "One or many mobile numbers, and new candidates", MobileBody),
    (c) => {
      const b = c.req.valid("json");
      const rules = rulesFor(b.rule_profile);
      const asOf = b.as_of ?? todayInIndia();
      const owner = profileOf(b.person, asOf, rules);
      const result = computeMobile(
        {
          numbers: b.numbers,
          ...(b.goals ? { goals: b.goals } : {}),
          ...(b.find_for ? { find_for: b.find_for } : {}),
          ...(b.max_candidates ? { max_candidates: b.max_candidates } : {}),
        },
        owner,
        rules,
      );
      return c.json({ meta: meta(rules, asOf), ...result }, 200);
    },
  );

  app.openapi(post("/v1/vehicle", "Numbers", "Vehicle registrations", VehicleBody), (c) => {
    const b = c.req.valid("json");
    const rules = rulesFor(b.rule_profile);
    const asOf = b.as_of ?? todayInIndia();
    return c.json(
      {
        meta: meta(rules, asOf),
        ...computeVehicle(b.registrations, profileOf(b.person, asOf, rules), rules),
      },
      200,
    );
  });

  app.openapi(
    post("/v1/house", "Numbers", "House or flat number and door check", HouseBody),
    (c) => {
      const b = c.req.valid("json");
      const rules = rulesFor(b.rule_profile);
      const asOf = b.as_of ?? todayInIndia();
      const residents = b.residents.map((p) => profileOf(p, asOf, rules));
      const result = computeHouse(
        {
          ...(b.flat ? { flat: b.flat } : {}),
          ...(b.building ? { building: b.building } : {}),
          ...(b.door ? { door: b.door } : {}),
        },
        residents,
        rules,
      );
      return c.json({ meta: meta(rules, asOf), ...result }, 200);
    },
  );

  app.openapi(post("/v1/business", "Business", "Business names", BusinessBody), (c) => {
    const b = c.req.valid("json");
    const rules = rulesFor(b.rule_profile);
    const asOf = b.as_of ?? todayInIndia();
    const result = computeBusiness(
      {
        names: b.names,
        ...(b.trade ? { trade: b.trade } : {}),
        ...(b.incorporation_date ? { incorporation_date: b.incorporation_date } : {}),
        ...(b.spelling_ideas !== undefined ? { spelling_ideas: b.spelling_ideas } : {}),
      },
      profileOf(b.owner, asOf, rules),
      (b.partners ?? []).map((p) => profileOf(p, asOf, rules)),
      rules,
    );
    return c.json({ meta: meta(rules, asOf), ...result }, 200);
  });

  app.openapi(
    post("/v1/compatibility", "People", "Compatibility of two people", CompatibilityBody),
    (c) => {
      const b = c.req.valid("json");
      const rules = rulesFor(b.rule_profile);
      const asOf = b.as_of ?? todayInIndia();
      const result = computeCompatibility(
        profileOf(b.a, asOf, rules),
        profileOf(b.b, asOf, rules),
        b.relationship,
        rules,
      );
      return c.json({ meta: meta(rules, asOf), ...result }, 200);
    },
  );

  app.openapi(post("/v1/dates", "People", "Favourable dates in a range", DatesBody), (c) => {
    const b = c.req.valid("json");
    const rules = rulesFor(b.rule_profile);
    const asOf = b.as_of ?? todayInIndia();
    const result = findDates(
      { from: b.from, to: b.to, purpose: b.purpose, ...(b.top_n ? { top_n: b.top_n } : {}) },
      b.people.map((p) => profileOf(p, asOf, rules)),
      rules,
    );
    return c.json({ meta: meta(rules, asOf), ...result }, 200);
  });

  // ---- Reports ------------------------------------------------------------
  const buildFrom = (b: z.infer<typeof ReportBody>): ReportDocument => {
    const rules = rulesFor(b.rule_profile);
    const asOf = b.as_of ?? todayInIndia();
    const profile = computeProfile({ person: b.person, as_of: asOf }, rules);
    const m = b.modules ?? {};
    const others = (list?: PersonInput[]) => (list ?? []).map((p) => profileOf(p, asOf, rules));
    const modules: ReportModules = {};
    if (m.mobile)
      modules.mobile = computeMobile(
        { numbers: m.mobile.numbers, ...(m.mobile.goals ? { goals: m.mobile.goals } : {}) },
        profile,
        rules,
      );
    if (m.vehicle) modules.vehicle = computeVehicle(m.vehicle.registrations, profile, rules);
    if (m.house) {
      modules.house = computeHouse(
        {
          ...(m.house.flat ? { flat: m.house.flat } : {}),
          ...(m.house.building ? { building: m.house.building } : {}),
          ...(m.house.door ? { door: m.house.door } : {}),
        },
        [profile, ...others(m.house.others)],
        rules,
      );
    }
    if (m.business) {
      modules.business = computeBusiness(
        {
          names: m.business.names,
          ...(m.business.trade ? { trade: m.business.trade } : {}),
          ...(m.business.incorporation_date
            ? { incorporation_date: m.business.incorporation_date }
            : {}),
        },
        profile,
        others(m.business.partners),
        rules,
      );
    }
    if (m.compatibility) {
      const partner = profileOf(m.compatibility.partner, asOf, rules);
      modules.compatibility = {
        result: computeCompatibility(profile, partner, m.compatibility.relationship, rules),
        partner,
      };
    }
    let overlay: Overlay | undefined;
    if (b.overlay) {
      const parsed = OverlaySchema.safeParse(b.overlay);
      if (!parsed.success)
        throw new ApiError(
          400,
          "invalid_input",
          parsed.error.issues.map((i) => `overlay.${i.path.join(".")}: ${i.message}`).join("; "),
          "overlay",
        );
      overlay = parsed.data;
    }
    return buildReport({
      profile,
      library: library(b.language ?? "en"),
      audience: b.audience ?? "adult",
      modules,
      ...(b.branding ? { branding: b.branding } : {}),
      ...(overlay ? { overlay } : {}),
    });
  };
  app.openapi(
    post("/v1/report", "Reports", "Assembled report as JSON (sections, text, data)", ReportBody),
    (c) => {
      return c.json(buildFrom(c.req.valid("json")) as never, 200);
    },
  );
  app.openapi(
    createRoute({
      ...post(
        "/v1/report/html",
        "Reports",
        "The same report as one self-contained HTML page (the web app shows it on screen)",
        ReportBody,
      ),
      responses: {
        200: { content: { "text/html": { schema: z.string() } }, description: "The report page" },
        ...errors,
      },
    }),
    (c) =>
      c.html(renderReportHtml(buildFrom(c.req.valid("json")), { fontCss: embeddedFontCss() }), 200),
  );
  app.openapi(
    createRoute({
      ...post(
        "/v1/report/pdf",
        "Reports",
        "The same report rendered to an A4 PDF, with branding and edit overlay",
        ReportBody,
      ),
      responses: {
        200: {
          content: { "application/pdf": { schema: z.string().meta({ format: "binary" }) } },
          description: "The PDF file",
        },
        ...errors,
      },
    }),
    async (c) => {
      const doc = buildFrom(c.req.valid("json"));
      const pdf = await renderReportPdf(doc);
      return c.body(pdf as unknown as ArrayBuffer, 200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${doc.file_name}"`,
      });
    },
  );

  // ---- Rules ---------------------------------------------------------------
  app.openapi(
    createRoute({
      method: "get",
      path: "/v1/rules/profiles",
      tags: ["Rules"],
      summary: "List rule profiles",
      responses: { 200: json(Result, "OK"), 500: errors[500] },
    }),
    (c) => c.json({ profiles: listRuleProfiles(catalog) }, 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/v1/rules/profiles/{id}",
      tags: ["Rules"],
      summary: "Every setting with its value and source",
      request: {
        params: z.object({
          id: z.string().meta({ param: { name: "id", in: "path" }, example: "house-default" }),
        }),
      },
      responses: { 200: json(Result, "OK"), ...errors },
    }),
    (c) => {
      const rules = rulesFor(c.req.valid("param").id);
      return c.json(
        { profile: rules.profile, rules: rules.rulesVersion, settings: describeRules(rules) },
        200,
      );
    },
  );

  app.openapi(
    post(
      "/v1/rules/diff",
      "Rules",
      "Run one person under two profiles and list what changed",
      DiffBody,
    ),
    (c) => {
      const b = c.req.valid("json");
      const asOf = b.as_of ?? todayInIndia();
      const ra = rulesFor(b.a);
      const rb = rulesFor(b.b);
      const pa = computeProfile({ person: b.person, as_of: asOf }, ra);
      const pb = computeProfile({ person: b.person, as_of: asOf }, rb);
      const settings = describeRules(ra)
        .map((s, i) => ({ s, t: describeRules(rb)[i]! }))
        .filter(({ s, t }) => JSON.stringify(s.value) !== JSON.stringify(t.value))
        .map(({ s, t }) => ({ key: s.key, decision: s.decision, a: s.value, b: t.value }));
      return c.json(
        { a: ra.profile.id, b: rb.profile.id, as_of: asOf, settings, changes: diffResults(pa, pb) },
        200,
      );
    },
  );

  // ---- Service -------------------------------------------------------------
  app.openapi(
    createRoute({
      method: "get",
      path: "/v1/health",
      tags: ["Service"],
      summary: "Liveness",
      responses: { 200: json(z.object({ status: z.literal("ok") }), "OK") },
    }),
    (c) => c.json({ status: "ok" as const }, 200),
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/v1/version",
      tags: ["Service"],
      summary: "Engine, rules and text versions",
      responses: {
        200: json(
          z.object({
            engine: z.string(),
            rules: z.array(z.string()),
            texts: z.string().nullable(),
          }),
          "OK",
        ),
      },
    }),
    (c) =>
      c.json(
        { engine: ENGINE_VERSION, rules: Object.keys(rulesVersions), texts: TEXTS_VERSION },
        200,
      ),
  );

  app.doc31("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "KalaChakra API",
      version: ENGINE_VERSION,
      description:
        'Phase 1 API for the KalaChakra numerology engine. It serves only our own web app and listens on this computer. Every request may carry rule_profile, as_of, audience and language. Errors always look like {"error": {"code", "field", "message"}}.',
    },
  });
  app.get("/docs", Scalar({ url: "/openapi.json", pageTitle: "KalaChakra API" }));
  app.get("/", (c) => c.redirect("/docs"));

  return app;
}
