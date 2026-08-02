import { expect, test } from "@playwright/test";

/**
 * Settings persistence (doc 07_Verification_and_Validation.pdf, POM-009 --
 * "Durations and preferences persist safely"): both a duration change and a
 * theme change survive a reload.
 */
test.describe("Settings", () => {
  test("a changed focus duration and theme both persist across reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    const focusMinutesInput = page.getByLabel("Focus", { exact: true });
    await focusMinutesInput.fill("30");
    await focusMinutesInput.blur();

    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");

    await page.getByRole("button", { name: "Close settings" }).click();

    // The idle timer immediately reflects the new focus duration.
    await expect(page.locator(".timer-value")).toHaveText("30:00");

    await page.reload();
    await expect(page.locator(".timer-value")).toHaveText("30:00");

    await page.getByRole("button", { name: "Open settings" }).click();
    await expect(page.getByLabel("Focus", { exact: true })).toHaveValue("30");
    await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
