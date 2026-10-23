"use client";

import { useMemo, useState } from "react";

import { UiIcon } from "@/components/ui-icon";
import type { Equipment, Exercise } from "@/domain/exercise/exercise.types";
import { feedbackAffectedBodyAreas } from "@/domain/training-plan/feedback-adaptation";
import {
  deriveTodayAdaptedSession,
  getReplacementCandidates,
  getTodaySessionEquipment,
} from "@/domain/training-plan/today-adaptation";
import type {
  PlannedWorkout,
  SessionAdaptation,
} from "@/domain/training-plan/training-plan.types";
import { formatSessionDurationMinutes } from "@/domain/workout/session-duration";
import {
  calculateSessionSectionDuration,
  flattenSessionSections,
} from "@/domain/workout/session-sections";

type AdaptMode =
  "menu" | "less-time" | "equipment" | "comfort" | "replace" | "preview";

const equipmentLabels: Record<Exclude<Equipment, "none">, string> = {
  light_dumbbell: "Light dumbbell",
  dumbbell: "Dumbbell",
  two_dumbbells: "Pair of dumbbells",
};

const comfortAreas = [
  ["shoulder", "Shoulder"],
  ["elbow-forearm", "Elbow / forearm"],
  ["wrist-hand", "Wrist / hand"],
  ["neck-upper-back", "Neck / upper back"],
  ["lower-back", "Lower back"],
  ["hip-groin", "Hip / groin"],
  ["knee", "Knee"],
  ["calf-achilles", "Calf / Achilles"],
  ["ankle-foot", "Ankle / foot"],
  ["other", "Other"],
] as const;

function replaceAdaptation(
  adaptations: readonly SessionAdaptation[],
  next: SessionAdaptation,
) {
  return [
    ...adaptations.filter((adaptation) => adaptation.type !== next.type),
    next,
  ];
}

function replacementAdaptation(
  adaptations: readonly SessionAdaptation[],
  exerciseId: string,
  replacementExerciseId: string,
) {
  const previousReplacement = adaptations.find(
    (
      adaptation,
    ): adaptation is Extract<SessionAdaptation, { type: "replace_exercise" }> =>
      adaptation.type === "replace_exercise" &&
      adaptation.replacementExerciseId === exerciseId,
  );
  const originalExerciseId = previousReplacement?.exerciseId ?? exerciseId;
  return [
    ...adaptations.filter(
      (adaptation) =>
        adaptation.type !== "replace_exercise" ||
        adaptation.exerciseId !== originalExerciseId,
    ),
    {
      type: "replace_exercise",
      exerciseId: originalExerciseId,
      replacementExerciseId,
    } as const,
  ];
}

