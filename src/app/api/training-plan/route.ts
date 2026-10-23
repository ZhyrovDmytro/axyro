import { getBillingAccess } from "@/services/billing/server";
import { assertSameOrigin } from "@/services/auth/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { exercises } from "@/content/exercises";
import { sportExerciseProfiles } from "@/content/sport-exercise-profiles";
import {
  aiPlanRequestSchema,
  modelPlanIntentSchemaForCandidates,
  type AiPlanRequest,
} from "@/domain/training-plan/ai-planner.schema";
import { generateTrainingPlan } from "@/domain/training-plan/generate-training-plan";
import {
  compileModelPlanIntent,
  modelCandidatesForProfile,
} from "@/domain/training-plan/model-assisted-planner";
import { assessTrainingPlanQuality } from "@/domain/training-plan/plan-quality";
import { TRAINING_PLAN_DURATION_DAYS } from "@/domain/training-plan/progression";
import {
  buildQuestionnaireContext,
  questionnaireFocusForSlot,
} from "@/domain/training-plan/questionnaire-context";

export const runtime = "nodejs";

function deterministicResponse(
  request: AiPlanRequest,
  reason: "disabled" | "unconfigured" | "model-failed",
) {
  const plan = generateTrainingPlan(
    request.profile,
    new Date(`${request.today}T12:00:00`),
    [],
    { adaptationProfile: request.adaptationProfile },
  );
  const quality = assessTrainingPlanQuality({
    plan,
    exerciseCatalog: exercises,
    sportProfiles: sportExerciseProfiles,
    preferredExerciseIds: request.adaptationProfile.preferredExercises,
  });
  if (!quality.valid) {
    throw new Error("The deterministic planner failed hard validation.");
  }
  return Response.json({
    plan: {
      ...plan,
      generation: { ...plan.generation, fallbackReason: reason },
    },
    quality,
    source: "fallback",
    reason,
  });
}

function plannerInput(request: AiPlanRequest) {
  const candidates = modelCandidatesForProfile(
    request.profile,
    request.adaptationProfile,
  );
  return {
    questionnaireAnswers: buildQuestionnaireContext(request.profile),
    recentTrainingContext: request.adaptationProfile,
    planRequirements: {
      durationDays: TRAINING_PLAN_DURATION_DAYS,
      weeklySessionCount: request.profile.sessionsPerWeek,
      sessionDurationMinutes: request.profile.sessionDurationMinutes,
      sessionFocusAssignments: Array.from(
        { length: request.profile.sessionsPerWeek },
        (_, slot) => ({
          sessionNumber: slot + 1,
          ...questionnaireFocusForSlot(request.profile, slot),
        }),
      ),
    },
    candidateExercises: candidates,
  };
}

async function requestIntent({
  client,
  model,
  request,
  repairErrors,
}: {
  client: OpenAI;
  model: string;
  request: AiPlanRequest;
  repairErrors?: string;
}) {
  const input = plannerInput(request);
  const outputSchema = modelPlanIntentSchemaForCandidates(
    input.candidateExercises.map((candidate) => candidate.id),
  );
  const response = await client.responses.parse({
    model,
    store: false,
    instructions: [
      "You select exercise intent for Axyro home-workout sessions.",
      "The questionnaire answers are the primary planning brief. Every selected physical development area and every selected padel priority must be visibly addressed by at least one weekly session.",
      "Return exactly the requested number of weekly sessions.",
      "Choose only candidate IDs and use each ID at most once per session.",
      "Respect pain, equipment, environment, avoided exercises, experience, goals, selected physical development areas, padel movement priorities, and recent difficulty.",
      "Across the weekly sessions, cover every selected physical development area at least once and include capacity work that builds a general padel foundation.",
      "Use performance and transfer exercises to address concrete padel priorities, but do not build a plan entirely from sport-mimicking drills.",
      "Distribute selected padel priorities across the week. A priority needs meaningful coverage in at least one session; do not repeat it in every session unless the exercise mix independently justifies that repetition.",
      "Use planRequirements.sessionFocusAssignments in session-number order. Each session must prioritize its assigned development areas and padel priorities before adding general foundation work.",
      "Balance body areas and movement patterns across the week; avoid excessive shoulder loading.",
      "Give each session a concise name for the physical work it contains, such as First-step strength and balance, Lateral strength and braking, or Shoulder strength and control.",
      "Do not use an intended on-court outcome as the session name. For example, prefer First-step strength and balance over Net-approach acceleration. Outcomes belong in supporting explanations.",
      "A name must represent the main exercise mix, not one accessory movement. Mention grip or forearm work only when a selected exercise has a dedicated grip_endurance or forearm_rotation movement role.",
      "Keep weekly session names meaningfully distinct. Do not use weekdays, ordinals, or generic labels such as Monday Session or Session 1.",
      "Treat safety exclusions only as movements to avoid; never describe pain or discomfort as a training goal.",
      "Do not prescribe sets, repetitions, work time, rest, cadence, or progression. Axyro compiles those deterministically.",
      "Keep the explanation concise and user-facing.",
      repairErrors
        ? `Repair the previous proposal using these validator errors: ${repairErrors}`
        : "This is the initial proposal.",
    ].join("\n"),
    input: JSON.stringify(input),
    text: {
      format: zodTextFormat(outputSchema, "axyro_plan_intent"),
    },
    max_output_tokens: 2500,
  });
  if (!response.output_parsed) {
    throw new Error("The model did not return a plan intent.");
  }
  return response.output_parsed;
}

export async function POST(rawRequest: Request) {
  try {
    assertSameOrigin(rawRequest);
    const access = await getBillingAccess();
    if (!access.user) return Response.json({ error: "Sign in to create your plan." }, { status: 401 });
    if (!access.hasPro) return Response.json({ error: "Pro is required to create a personalized plan." }, { status: 403 });
  } catch {
    return Response.json({ error: "Unable to verify plan access." }, { status: 503 });
  }
  let request: AiPlanRequest;
  try {
    request = aiPlanRequestSchema.parse(await rawRequest.json());
  } catch {
    return Response.json(
      { error: "Invalid training-plan request." },
      { status: 400 },
    );
  }

  if (process.env.AI_PLANNER_ENABLED !== "true") {
    return deterministicResponse(request, "disabled");
  }
  if (!process.env.OPENAI_API_KEY) {
    return deterministicResponse(request, "unconfigured");
  }

  const model = process.env.OPENAI_PLANNER_MODEL ?? "gpt-4o-mini";
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let repairErrors: string | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const intent = await requestIntent({
        client,
        model,
        request,
        ...(repairErrors ? { repairErrors } : {}),
      });
      const result = compileModelPlanIntent({
        intent,
        profile: request.profile,
        adaptationProfile: request.adaptationProfile,
        today: new Date(`${request.today}T12:00:00`),
        model,
      });
      return Response.json({
        ...result,
        source: attempt === 0 ? "openai" : "repair",
        reason: null,
      });
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        break;
      }
      repairErrors =
        error instanceof Error ? error.message.slice(0, 1200) : "Invalid plan.";
    }
  }
  return deterministicResponse(request, "model-failed");
}
