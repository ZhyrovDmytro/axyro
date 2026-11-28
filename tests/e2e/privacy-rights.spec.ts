import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

import { mockFreeMember } from "./helpers/free-member";

test("exports only the current account's device data", async ({ page }) => {
  await mockFreeMember(page);
  await page.goto("/privacy");
  await expect(
    page.getByRole("link", { name: "Send a privacy request" }),
  ).toHaveAttribute("href", /^mailto:.+\?subject=Axyro%20privacy%20request$/);
  await page.getByRole("link", { name: "Privacy & data settings" }).click();
  const downloadButton = page.getByRole("button", {
    name: "Download training data",
  });
  await expect(downloadButton).toBeEnabled();
  await page.evaluate(() => {
    const key = "veyro.custom-workouts.v1";
    localStorage.setItem(
      `veyro.owner.a0000000-0000-4000-8000-000000000000.${key}`,
      JSON.stringify([{ name: "My workout" }]),
    );
    localStorage.setItem(
      `veyro.owner.another-account.${key}`,
      "Private workout",
    );
    localStorage.setItem(key, "Unattributed workout");
    localStorage.setItem("axyro.analytics.v1", "allowed");
  });
  const download = page.waitForEvent("download");
  await downloadButton.click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("axyro-training-data.json");
  const exported = await readFile(await file.path(), "utf8");
  expect(JSON.parse(exported)).toMatchObject({
    version: 1,
    trainingData: { "veyro.custom-workouts.v1": [{ name: "My workout" }] },
  });
  expect(exported).not.toMatch(
    /Private workout|Unattributed workout|analytics/,
  );
});

test("reports failed training-data deletion sync and allows retry", async ({
  page,
}) => {
  await mockFreeMember(page);
  let fail = true;
  await page.route("**/api/user-data", (route) => {
    if (route.request().method() !== "PUT") return route.fallback();
    expect(route.request().postDataJSON().data).toEqual({});
    return route.fulfill({ status: fail ? 503 : 200, json: { revision: 1 } });
  });
  await page.goto("/settings");
  await expect(
    page.getByText("Your account saves your profile", { exact: false }),
  ).toBeVisible();
  const remove = page.getByRole("button", { name: "Delete training data" });
  const confirm = page.getByRole("dialog").getByRole("button", {
    name: "Delete training data",
    exact: true,
  });
  await remove.click();
  await confirm.click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Axyro could not confirm" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/settings$/);

  fail = false;
  await remove.click();
  await confirm.click();
  await expect(page).toHaveURL(/\/plan\/setup$/);
});
