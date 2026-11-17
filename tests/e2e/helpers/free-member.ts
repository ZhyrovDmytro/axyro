import type { Page } from "@playwright/test";

export async function mockFreeMember(page: Page) {
  const user = {
    id: "a0000000-0000-4000-8000-000000000000",
    email: "free@example.com",
    displayName: "Free player",
    role: "user",
    providers: ["email"],
    avatarUrl: null,
    isDevelopmentAdmin: false,
  };
  let data: Record<string, string> = {};
  let revision = 0;
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: { user, configured: true, developmentAdminEnabled: false },
    }),
  );
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({ json: { hasPro: false, subscription: null } }),
  );
  await page.route("**/api/user-data", (route) => {
    if (route.request().method() === "PUT") {
      data = route.request().postDataJSON().data;
      return route.fulfill({ json: { revision: ++revision } });
    }
    return route.fulfill({ json: { userId: user.id, data, revision } });
  });
}
