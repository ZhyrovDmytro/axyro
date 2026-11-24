import type { Page } from "@playwright/test";

export async function openNavigation(page: Page) {
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  if (await menu.isVisible()) await menu.click();
}

export function accountNavigation(page: Page) {
  return page
    .getByRole("banner")
    .or(page.getByRole("dialog", { name: "Navigation" }));
}
