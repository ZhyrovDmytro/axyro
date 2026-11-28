import { expect, test } from "@playwright/test";

test("guests can find withdrawal options and cannot open account billing actions", async ({
  page,
  request,
}) => {
  const terms = await page.goto("/terms");
  expect(terms?.status()).toBe(200);
  await page
    .getByRole("link", { name: /find withdrawal instructions/i })
    .click();
  await expect(
    page.getByRole("heading", { name: "Withdraw from your Pro contract" }),
  ).toBeVisible();

  const review = page.getByRole("button", { name: "Review withdrawal" });
  const emailFallback = page.getByText(/^Email your withdrawal to/i);
  await expect(review.or(emailFallback)).toBeVisible();
  if (await review.isVisible()) {
    await page.getByLabel("Full name").fill("Test Buyer");
    await page
      .getByLabel("Purchase reference, invoice number or date")
      .fill("Test invoice");
    await page.getByLabel("Email for your receipt").fill("buyer@example.test");
    await review.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Review your withdrawal" }),
    ).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Confirm withdrawal" }),
    ).toBeVisible();
  } else {
    await expect(emailFallback.getByRole("link")).toHaveAttribute(
      "href",
      /^mailto:[^@]+@[^@]+$/,
    );
  }

  const origin = new URL(page.url()).origin;
  for (const action of ["checkout", "portal", "restore"]) {
    const response = await request.post(`/api/billing/${action}`, {
      headers: { Origin: origin },
    });
    expect(response.status(), action).toBe(401);
    expect(response.headers()["cache-control"], action).toContain("no-store");
  }
  const crossOrigin = await request.post("/api/billing/withdrawal", {
    headers: { Origin: "https://unrelated.example" },
    data: {},
  });
  expect(crossOrigin.status()).toBe(403);
  expect(crossOrigin.headers()["cache-control"]).toContain("no-store");
});
