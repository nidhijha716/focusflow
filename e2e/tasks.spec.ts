import { expect, test } from "@playwright/test";

/**
 * Task CRUD smoke test (doc 07_Verification_and_Validation.pdf VAL-010):
 * create, select, complete, and delete a task, with persistence checked
 * across a reload.
 */
test.describe("Tasks", () => {
  test("create, select, complete, delete, and persist across reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open tasks" }).click();

    const heading = page.getByRole("heading", { name: "Tasks" });
    await expect(heading).toBeVisible();

    await page.getByPlaceholder("Add a task").fill("Write the report");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    // `^Write the report` (not `exact: true`) because once selected, this
    // same button's accessible name gains a " Selected" suffix (below) --
    // anchoring to the start still avoids the sibling "Move ... up/down"/
    // "Add subtask under ..."/"Delete ..." buttons, which all mention the
    // title in the middle/end of their own name, never at the start.
    const taskButton = page.getByRole("button", { name: /^Write the report/ });
    await expect(taskButton).toBeVisible();

    // Selecting attaches this task to the next completed focus session
    // (POM-018) -- selection also persists (see below).
    await taskButton.click();
    // `exact: true` avoids also matching BackgroundPicker's unrelated
    // "None (selected)" swatch label, which is present (though not visible --
    // its own dialog is closed) as soon as it's dynamically imported.
    await expect(page.getByText("Selected", { exact: true })).toBeVisible();

    // Reload keeps the task and its selection (POM-015/018).
    await page.reload();
    await page.getByRole("button", { name: "Open tasks" }).click();
    await expect(page.getByRole("button", { name: /^Write the report/ })).toBeVisible();
    await expect(page.getByText("Selected", { exact: true })).toBeVisible();

    // Complete it.
    await page.getByRole("checkbox", { name: 'Mark "Write the report" complete' }).check();
    await expect(page.getByRole("checkbox", { name: 'Mark "Write the report" incomplete' })).toBeChecked();

    // Delete it.
    await page.getByRole("button", { name: 'Delete "Write the report"' }).click();
    await expect(page.getByRole("button", { name: "Write the report" })).toHaveCount(0);

    // Deletion persists too -- no leftover after reload.
    await page.reload();
    await page.getByRole("button", { name: "Open tasks" }).click();
    await expect(page.getByText("No tasks yet.")).toBeVisible();
  });
});
