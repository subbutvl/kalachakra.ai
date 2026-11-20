import { expect, test } from "@playwright/test";

// Key customer flows (phase 1 spec 5 and 10): form validation, the check
// screen, the report on screen, PDF download, language, start again.

test.describe("customer mode", () => {
  test("home shows what the report covers and the mode switch", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /your numbers, explained/i })).toBeVisible();
    await expect(page.getByText("What the report covers")).toBeVisible();
    await page.getByRole("link", { name: "Practitioner" }).click();
    await expect(page.getByRole("heading", { name: /client desk/i })).toBeVisible();
    await page.getByRole("link", { name: "Customer", exact: true }).click();
    await expect(page).toHaveURL("/");
  });

  test("a complete report with a mobile number, end to end", async ({ page }) => {
    await page.goto("/choose");
    await page.getByText("Mobile numbers", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Validation as you type.
    await page.getByLabel("Full name as used daily").fill("A");
    await page.getByLabel("Date of birth").fill("1991-08-14");
    await page.getByLabel("Mobile 1").fill("12345");
    await page.getByRole("button", { name: "Check my details" }).click();
    await expect(page.getByText("A name needs at least 2 letters.")).toBeVisible();
    await expect(page.getByText(/10-digit Indian mobile number/)).toBeVisible();

    await page.getByLabel("Full name as used daily").fill("Aarav Mehra");
    await page.getByLabel("Gender (used for the Kua number)").selectOption("male");
    await page.getByLabel("Mobile 1").fill("+91 98765 24310");
    await page.getByRole("button", { name: "Check my details" }).click();

    // The check screen shows the name as it will be scored.
    await expect(page.getByRole("heading", { name: /check your details/i })).toBeVisible();
    await expect(page.getByText("AARAV MEHRA")).toBeVisible();
    await expect(page.getByText("14 August 1991")).toBeVisible();
    await page.getByRole("button", { name: "Generate report" }).click();

    // The report on screen with its contents list.
    const contents = page.getByRole("navigation", { name: "Report contents" });
    await expect(contents).toBeVisible();
    await expect(contents.getByText("Mulank (Driver)")).toBeVisible();
    await expect(contents.getByText(/Mobile number: \+91 98765 24310/)).toBeVisible();
    const frame = page.frameLocator('iframe[title="Your report"]');
    await expect(frame.getByText("Mulank 5 is ruled by Mercury", { exact: false })).toBeVisible();

    // Download the PDF.
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    expect((await download).suggestedFilename()).toMatch(
      /^Kalachakra_Aarav_Mehra_Complete_\d{4}-\d{2}-\d{2}\.pdf$/,
    );

    // Start again clears the tab's data.
    await page.getByRole("button", { name: "Start again" }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/check");
    await expect(page.getByText("Please enter your details first.")).toBeVisible();
  });

  test("a child report in Tamil", async ({ page }) => {
    await page.goto("/choose");
    await page.getByText("Child report (for parents)").click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Full name as used daily").fill("Myra Kapoor");
    await page.getByLabel("Date of birth").fill("2016-03-09");
    await page.getByLabel("Gender (used for the Kua number)").selectOption("female");
    await page.getByLabel("Report language").selectOption("ta");
    await page.getByRole("button", { name: "Check my details" }).click();
    await page.getByRole("button", { name: "Generate report" }).click();
    const contents = page.getByRole("navigation", { name: "Report contents" });
    await expect(contents.getByText("பிறவி எண் (இயக்குநர்)")).toBeVisible();
    await expect(contents.getByText("பள்ளியும் கற்றலும்")).toBeVisible();
  });

  test("rejects a date that does not exist and Tamil script names", async ({ page }) => {
    await page.goto("/details");
    await page.getByLabel("Full name as used daily").fill("சுப்பு");
    await page.getByLabel("Date of birth").fill("2023-02-28");
    await page.getByRole("button", { name: "Check my details" }).click();
    await expect(page.getByText(/type the name in English letters/)).toBeVisible();
  });

  test("the sample report opens without entering anything", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "See a sample report" }).click();
    await expect(page.getByRole("heading", { name: /sample report/i })).toBeVisible();
    await expect(
      page.frameLocator('iframe[title="Your report"]').getByText("Prepared for Aarav Mehra"),
    ).toBeVisible();
  });
});
