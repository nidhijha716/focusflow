import { expect, test } from "@playwright/test";

/**
 * Single-modal dialog registry (components/ui/Dialog.tsx): every dialog
 * opens via its trigger and closes via both its close button and Escape,
 * and switching between two different dialogs back-to-back never leaves
 * either one stuck un-closeable.
 *
 * Note on scope: the registry's docstring motivating example ("Background
 * stacked on Settings, can't close either") describes two *simultaneously*
 * open modals. That specific state is no longer reachable through real user
 * interaction at all now that every dialog is a native `showModal()` modal --
 * per the HTML spec, a modal dialog makes the entire rest of the document
 * (including the header's own trigger buttons) inert, so a real user
 * physically cannot click a second dialog's trigger while a first is still
 * open; they must close it first (Escape, backdrop click, or its own close
 * button). This test instead exercises the registry the way it's actually
 * reachable: opening/closing Tasks and Settings back-to-back, proving the
 * shared `openDialog` pointer (components/ui/Dialog.tsx) is correctly handed
 * off/cleared each time so neither dialog's own close paths ever get stuck.
 */
test.describe("Dialogs", () => {
  test("Tasks and Settings each open via their trigger and close via both the close button and Escape, with nothing left stuck", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Open tasks" }).click();
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await page.getByRole("button", { name: "Close tasks" }).click();
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeHidden();

    // Settings opens and closes normally right after Tasks did -- proves the
    // registry's pointer to the now-closed Tasks dialog didn't leak into
    // Settings' own open/close handling.
    await page.getByRole("button", { name: "Open settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeHidden();

    // And back to Tasks again -- neither dialog is stuck after alternating.
    await page.getByRole("button", { name: "Open tasks" }).click();
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeHidden();

    await page.getByRole("button", { name: "Open settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.getByRole("button", { name: "Close settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeHidden();
  });
});
