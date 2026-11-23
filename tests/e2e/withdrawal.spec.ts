import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("withdraws from a contract without signing in and downloads a dated receipt", async ({
  page,
}, testInfo) => {
  const attempts: {
    id: string;
    name: string;
    contract_reference: string;
    email: string;
  }[] = [];
  await page.route("**/api/billing/withdrawal", async (route) => {
    const details = route.request().postDataJSON();
    attempts.push(details);
    await route.fulfill({
      json: {
        message:
          "I withdraw from my Axyro Pro contract.\nPurchase: Invoice 4921\nSubmitted at: 2026-11-23T10:14:00Z",
        receiptSent: attempts.length > 1,
      },
    });
  });

  await page.goto("/terms");
  await page
    .getByRole("link", { name: "withdraw from the contract online" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Withdraw from your Pro contract" }),
  ).toBeVisible();
  await page.getByLabel("Full name").fill("Jana Novak");
  await page
    .getByLabel("Purchase reference, invoice number or date")
    .fill("Invoice 4921");
  await page.getByLabel("Email for your receipt").fill("jana@example.com");
  await page.getByRole("button", { name: "Review withdrawal" }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "Review your withdrawal" }),
  ).toBeFocused();
  expect(attempts).toHaveLength(0);
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(page.getByLabel("Full name")).toBeFocused();
  await expect(page.getByLabel("Full name")).toHaveValue("Jana Novak");
  await page.getByRole("button", { name: "Review withdrawal" }).click();

  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`withdrawal-${width}.png`),
    });
  }
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Confirm withdrawal" }).click();
  await expect(
    page.getByRole("heading", { name: "Withdrawal received" }),
  ).toBeFocused();
  await expect(page.getByText(/email receipt is still pending/)).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download receipt" }).click();
  expect((await download).suggestedFilename()).toBe("axyro-withdrawal.txt");
  await page.getByRole("button", { name: "Retry receipt email" }).click();
  await expect(
    page.getByText(/We sent a receipt to jana@example.com/),
  ).toBeVisible();
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual(attempts[0]);
});
