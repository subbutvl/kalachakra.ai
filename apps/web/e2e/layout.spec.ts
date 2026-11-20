import { expect, test, type Page } from "@playwright/test";

// Phone layout (phase 1 spec, M8): no screen may scroll sideways, in either
// language. Runs on every project; the phone project is the one that matters.

const PRACTITIONER = {
  state: {
    settings: {
      name: "Asha Rao",
      title: "Numerologist",
      phone: "",
      email: "",
      website: "",
      logo: "",
      signature: "",
      defaultProfile: "house-default",
    },
    profile: { kind: "id", id: "house-default" },
    clients: [
      {
        id: "c1",
        person: { name: "Aarav Mehra", dob: "1991-08-14", gender: "male" },
        notes: "First session in November.",
        mobiles: ["9876524310"],
        created: "2026-11-20T00:00:00.000Z",
        reports: [],
      },
      {
        id: "c2",
        person: { name: "Diya Shah", dob: "1993-03-22", gender: "female" },
        notes: "",
        mobiles: [],
        created: "2026-11-20T00:00:00.000Z",
        reports: [],
      },
    ],
  },
  version: 0,
};

const CUSTOMER = {
  state: {
    base: "complete",
    addOns: ["mobile", "vehicle_house", "compatibility", "business"],
    details: {
      name: "Aarav Mehra",
      birthName: "",
      nickname: "",
      marriedName: "",
      dob: "1991-08-14",
      gender: "male",
      kuaBasis: "",
      birthTime: "",
      birthPlace: "",
      language: "en",
      mobiles: ["9876524310"],
      goals: [],
      vehicles: ["KA 05 MN 1234"],
      flat: "12B",
      building: "",
      door: "E",
      partnerName: "Diya Shah",
      partnerDob: "1993-03-22",
      partnerGender: "female",
      relationship: "couple",
      businessNames: ["Loomcraft Works"],
      trade: "",
      incorporationDate: "",
      businessPartners: [],
    },
  },
  version: 0,
};

const ROUTES = [
  "/",
  "/choose",
  "/details",
  "/check",
  "/practitioner",
  "/practitioner/labs",
  "/practitioner/rules",
  "/practitioner/settings",
  "/practitioner/client/c1",
  "/practitioner/client/c1/report",
];

async function seed(page: Page, locale: "en" | "ta") {
  await page.goto("/");
  await page.evaluate(
    ([p, c, l]: [string, string, string]) => {
      localStorage.setItem("kalachakra-practitioner", p);
      sessionStorage.setItem("kalachakra-customer", c);
      localStorage.setItem("kalachakra-locale", l);
    },
    [
      JSON.stringify(PRACTITIONER),
      JSON.stringify(CUSTOMER),
      JSON.stringify({ state: { locale }, version: 0 }),
    ] as [string, string, string],
  );
}

for (const locale of ["en", "ta"] as const) {
  test(`no screen scrolls sideways (${locale})`, async ({ page }) => {
    await seed(page, locale);
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("main h1").first()).toBeVisible();
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        const wide = [...document.querySelectorAll("main *")]
          .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1)
          .filter((el) => !el.closest("[data-scrolls]"))
          .slice(0, 3)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
        return { page: doc.scrollWidth - doc.clientWidth, wide };
      });
      expect(overflow, `${route} in ${locale}`).toEqual({ page: 0, wide: [] });
    }
  });
}
