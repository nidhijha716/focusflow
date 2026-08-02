import { expect, test } from "@playwright/test";

/**
 * Critical timer lifecycle journey (doc 07_Verification_and_Validation.pdf
 * VAL-001/004/007/008): default focus duration, start/pause freezing the
 * displayed time, and refresh-recovery of a paused session.
 */
test.describe("Timer", () => {
  test("shows the default 25:00 focus duration on first load (VAL-001)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".timer-value")).toHaveText("25:00");
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  });

  test("start counts down, pause freezes the display, and a reload while paused restores it (VAL-004/007/008)", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    // Give the worker-driven countdown (250ms tick, see
    // constants/timer.constants.ts) time to move past the first whole second.
    await page.waitForTimeout(1_500);
    await expect(page.locator(".timer-value")).not.toHaveText("25:00");

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();

    const pausedTime = await page.locator(".timer-value").innerText();
    // Remaining time must not decrease while paused (VAL-007).
    await page.waitForTimeout(1_200);
    await expect(page.locator(".timer-value")).toHaveText(pausedTime);

    // Refresh while paused: state and remaining time restore, and the
    // timer does not silently resume or reset (VAL-004/008).
    await page.reload();
    await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
    await expect(page.locator(".timer-value")).toHaveText(pausedTime);
  });

  test("Skip advances to a short break with a fresh duration", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Skip" }).click();

    await expect(page.getByRole("radio", { name: "Short break", exact: true })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await expect(page.locator(".timer-value")).toHaveText("05:00");
  });
});
