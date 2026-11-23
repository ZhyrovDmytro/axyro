import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertSameOrigin: vi.fn(),
  supabaseRequest: vi.fn(),
  enforceAuthRateLimit: vi.fn(),
  billingEmailConfigured: vi.fn(() => true),
  sendBillingEmail: vi.fn(),
}));

vi.mock("@/services/auth/server", () => mocks);
vi.mock("@/services/auth/supabase-request", () => mocks);
vi.mock("@/services/http/rate-limit", () => mocks);
vi.mock("@/services/billing/transactional-email", () => mocks);

import { POST } from "./route";

const details = {
  id: "6ae68bf1-bcf4-42fe-800e-eac4bdf2a690",
  name: "Jana Novak",
  contract_reference: "Invoice 4921",
  email: "jana@example.com",
};
const row = {
  ...details,
  site_id: "test-site",
  submitted_at: "2026-11-23T10:14:00+00:00",
  receipt_sent_at: null,
  operator_notified_at: null,
};

function request(data: typeof details = details) {
  return new Request("https://axyro.example/api/billing/withdrawal", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SITE_ID", "test-site");
  vi.stubEnv("AXYRO_SUPPORT_EMAIL", "operator@example.com");
  mocks.supabaseRequest.mockImplementation(async (_path, opts) =>
    opts.method ? null : [row],
  );
  mocks.sendBillingEmail.mockResolvedValue(undefined);
});

afterEach(() => vi.unstubAllEnvs());

it("records the notice before emailing the dated receipt and notifying the operator", async () => {
  const result = await POST(request());
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({
    message: expect.stringContaining("2026-11-23T10:14:00+00:00"),
    receiptSent: true,
  });
  expect(mocks.supabaseRequest).toHaveBeenCalledWith(
    expect.stringContaining("on_conflict=site_id,id"),
    expect.objectContaining({
      method: "POST",
      body: { ...details, site_id: row.site_id },
    }),
  );
  expect(mocks.supabaseRequest.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.sendBillingEmail.mock.invocationCallOrder[0],
  );
  expect(mocks.sendBillingEmail).toHaveBeenCalledTimes(2);
});

it("keeps a recorded withdrawal available when email fails", async () => {
  mocks.sendBillingEmail.mockRejectedValueOnce(
    new Error("Provider unavailable"),
  );
  expect(await (await POST(request())).json()).toMatchObject({
    receiptSent: false,
  });
  expect(mocks.sendBillingEmail).toHaveBeenCalledTimes(2);
});

it("does not send an email for a conflicting submission", async () => {
  expect(
    (await POST(request({ ...details, email: "someone@example.com" }))).status,
  ).toBe(409);
  expect(mocks.sendBillingEmail).not.toHaveBeenCalled();
});

it("skips delivery on retry when both emails were already sent", async () => {
  mocks.supabaseRequest.mockResolvedValueOnce(null).mockResolvedValueOnce([
    {
      ...row,
      receipt_sent_at: row.submitted_at,
      operator_notified_at: row.submitted_at,
    },
  ]);
  expect(await (await POST(request())).json()).toMatchObject({
    receiptSent: true,
  });
  expect(mocks.sendBillingEmail).not.toHaveBeenCalled();
});

it("recovers a pending receipt from the scheduled worker and skips the operator email already sent", async () => {
  const { retryWithdrawalEmail } =
    await import("@/services/billing/withdrawal");
  mocks.supabaseRequest.mockResolvedValueOnce([
    {
      ...row,
      operator_notified_at: row.submitted_at,
    },
  ]);

  expect(await retryWithdrawalEmail("test-site")).toEqual({
    attempted: 1,
    pending: 0,
  });

  const [path, options] = mocks.supabaseRequest.mock.calls[0];
  const query = new URL(path, "https://test.example/").searchParams;
  expect(query.get("site_id")).toBe("eq.test-site");
  expect(query.get("or")).toBe(
    "(receipt_sent_at.is.null,operator_notified_at.is.null)",
  );
  expect(query.get("order")).toBe(
    "last_delivery_attempt_at.asc.nullsfirst,submitted_at.asc",
  );
  expect(options.admin).toBe(true);
  expect(mocks.sendBillingEmail).toHaveBeenCalledExactlyOnceWith(
    details.email,
    "Axyro received your withdrawal",
    expect.stringContaining(row.submitted_at),
    `withdrawal-test-site-${details.id}-receipt_sent_at`,
  );
});

it("keeps the operator alert pending after its delivery fails", async () => {
  const { retryWithdrawalEmail } =
    await import("@/services/billing/withdrawal");
  mocks.supabaseRequest.mockResolvedValueOnce([
    {
      ...row,
      receipt_sent_at: row.submitted_at,
    },
  ]);
  mocks.sendBillingEmail.mockRejectedValueOnce(
    new Error("Provider unavailable"),
  );

  expect(await retryWithdrawalEmail("test-site")).toEqual({
    attempted: 1,
    pending: 1,
  });
  expect(mocks.sendBillingEmail).toHaveBeenCalledExactlyOnceWith(
    "operator@example.com",
    "Axyro Pro withdrawal received",
    expect.any(String),
    `withdrawal-test-site-${details.id}-operator_notified_at`,
  );
});