export function AdaptTodayDialog({
  exerciseCatalog,
  initialExerciseId,
  onClose,
  onUse,
  open,
  session,
}: {
  exerciseCatalog: readonly Exercise[];
  initialExerciseId?: string | null;
  onClose: () => void;
  onUse: (adaptations: SessionAdaptation[]) => void;
  open: boolean;
  session: PlannedWorkout;
}) {
  const [mode, setMode] = useState<AdaptMode>(
    initialExerciseId ? "replace" : "menu",
  );
  const [pending, setPending] = useState<SessionAdaptation[]>(
    session.todayAdaptations,
  );
  const [replacementExerciseId] = useState<string | null>(
    initialExerciseId ?? null,
  );

  const preview = useMemo(
    () =>
      deriveTodayAdaptedSession({
        session,
        adaptations: pending,
        exerciseCatalog,
      }),
    [exerciseCatalog, pending, session],
  );
  const exerciseById = useMemo(
    () => new Map(exerciseCatalog.map((exercise) => [exercise.id, exercise])),
    [exerciseCatalog],
  );
  const todayEquipment = getTodaySessionEquipment(
    session.originalSessionSnapshot.workout,
    exerciseCatalog,
    session.originalSessionSnapshot.sections,
  );
  const unavailableEquipment = pending.flatMap((adaptation) =>
    adaptation.type === "equipment_unavailable" ? adaptation.equipmentIds : [],
  );
  const excludedBodyAreas = pending.flatMap((adaptation) =>
    adaptation.type === "body_area_discomfort"
      ? adaptation.bodyAreas.flatMap((area) =>
          area === "other" ? [] : feedbackAffectedBodyAreas[area],
        )
      : [],
  );
  const hasUnmappedComfort = pending.some(
    (adaptation) =>
      adaptation.type === "body_area_discomfort" &&
      adaptation.bodyAreas.includes("other"),
  );
  const replacementExercise = replacementExerciseId
    ? exerciseById.get(replacementExerciseId)
    : undefined;
  const replacements = replacementExercise
    ? getReplacementCandidates({
        exercise: replacementExercise,
        session,
        exerciseCatalog,
        availableEquipment: todayEquipment.filter(
          (equipment) => !unavailableEquipment.includes(equipment),
        ),
        unavailableEquipment,
        excludedBodyAreas,
      }).slice(0, 5)
    : [];
  const originalMinutes = formatSessionDurationMinutes(
    session.originalSessionSnapshot.estimatedDurationSeconds,
  );
  const durationOptions = [5, 10, 20].filter(
    (minutes) =>
      minutes * 60 < session.originalSessionSnapshot.estimatedDurationSeconds,
  );

  if (!open) return null;

  function chooseLighter() {
    setPending((current) =>
      current.some((adaptation) => adaptation.type === "lighter_session")
        ? current
        : [...current, { type: "lighter_session" }],
    );
    setMode("preview");
  }

  return (
    <div
      className="dialog-backdrop adapt-today-backdrop"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-labelledby="adapt-today-heading"
        aria-modal="true"
        className="adapt-today-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-heading">
          <div>
            <p className="kicker">Today only</p>
            <h2 id="adapt-today-heading">
              {mode === "menu"
                ? "Adapt today"
                : mode === "less-time"
                  ? "How much time do you have?"
                  : mode === "equipment"
                    ? "What don’t you have today?"
                    : mode === "comfort"
                      ? "Where do you feel uncomfortable?"
                      : mode === "replace"
                        ? `Replace ${replacementExercise?.name ?? "exercise"}`
                        : "Updated session"}
            </h2>
          </div>
          <button
            aria-label="Close Adapt today"
            onClick={onClose}
            type="button"
          >
            <UiIcon name="close" />
          </button>
        </div>

        {mode === "menu" && (
          <div className="adapt-today-menu">
            <button onClick={() => setMode("less-time")} type="button">
              <strong>I have less time</strong>
              <span>Fit the same training intent into a shorter session.</span>
            </button>
            <button
              disabled={todayEquipment.length === 0}
              onClick={() => setMode("equipment")}
              type="button"
            >
              <strong>I don’t have my equipment</strong>
              <span>
                Only replace movements that need unavailable equipment.
              </span>
            </button>
            <button onClick={() => setMode("comfort")} type="button">
              <strong>I feel sore or uncomfortable</strong>
              <span>Avoid loading the selected area today.</span>
            </button>
            <button onClick={chooseLighter} type="button">
              <strong>Make today lighter</strong>
              <span>
                Keep the focus with slightly less work and more recovery.
              </span>
            </button>
          </div>
        )}

        {mode === "less-time" && (
          <div className="adapt-choice-grid">
            {durationOptions.length > 0 ? (
              durationOptions.map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => {
                    setPending((current) =>
                      replaceAdaptation(current, {
                        type: "less_time",
                        requestedDurationSeconds: minutes * 60,
                      }),
                    );
                    setMode("preview");
                  }}
                  type="button"
                >
                  {minutes} min
                </button>
              ))
            ) : (
              <p>This session is already at the minimum supported duration.</p>
            )}
          </div>
        )}

        {mode === "equipment" && (
          <div className="adapt-form-section">
            <div className="adapt-choice-grid">
              {todayEquipment.map((equipment) => {
                const checked = unavailableEquipment.includes(equipment);
                return (
                  <label key={equipment}>
                    <input
                      checked={checked}
                      onChange={() => {
                        const selected = checked
                          ? unavailableEquipment.filter(
                              (candidate) => candidate !== equipment,
                            )
                          : [...unavailableEquipment, equipment];
                        setPending((current) => [
                          ...current.filter(
                            (adaptation) =>
                              adaptation.type !== "equipment_unavailable",
                          ),
                          ...(selected.length > 0
                            ? [
                                {
                                  type: "equipment_unavailable" as const,
                                  equipmentIds: selected,
                                },
                              ]
                            : []),
                        ]);
                      }}
                      type="checkbox"
                    />
                    {equipmentLabels[equipment]}
                  </label>
                );
              })}
            </div>
            <button
              className="button button--primary button--full"
              disabled={unavailableEquipment.length === 0}
              onClick={() => setMode("preview")}
              type="button"
            >
              Preview changes
            </button>
          </div>
        )}

        {mode === "comfort" && (
          <div className="adapt-choice-grid adapt-choice-grid--areas">
            {comfortAreas.map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  setPending((current) =>
                    replaceAdaptation(current, {
                      type: "body_area_discomfort",
                      bodyAreas: [value],
                    }),
                  );
                  setMode("preview");
                }}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {mode === "replace" && (
          <div className="replacement-list">
            {replacements.length > 0 ? (
              replacements.map((candidate, index) => (
                <button
                  key={candidate.exercise.id}
                  onClick={() => {
                    if (!replacementExercise) return;
                    setPending((current) =>
                      replacementAdaptation(
                        current,
                        replacementExercise.id,
                        candidate.exercise.id,
                      ),
                    );
                    setMode("preview");
                  }}
                  type="button"
                >
                  <span>
                    <strong>{candidate.exercise.name}</strong>
                    <small>
                      {index === 0 ? "Best match" : "Compatible"} ·{" "}
                      {candidate.exercise.equipment.includes("none")
                        ? "No equipment"
                        : candidate.exercise.equipment
                            .map((equipment) =>
                              equipment === "none"
                                ? "No equipment"
                                : equipmentLabels[equipment],
                            )
                            .join(", ")}
                    </small>
                  </span>
                  <UiIcon name="arrow-right" />
                </button>
              ))
            ) : (
              <p>No safe close match is available in the current library.</p>
            )}
          </div>
        )}

        {mode === "preview" && (
          <div className="adapt-preview">
            <div className="adapt-comparison">
              <div>
                <span>Before</span>
                <strong>{originalMinutes} min</strong>
                <small>
                  {
                    flattenSessionSections(
                      session.originalSessionSnapshot.sections,
                    ).length
                  }{" "}
                  exercises
                </small>
              </div>
              <UiIcon name="arrow-right" />
              <div>
                <span>After</span>
                <strong>
                  {formatSessionDurationMinutes(
                    preview.estimatedDurationSeconds,
                  )}{" "}
                  min
                </strong>
                <small>
                  {flattenSessionSections(preview.sections).length} exercises
                </small>
              </div>
            </div>
            <div className="adapt-section-comparison">
              {preview.sections.map((section) => (
                <span key={section.type}>
                  {section.type === "warmup"
                    ? "Warm-up"
                    : section.type === "cooldown"
                      ? "Cooldown"
                      : "Workout"}{" "}
                  ·{" "}
                  {formatSessionDurationMinutes(
                    calculateSessionSectionDuration(section),
                  )}{" "}
                  min
                </span>
              ))}
            </div>
            <div className="adapt-preview__changes">
              <strong>Changes</strong>
              <ul>
                {preview.replacedExerciseCount > 0 && (
                  <li>
                    {preview.replacedExerciseCount} exercise
                    {preview.replacedExerciseCount === 1 ? "" : "s"} replaced
                  </li>
                )}
                {preview.removedExerciseCount > 0 && (
                  <li>
                    {preview.removedExerciseCount} affected exercise
                    {preview.removedExerciseCount === 1 ? "" : "s"} removed
                  </li>
                )}
                {preview.changedRoundCount > 0 && (
                  <li>
                    Rounds adjusted on {preview.changedRoundCount} exercise
                    {preview.changedRoundCount === 1 ? "" : "s"}
                  </li>
                )}
                {pending.some(
                  (adaptation) => adaptation.type === "lighter_session",
                ) && <li>Selected work reduced with a little more recovery</li>}
                {pending.some(
                  (adaptation) => adaptation.type === "less_time",
                ) && (
                  <li>
                    Main movement intent preserved within the shorter target
                  </li>
                )}
              </ul>
            </div>
            {preview.affectedExerciseCount > 0 &&
              pending.some(
                (adaptation) => adaptation.type === "body_area_discomfort",
              ) && (
                <p className="adapt-safety-copy">
                  {preview.affectedExerciseCount} exercise
                  {preview.affectedExerciseCount === 1 ? " is" : "s are"}{" "}
                  affected. We won’t increase work involving the selected area
                  today. If discomfort is significant or persists, stop the
                  movement and consider professional advice.
                </p>
              )}
            {preview.unresolvedExerciseCount > 0 && (
              <p className="adapt-safety-copy">
                The current library does not contain a safe compatible session
                for all selected constraints. Keep the original session or
                change the selected adaptation.
              </p>
            )}
            {hasUnmappedComfort && (
              <p className="adapt-safety-copy">
                “Other” cannot be mapped to exercises safely. Cancel this change
                and use Replace on any movement that feels uncomfortable.
              </p>
            )}
            <div className="button-row">
              <button
                className="button button--primary"
                disabled={
                  preview.unresolvedExerciseCount > 0 || hasUnmappedComfort
                }
                onClick={() => onUse(pending)}
                type="button"
              >
                Use this session
              </button>
              <button
                className="button button--secondary"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {mode !== "menu" && mode !== "preview" && (
          <button
            className="text-button adapt-dialog-back"
            onClick={() => setMode("menu")}
            type="button"
          >
            <UiIcon name="arrow-left" /> All options
          </button>
        )}
      </section>
    </div>
  );
}
