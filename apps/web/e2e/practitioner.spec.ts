import { expect, test, type Page } from "@playwright/test";

// Key practitioner flows (phase 1 spec 6 and 10): the client desk, the
// working view, the rule profile switch with changes shown, the labs, and
// the report editor with its overlay, preview and branded PDF.

async function addClient(
  page: Page,
  name: string,
  dob: string,
  gender: "male" | "female",
  mobiles = "",
) {
  await page.getByRole("button", { name: "Add client" }).first().click();
  await page.getByLabel("Name in daily use").fill(name);
  await page.getByLabel("Date of birth").fill(dob);
  await page.getByLabel("Gender").selectOption(gender);
  if (mobiles) await page.getByLabel(/Mobile numbers/).fill(mobiles);
  await page.getByRole("button", { name: "Save client" }).click();
  await expect(page.getByTestId("client-card").filter({ hasText: name })).toBeVisible();
}

test.describe("practitioner mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/practitioner");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/practitioner/settings");
    await page.getByLabel("Your name").fill("Asha Rao");
    await page.goto("/practitioner");
    await addClient(page, "Aarav Mehra", "1991-08-14", "male", "9876524310");
    await addClient(page, "Diya Shah", "1993-03-22", "female");
  });

  test("client desk: search, duplicate, delete, and the data survives a reload", async ({
    page,
  }) => {
    await page.getByLabel("Search clients").fill("diya");
    await expect(page.getByTestId("client-card")).toHaveCount(1);
    await page.getByLabel("Search clients").fill("");
    await page
      .getByTestId("client-card")
      .filter({ hasText: "Diya Shah" })
      .getByRole("button", { name: "Duplicate" })
      .click();
    await expect(page.getByTestId("client-card")).toHaveCount(3);
    page.once("dialog", (d) => d.accept());
    await page
      .getByTestId("client-card")
      .filter({ hasText: "(copy)" })
      .getByRole("button", { name: "Delete" })
      .click();
    await page.reload();
    await expect(page.getByTestId("client-card")).toHaveCount(2);
  });

  test("working view highlights what changes when the rule profile changes", async ({ page }) => {
    await page
      .getByTestId("client-card")
      .filter({ hasText: "Aarav Mehra" })
      .getByRole("link", { name: "Open" })
      .click();
    await expect(page.getByRole("heading", { name: "Aarav Mehra" })).toBeVisible();
    await page.goto("/practitioner/rules");
    await expect(page.locator("[data-testid^=setting-]").first()).toBeVisible();
    await page.getByLabel("Profile in use").selectOption("kalachakra-classic");
    await expect(page.getByText("KalaChakra Classic").first()).toBeVisible();
    await expect(
      page.getByTestId("rule-changes").or(page.getByText(/No numbers change/)),
    ).toBeVisible();
  });

  test("labs update as you type", async ({ page }) => {
    await page.goto("/practitioner/labs");
    await page.getByLabel("Spelling").fill("Aarav Mehra");
    const first = await page.getByTestId("name-lab-result").innerText();
    await page.getByLabel("Spelling").fill("Aaarav Mehra");
    await expect(page.getByTestId("name-lab-result")).not.toHaveText(first);
    await page.getByRole("tab", { name: "Compatibility" }).click();
    await page.getByLabel("Second person").selectOption({ label: "Diya Shah" });
    await expect(page.getByTestId("compat-result")).toContainText("/100");
  });

  test("report editor: hide, reorder, edit with restore, note, preview and branded PDF", async ({
    page,
  }) => {
    await page
      .getByTestId("client-card")
      .filter({ hasText: "Aarav Mehra" })
      .getByRole("link", { name: "Report" })
      .click();
    await expect(page.getByRole("heading", { name: /report editor/i })).toBeVisible();

    await page.getByLabel("Show How to read this report").uncheck();
    await page.getByRole("button", { name: "Move Mulank (Driver) up" }).click();
    await page.getByRole("button", { name: "Mulank (Driver)", exact: true }).click();
    const para = page.getByLabel("Paragraph mulank.5.nature");
    await para.fill("My own words about this Mulank.");
    await para.blur();
    await expect(page.getByText(/^Original:/)).toBeVisible();
    await page.getByLabel("New note").first().fill("Discussed in our session on Monday.");
    await page.getByRole("button", { name: "Add note" }).first().click();
    await page.getByLabel("Status").selectOption("reviewed");

    await page.getByRole("button", { name: "Preview" }).click();
    const frame = page.frameLocator('iframe[title="Report preview"]');
    await expect(frame.getByText("My own words about this Mulank.")).toBeVisible();
    await expect(frame.getByText("Discussed in our session on Monday.")).toBeVisible();
    await expect(frame.getByText("Asha Rao").first()).toBeVisible();
    await expect(frame.getByRole("heading", { name: /How to read this report/i })).toHaveCount(0);

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/);

    // Restore brings the engine's text back; the report is kept in this browser.
    await page.getByRole("button", { name: "Restore original" }).click();
    await expect(page.getByText(/^Original:/)).toHaveCount(0);
    await page.reload();
    await expect(page.getByLabel("Status")).toHaveValue("reviewed");
  });
});
