import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  session: vi.fn(),
  billing: vi.fn(),
  hasCookie: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("./server", () => ({ getAuthSession: mock.session }));
vi.mock("@/services/billing/server", () => ({
  getBillingAccess: mock.billing,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ has: mock.hasCookie }),
}));
vi.mock("next/navigation", () => ({ redirect: mock.redirect }));
import { requireProPage } from "./guards";
beforeEach(() => {
  vi.clearAllMocks();
  mock.session.mockResolvedValue(null);
  mock.hasCookie.mockReturnValue(false);
});
describe("premium server page protection", () => {
  it("refreshes expired cookies through a route handler before rendering", async () => {
    mock.hasCookie.mockReturnValue(true);
    await expect(requireProPage("/plan/workouts/a/start")).rejects.toThrow(
      "REDIRECT:/api/auth/refresh?next=",
    );
    expect(mock.session).toHaveBeenCalledWith({ refresh: false });
    expect(mock.billing).not.toHaveBeenCalled();
  });
  it("denies Free execution and keeps its purchase destination", async () => {
    const session = {
      user: { id: "a", role: "user" },
      accessToken: "verified",
    };
    mock.session.mockResolvedValue(session);
    mock.billing.mockResolvedValue({ hasPro: false });
    await expect(
      requireProPage("/workouts/power/start", "workout"),
    ).rejects.toThrow("REDIRECT:/upgrade?context=workout&returnTo=");
    expect(mock.billing).toHaveBeenCalledWith(session);
  });
  it("renders only after trusted Pro confirmation", async () => {
    const session = {
      user: { id: "a", role: "user" },
      accessToken: "verified",
    };
    mock.session.mockResolvedValue(session);
    mock.billing.mockResolvedValue({ hasPro: true });
    expect(await requireProPage("/plan/workouts/a/start")).toEqual(
      session.user,
    );
    expect(mock.redirect).not.toHaveBeenCalled();
  });
});
