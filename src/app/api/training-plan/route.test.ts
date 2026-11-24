import { afterEach, describe, expect, it, vi } from "vitest";
import { enforceRateLimit } from "@/services/http/rate-limit";
vi.mock("@/services/http/rate-limit", () => ({
  enforceRateLimit: vi.fn(async (): Promise<Response | null> => null),
}));

import { defaultAdaptationProfile } from "@/domain/training-plan/adaptation-profile";
import { painAreaValues } from "@/domain/training-plan/training-plan.schema";

import { POST } from "./route";

vi.mock("@/services/auth/server", () => ({ assertSameOrigin: vi.fn() }));
vi.mock("@/services/billing/server", () => ({
  getBillingAccess: vi.fn(async () => ({
    user: { id: "test-user", role: "user" },
    subscription: null,
    hasPro: true,
  })),
}));
import { getBillingAccess } from "@/services/billing/server";

const originalFlag = process.env.AI_PLANNER_ENABLED;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  if (originalFlag === undefined) delete process.env.AI_PLANNER_ENABLED;
  else process.env.AI_PLANNER_ENABLED = originalFlag;
});

describe("training plan route", () => {
  it.each([429, 503])(
    "does not generate a plan when quota protection returns %s",
    async (status) => {
      vi.mocked(enforceRateLimit).mockResolvedValueOnce(
        new Response(null, { status }),
      );
      const response = await POST(
        new Request("http://localhost/api/training-plan", { method: "POST" }),
      );
      expect(response.status).toBe(status);
      expect(enforceRateLimit).toHaveBeenCalledWith("planner", "test-user");
    },
  );
  it("returns a recoverable response when no plan fits the selected constraints", async () => {
    process.env.AI_PLANNER_ENABLED = "false";
    const response = await POST(
      new Request("http://localhost/api/training-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          today: "2026-10-31",
          adaptationProfile: defaultAdaptationProfile,
          profile: {
            sport: "padel",
            experience: "beginner",
            sessionsPerWeek: 3,
            sessionDurationMinutes: 20,
            preferredDays: ["monday", "wednesday", "friday"],
            equipment: ["bodyweight"],
            goals: ["movement-speed"],
            developmentAreas: [],
            padelLimitations: [],
            painAreas: [...painAreaValues],
            matches: [],
          },
        }),
      }),
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: "unsupported-plan" });
  });
  it("excludes feedback and raw repair errors from every model request", async () => {
    vi.stubEnv("AI_PLANNER_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "test-only");
    const requests: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init: RequestInit) => {
      requests.push(String(init.body));
      return Response.json({ id: "test", output: [], status: "completed" });
    }));
    const body = {
      today: "2026-09-28",
      profile: {
        sport: "other", experience: "beginner", sessionsPerWeek: 1,
        sessionDurationMinutes: 10, preferredDays: ["monday"],
        equipment: ["bodyweight"], goals: ["strength"], painAreas: [] as string[],
      },
      adaptationProfile: { ...defaultAdaptationProfile, avoidExercises: ["private-feedback-marker"] },
    };
    const send = () => POST(new Request("http://localhost/api/training-plan", {
      method: "POST", body: JSON.stringify(body),
    }));
    await send();
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(request).not.toMatch(/private-feedback-marker|recentTrainingContext|safetyExclusions|painAreas/);
    }
    body.profile.painAreas = ["shoulder"];
    await send();
    expect(requests).toHaveLength(2);
  });
  it("rejects guests before evaluating plan input", async () => {
    vi.mocked(getBillingAccess).mockResolvedValueOnce({
      user: null,
      subscription: null,
      hasPro: false,
    });
    expect(
      (
        await POST(
          new Request("http://localhost/api/training-plan", { method: "POST" }),
        )
      ).status,
    ).toBe(401);
  });
  it("rejects free accounts before generating a plan", async () => {
    vi.mocked(getBillingAccess).mockResolvedValueOnce({
      user: {
        id: "test",
        email: "test@example.com",
        displayName: "Test",
        avatarUrl: null,
        role: "user",
        providers: ["email"],
        isDevelopmentAdmin: false,
      },
      subscription: null,
      hasPro: false,
    });
    expect(
      (
        await POST(
          new Request("http://localhost/api/training-plan", { method: "POST" }),
        )
      ).status,
    ).toBe(403);
  });
  it("returns a validated deterministic plan while the feature is disabled", async () => {
    process.env.AI_PLANNER_ENABLED = "false";
    const response = await POST(
      new Request("http://localhost/api/training-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          today: "2026-09-28",
          adaptationProfile: defaultAdaptationProfile,
          profile: {
            sport: "padel",
            experience: "beginner",
            sessionsPerWeek: 3,
            sessionDurationMinutes: 20,
            preferredDays: ["monday", "wednesday", "friday"],
            equipment: ["bodyweight"],
            goals: ["movement-speed"],
            developmentAreas: [],
            padelLimitations: [],
            painAreas: [],
            matches: [],
          },
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.source).toBe("fallback");
    expect(payload.reason).toBe("disabled");
    expect(payload.quality.valid).toBe(true);
    expect(payload.plan.generation.source).toBe("deterministic");
    expect(payload.plan.generation.fallbackReason).toBe("disabled");
  });

  it("applies the compact adaptation profile to deterministic fallback", async () => {
    process.env.AI_PLANNER_ENABLED = "false";
    const avoidedExerciseId = "bodyweight-squat";
    const response = await POST(
      new Request("http://localhost/api/training-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          today: "2026-09-28",
          adaptationProfile: {
            ...defaultAdaptationProfile,
            avoidExercises: [avoidedExerciseId],
          },
          profile: {
            sport: "padel",
            experience: "intermediate",
            sessionsPerWeek: 3,
            sessionDurationMinutes: 20,
            preferredDays: ["monday", "wednesday", "friday"],
            equipment: ["bodyweight", "one-dumbbell"],
            goals: ["movement-speed"],
            developmentAreas: [],
            padelLimitations: [],
            painAreas: [],
            matches: [],
          },
        }),
      }),
    );
    const payload = await response.json();
    const exerciseIds = payload.plan.sessions.flatMap(
      (session: {
        sections: Array<{ items: Array<{ exerciseId: string }> }>;
      }) =>
        session.sections.flatMap((section) =>
          section.items.map((item) => item.exerciseId),
        ),
    );

    expect(response.status).toBe(200);
    expect(exerciseIds).not.toContain(avoidedExerciseId);
  });
});
