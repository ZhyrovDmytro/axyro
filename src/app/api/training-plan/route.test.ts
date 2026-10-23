import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultAdaptationProfile } from "@/domain/training-plan/adaptation-profile";

import { POST } from "./route";

vi.mock("@/services/auth/server", () => ({ assertSameOrigin: vi.fn() }));
vi.mock("@/services/billing/server", () => ({ getBillingAccess: vi.fn(async () => ({ user: { id: "test-user", role: "user" }, subscription: null, hasPro: true })) }));
import { getBillingAccess } from "@/services/billing/server";

const originalFlag = process.env.AI_PLANNER_ENABLED;

afterEach(() => {
  if (originalFlag === undefined) delete process.env.AI_PLANNER_ENABLED;
  else process.env.AI_PLANNER_ENABLED = originalFlag;
});

describe("training plan route", () => {
  it("rejects guests before evaluating plan input", async () => {
    vi.mocked(getBillingAccess).mockResolvedValueOnce({ user: null, subscription: null, hasPro: false });
    expect((await POST(new Request("http://localhost/api/training-plan", {method:"POST"}))).status).toBe(401);
  });
  it("rejects free accounts before generating a plan", async () => {
    vi.mocked(getBillingAccess).mockResolvedValueOnce({ user: { id:"test", email:"test@example.com", displayName:"Test", avatarUrl:null, role:"user", providers:["email"], isDevelopmentAdmin:false }, subscription:null, hasPro:false });
    expect((await POST(new Request("http://localhost/api/training-plan", {method:"POST"}))).status).toBe(403);
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
