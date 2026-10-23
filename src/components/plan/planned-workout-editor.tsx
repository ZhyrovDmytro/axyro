"use client";

import { isExercisePlanEligible } from "@/domain/content/catalog-quality";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { UiIcon } from "@/components/ui-icon";
import { exercises } from "@/content/exercises";
import { formatPlanDate } from "@/domain/training-plan/date";
import { refreshPlannedWorkoutDuration } from "@/domain/training-plan/generate-training-plan";
import type { PlannedWorkout } from "@/domain/training-plan/training-plan.types";
import type { WorkoutItem } from "@/domain/workout/workout.types";
import {
  intensityLevels,
  intensityPresets,
  type IntensityLevel,
} from "@/domain/workout/intensity";
import { formatSessionDurationMinutes } from "@/domain/workout/session-duration";
import {
  calculateSessionSectionDuration,
  calculateSessionSectionsDuration,
} from "@/domain/workout/session-sections";
import { useTrainingPlan } from "@/hooks/use-training-plan";
import { AdaptTodayDialog } from "@/components/plan/adapt-today-dialog";
import {
  applyTodayAdaptationsToSession,
  resetTodayAdaptations,
} from "@/domain/training-plan/today-adaptation";
import { useActiveWorkoutSession } from "@/hooks/use-active-workout-session";
import { WorkoutConfigurator } from "@/components/workout/effort-options";
import {
  formatDumbbellAvailability,
  formatDurationPreferenceMessage,
  titleCase,
} from "@/lib/format";

function uniqueItemId(exerciseId: string) {
  return `custom-${exerciseId}-${Date.now()}`;
}

type DragPreview = {
  itemId: string;
  left: number;
  top: number;
  width: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
};

export function PlannedWorkoutEditor({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { plan, ready, updatePlan } = useTrainingPlan();
  const source = plan?.sessions.find((session) => session.id === sessionId);
  const [draft, setDraft] = useState<PlannedWorkout | null>(null);
  const [query, setQuery] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const [intensity, setIntensity] = useState<IntensityLevel>("standard");
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [reorderAnnouncement, setReorderAnnouncement] = useState("");
  const [adaptTodayOpen, setAdaptTodayOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replacementExerciseId, setReplacementExerciseId] = useState<
    string | null
  >(null);
  const activeWorkout = useActiveWorkoutSession();
  const isResumable =
    activeWorkout?.kind === "valid" &&
    activeWorkout.state.sessionId === sessionId;
  const resumeHref = isResumable ? activeWorkout.state.resumeHref : null;
  const draggedItemIdRef = useRef<string | null>(null);

  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [],
  );
  const filteredExercises = exercises.filter((exercise) => {
    if (
      !isExercisePlanEligible(exercise) ||
      !exercise.sessionRoles.includes("main") ||
      (draft ?? source)?.workout.items.some(
        (item) => item.exerciseId === exercise.id,
      ) ||
      (draft ?? source)?.sections.some(
        (section) =>
          section.type !== "main" &&
          section.items.some((item) => item.exerciseId === exercise.id),
      )
    )
      return false;
    const search = query.trim().toLowerCase();
    return (
      !search ||
      `${exercise.name} ${exercise.shortDescription}`
        .toLowerCase()
        .includes(search)
    );
  });

  if (!ready)
    return <main className="page-shell plan-loading">Loading session…</main>;
  if (!source)
    return (
      <main className="page-shell plan-empty">
        <section>
          <p className="kicker">Session unavailable</p>
          <h1>We couldn’t find that workout.</h1>
          <Link className="button button--primary" href="/plan">
            Back to plan
          </Link>
        </section>
      </main>
    );
  const sourceSession = source;
  const shownDraft = draft ?? sourceSession;
  const reviewExerciseIds = new Set(
    shownDraft.feedbackAdaptations.flatMap((adaptation) =>
      adaptation.changes.flatMap((change) =>
        change.type === "block_progression" ? [change.exerciseId] : [],
      ),
    ),
  );
  const refreshedAdaptationSession = refreshPlannedWorkoutDuration(shownDraft);
  const shownDurationSeconds = calculateSessionSectionsDuration(
    refreshedAdaptationSession.sections,
  );
  const shownDurationMinutes =
    formatSessionDurationMinutes(shownDurationSeconds);
  const shownExercises = shownDraft.workout.items.flatMap((item) => {
    const exercise = exerciseById.get(item.exerciseId);
    return exercise ? [exercise] : [];
  });
  const shownEquipment = [
    ...new Set(shownExercises.flatMap((exercise) => exercise.equipment)),
  ];
  const durationPreferenceMessage = formatDurationPreferenceMessage({
    actualSeconds: shownDurationSeconds,
    targetSeconds: shownDraft.targetDurationSeconds,
    status: refreshedAdaptationSession.durationStatus,
  });
  const adaptationSession =
    refreshedAdaptationSession.todayAdaptations.length > 0
      ? refreshedAdaptationSession
      : {
          ...refreshedAdaptationSession,
          originalSessionSnapshot: {
            workout: refreshedAdaptationSession.workout,
            sections: refreshedAdaptationSession.sections,
            targetDurationSeconds:
              refreshedAdaptationSession.targetDurationSeconds,
            estimatedDurationSeconds:
              refreshedAdaptationSession.estimatedDurationSeconds,
            durationDeltaSeconds:
              refreshedAdaptationSession.durationDeltaSeconds,
            durationStatus: refreshedAdaptationSession.durationStatus,
            adjustments: refreshedAdaptationSession.adjustments,
          },
        };

  function updateItem(itemId: string, update: Partial<WorkoutItem>) {
    setDraft((current) => {
      const base = current ?? sourceSession;
      return {
        ...base,
        isEdited: true,
        workout: {
          ...base.workout,
          items: base.workout.items.map((item) =>
            item.id === itemId ? { ...item, ...update } : item,
          ),
        },
      };
    });
  }

  function moveItem(itemId: string, targetIndex: number) {
    const boundedTarget = Math.max(
      0,
      Math.min(targetIndex, shownDraft.workout.items.length - 1),
    );
    const exerciseId = shownDraft.workout.items.find(
      (item) => item.id === itemId,
    )?.exerciseId;

    setDraft((current) => {
      const base = current ?? sourceSession;
      const currentIndex = base.workout.items.findIndex(
        (item) => item.id === itemId,
      );
      if (currentIndex < 0 || currentIndex === boundedTarget) return base;
      const items = [...base.workout.items];
      const [movedItem] = items.splice(currentIndex, 1);
      items.splice(boundedTarget, 0, movedItem);
      return { ...base, isEdited: true, workout: { ...base.workout, items } };
    });

    if (exerciseId) {
      const exerciseName = exerciseById.get(exerciseId)?.name ?? "Exercise";
      setReorderAnnouncement(
        `${exerciseName} moved to position ${boundedTarget + 1}.`,
      );
    }
  }

  function openExerciseLibrary(index: number) {
    setInsertionIndex(index);
    setShowLibrary(true);
  }

  function closeExerciseLibrary() {
    setShowLibrary(false);
    setInsertionIndex(null);
    setQuery("");
  }

  function finishDragging() {
    draggedItemIdRef.current = null;
    setDraggedItemId(null);
    setDragPreview(null);
  }

  function addExercise(exerciseId: string) {
    const exercise = exerciseById.get(exerciseId);
    if (!exercise) return;
    const item: WorkoutItem = {
      id: uniqueItemId(exerciseId),
      exerciseId,
      sets: 2,
      prescription: {
        type: "timed",
        durationSeconds: 30,
        perSide: exercise.laterality === "unilateral",
      },
      restAfterSetSeconds: 20,
      restAfterExerciseSeconds: 20,
    };
    setDraft((current) => {
      const base = current ?? sourceSession;
      if (
        base.workout.items.some(
          (existing) => existing.exerciseId === exerciseId,
        )
      )
        return base;
      const items = [...base.workout.items];
      const targetIndex = Math.max(
        0,
        Math.min(insertionIndex ?? items.length, items.length),
      );
      items.splice(targetIndex, 0, item);
      return {
        ...base,
        isEdited: true,
        workout: {
          ...base.workout,
          id: `custom-${base.id}`,
          slug: `custom-${base.id}`.replace(/[^a-z0-9-]/g, "-"),
          name: base.workout.name.endsWith(" · My edit")
            ? base.workout.name
            : `${base.workout.name} · My edit`,
          items,
        },
      };
    });
    closeExerciseLibrary();
  }

  function saveDraft() {
    const refreshed = refreshPlannedWorkoutDuration(shownDraft);
    const savedDraft =
      refreshed.todayAdaptations.length > 0
        ? refreshed
        : {
            ...refreshed,
            originalSessionSnapshot: {
              workout: refreshed.workout,
              sections: refreshed.sections,
              targetDurationSeconds: refreshed.targetDurationSeconds,
              estimatedDurationSeconds: refreshed.estimatedDurationSeconds,
              durationDeltaSeconds: refreshed.durationDeltaSeconds,
              durationStatus: refreshed.durationStatus,
              adjustments: refreshed.adjustments,
            },
          };
    updatePlan((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id === savedDraft.id ? savedDraft : session,
      ),
    }));
  }

  return (
    <main className="page-shell page-shell--detail page-shell--workout-detail editor-page">
      <Link className="back-link" href="/plan">
        <UiIcon name="arrow-left" /> Training plan
      </Link>
      <section className="detail-hero detail-hero--workout planned-workout-hero">
        <div>
          <div className="tag-row">
            <span className="pill pill--dark">
              {titleCase(shownDraft.workout.difficulty)}
            </span>
            {shownDraft.workout.focus.map((focus) => (
              <span className="pill" key={focus}>
                {titleCase(focus)}
              </span>
            ))}
            <span className="pill">
              {formatPlanDate(shownDraft.scheduledDate)}
            </span>
          </div>
          {isEditing ? (
            <input
              aria-label="Workout name"
              autoFocus
              className="title-input"
              onChange={(event) =>
                setDraft({
                  ...shownDraft,
                  isEdited: true,
                  workout: { ...shownDraft.workout, name: event.target.value },
                })
              }
              value={shownDraft.workout.name}
            />
          ) : (
            <h1>{shownDraft.workout.name}</h1>
          )}
          <p>
            {isEditing
              ? "Changes apply only to this planned session. The original library workout stays untouched."
              : shownDraft.workout.shortDescription}
          </p>
          <div className="planned-workout-hero__actions">
            {!isEditing && (
              <Link
                className="button button--primary planned-workout-hero__start"
                href={
                  resumeHref ??
                  `/plan/workouts/${shownDraft.id}/start?intensity=${intensity}`
                }
                onClick={isResumable ? undefined : saveDraft}
              >
                {isResumable ? "Resume workout" : "Start workout"}
                <UiIcon name="arrow-right" />
              </Link>
            )}
            <button
              className="button button--secondary"
              onClick={() => {
                if (isEditing) {
                  setDraft(null);
                  setIsEditing(false);
                } else {
                  setIsEditing(true);
                }
              }}
              type="button"
            >
              {isEditing ? "Cancel editing" : "Edit workout"}
            </button>
          </div>
        </div>
        <dl className="workout-facts">
          <div>
            <dt>Session time</dt>
            <dd>{shownDurationMinutes} min</dd>
          </div>
          <div>
            <dt>Exercises</dt>
            <dd>{shownDraft.workout.items.length}</dd>
          </div>
          <div>
            <dt>Equipment</dt>
            <dd>
              {formatDumbbellAvailability(
                shownEquipment,
                shownExercises.flatMap(
                  (exercise) => exercise.optionalEquipment ?? [],
                ),
              )}
            </dd>
          </div>
        </dl>
      </section>

      {!isEditing ? (
        <WorkoutConfigurator
          compositionExercises={exercises}
          exercises={shownExercises}
          getStartHref={(level) =>
            resumeHref ??
            `/plan/workouts/${shownDraft.id}/start?intensity=${level}`
          }
          onIntensityChange={setIntensity}
          onStart={isResumable ? undefined : saveDraft}
          reviewExerciseIds={reviewExerciseIds}
          secondaryActions={
            <div className="planned-workout-secondary-actions planned-workout-secondary-actions--review">
              <button
                className="button button--secondary button--full"
                onClick={() => {
                  setReplacementExerciseId(null);
                  setAdaptTodayOpen(true);
                }}
                type="button"
              >
                Adapt today
              </button>
              {shownDraft.todayAdaptations.length > 0 && (
                <button
                  className="text-button"
                  onClick={() => setDraft(resetTodayAdaptations(shownDraft))}
                  type="button"
                >
                  Reset adaptations
                </button>
              )}
              <button
                className="text-button"
                onClick={() => router.push("/plan")}
                type="button"
              >
                Back to plan
              </button>
            </div>
          }
          sections={shownDraft.sections}
          selectedIntensity={intensity}
          startLabel={isResumable ? "Resume workout" : undefined}
          startNotice={`${durationPreferenceMessage} Intervals and rests advance automatically.`}
          workout={shownDraft.workout}
        />
      ) : (
        <div className="detail-layout planned-workout-layout">
          <section aria-labelledby="exercise-list-heading">
            {isEditing && (
              <div className="session-section-overview">
                {refreshedAdaptationSession.sections.map((section) => (
                  <div
                    className={`session-section-card session-section-card--${section.type}`}
                    key={section.type}
                  >
                    <span>
                      {section.type === "warmup"
                        ? "Warm-up"
                        : section.type === "cooldown"
                          ? "Cooldown"
                          : "Workout"}
                    </span>
                    <strong>
                      {formatSessionDurationMinutes(
                        calculateSessionSectionDuration(section),
                      )}{" "}
                      min
                    </strong>
                    <small>{section.items.length} exercises</small>
                    <p>
                      {section.type === "warmup"
                        ? "Prepare for the movements ahead."
                        : section.type === "cooldown"
                          ? "Recover and reset."
                          : "Build your session focus."}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="section-heading section-heading--compact">
              <div>
                <p className="kicker">Your planned session</p>
                <h2 id="exercise-list-heading">Workout plan</h2>
              </div>
              {isEditing ? (
                <button
                  className="button button--secondary button--small"
                  onClick={() =>
                    openExerciseLibrary(shownDraft.workout.items.length)
                  }
                  type="button"
                >
                  <UiIcon name="plus" /> Add exercise
                </button>
              ) : (
                <div className="selected-workout-duration">
                  <span>Timed duration</span>
                  <strong>{shownDurationMinutes} min</strong>
                </div>
              )}
            </div>
            {isEditing ? (
              <p className="reorder-help">
                Drag the grip to reorder. Keyboard users can focus it and press
                the up or down arrow key.
              </p>
            ) : (
              <p className="reorder-help">
                Review the complete session below. Choose Edit workout to change
                order, exercises or timing.
              </p>
            )}
            <p aria-live="polite" className="sr-only">
              {reorderAnnouncement}
            </p>
            <ol className={isEditing ? "editor-exercise-list" : "workout-plan"}>
              {shownDraft.workout.items.map((item, index) => {
                const exercise = exerciseById.get(item.exerciseId);
                if (!exercise) return null;
                return (
                  <li
                    className={
                      isEditing
                        ? `${draggedItemId === item.id ? "is-being-dragged" : ""} is-editable`
                        : undefined
                    }
                    data-sortable-id={item.id}
                    data-sortable-index={index}
                    key={item.id}
                  >
                    <div className="drag-handle-column">
                      {isEditing ? (
                        <button
                          aria-grabbed={draggedItemId === item.id}
                          aria-label={`Reorder ${exercise.name}. Position ${index + 1} of ${shownDraft.workout.items.length}. Use up and down arrow keys, or drag.`}
                          className="drag-handle"
                          onKeyDown={(event) => {
                            if (event.key === "ArrowUp") {
                              event.preventDefault();
                              moveItem(item.id, index - 1);
                            }
                            if (event.key === "ArrowDown") {
                              event.preventDefault();
                              moveItem(item.id, index + 1);
                            }
                          }}
                          onLostPointerCapture={finishDragging}
                          onPointerCancel={finishDragging}
                          onPointerDown={(event) => {
                            if (!event.isPrimary) return;
                            event.preventDefault();
                            const row = event.currentTarget.closest("li");
                            const bounds = row?.getBoundingClientRect();
                            draggedItemIdRef.current = item.id;
                            setDraggedItemId(item.id);
                            if (bounds) {
                              setDragPreview({
                                itemId: item.id,
                                left: bounds.left,
                                top: bounds.top,
                                width: bounds.width,
                                pointerOffsetX: event.clientX - bounds.left,
                                pointerOffsetY: event.clientY - bounds.top,
                              });
                            }
                            event.currentTarget.setPointerCapture(
                              event.pointerId,
                            );
                          }}
                          onPointerMove={(event) => {
                            if (draggedItemIdRef.current !== item.id) return;
                            event.preventDefault();
                            setDragPreview((current) =>
                              current
                                ? {
                                    ...current,
                                    left:
                                      event.clientX - current.pointerOffsetX,
                                    top: event.clientY - current.pointerOffsetY,
                                  }
                                : current,
                            );
                            const list = event.currentTarget.closest("ol");
                            const targets = list
                              ? Array.from(
                                  list.querySelectorAll<HTMLElement>(
                                    "[data-sortable-index]",
                                  ),
                                )
                              : [];
                            const target = targets.find((candidate) => {
                              const bounds = candidate.getBoundingClientRect();
                              return (
                                event.clientY >= bounds.top &&
                                event.clientY <= bounds.bottom
                              );
                            });
                            const targetIndex = Number(
                              target?.dataset.sortableIndex,
                            );
                            if (Number.isInteger(targetIndex)) {
                              moveItem(item.id, targetIndex);
                            }
                          }}
                          onPointerUp={(event) => {
                            if (
                              event.currentTarget.hasPointerCapture(
                                event.pointerId,
                              )
                            ) {
                              event.currentTarget.releasePointerCapture(
                                event.pointerId,
                              );
                            }
                            finishDragging();
                          }}
                          type="button"
                        >
                          <UiIcon name="grip" />
                        </button>
                      ) : null}
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <div
                      className={
                        isEditing ? "editor-exercise-copy" : "plan-copy"
                      }
                    >
                      {reviewExerciseIds.has(item.exerciseId) && (
                        <span className="pain-review-flag">
                          Review before training
                        </span>
                      )}
                      <Link href={`/exercises/${exercise.slug}`}>
                        {exercise.name}
                      </Link>
                      <p>{exercise.shortDescription}</p>
                      {isEditing && (
                        <div className="timing-fields">
                          <label>
                            Sets
                            <input
                              max="10"
                              min="1"
                              onChange={(event) =>
                                updateItem(item.id, {
                                  sets: Number(event.target.value),
                                })
                              }
                              type="number"
                              value={item.sets}
                            />
                          </label>
                          <label>
                            Work <span>sec</span>
                            <input
                              max="600"
                              min="5"
                              onChange={(event) =>
                                updateItem(item.id, {
                                  prescription: {
                                    ...item.prescription,
                                    durationSeconds: Number(event.target.value),
                                  },
                                })
                              }
                              step="5"
                              type="number"
                              value={item.prescription.durationSeconds}
                            />
                          </label>
                          <label>
                            Between sets <span>sec</span>
                            <input
                              max="300"
                              min="0"
                              onChange={(event) =>
                                updateItem(item.id, {
                                  restAfterSetSeconds: Number(
                                    event.target.value,
                                  ),
                                })
                              }
                              step="5"
                              type="number"
                              value={item.restAfterSetSeconds ?? 0}
                            />
                          </label>
                          <label>
                            After exercise <span>sec</span>
                            <input
                              max="300"
                              min="0"
                              onChange={(event) =>
                                updateItem(item.id, {
                                  restAfterExerciseSeconds: Number(
                                    event.target.value,
                                  ),
                                })
                              }
                              step="5"
                              type="number"
                              value={item.restAfterExerciseSeconds ?? 0}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                    {!isEditing && (
                      <dl className="plan-timing planned-workout-timing">
                        <div className="plan-timing-value">
                          <dt>Sets</dt>
                          <dd>{item.sets}</dd>
                        </div>
                        <div className="plan-timing-value">
                          <dt>Work</dt>
                          <dd>{item.prescription.durationSeconds}s</dd>
                        </div>
                        <div className="plan-timing-value">
                          <dt>Between sets</dt>
                          <dd>{item.restAfterSetSeconds ?? 0}s</dd>
                        </div>
                        <div className="plan-timing-value">
                          <dt>After exercise</dt>
                          <dd>{item.restAfterExerciseSeconds ?? 0}s</dd>
                        </div>
                      </dl>
                    )}
                    {isEditing && (
                      <div className="exercise-edit-actions">
                        <button
                          aria-label={`Replace ${exercise.name}`}
                          className="replace-exercise"
                          onClick={() => {
                            setReplacementExerciseId(exercise.id);
                            setAdaptTodayOpen(true);
                          }}
                          type="button"
                        >
                          Replace
                        </button>
                        <button
                          aria-label={`Remove ${exercise.name}`}
                          className="remove-exercise"
                          disabled={shownDraft.workout.items.length === 1}
                          onClick={() =>
                            setDraft({
                              ...shownDraft,
                              isEdited: true,
                              workout: {
                                ...shownDraft.workout,
                                items: shownDraft.workout.items.filter(
                                  (candidate) => candidate.id !== item.id,
                                ),
                              },
                            })
                          }
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {isEditing &&
                      index < shownDraft.workout.items.length - 1 && (
                        <button
                          aria-label={`Add exercise after ${exercise.name}`}
                          className="insert-exercise"
                          onClick={() => openExerciseLibrary(index + 1)}
                          type="button"
                        >
                          <UiIcon name="plus" />
                        </button>
                      )}
                  </li>
                );
              })}
            </ol>
            {dragPreview &&
              createPortal(
                (() => {
                  const previewIndex = shownDraft.workout.items.findIndex(
                    (item) => item.id === dragPreview.itemId,
                  );
                  const previewItem = shownDraft.workout.items[previewIndex];
                  const previewExercise = previewItem
                    ? exerciseById.get(previewItem.exerciseId)
                    : undefined;
                  if (!previewItem || !previewExercise) return null;

                  return (
                    <div
                      aria-hidden="true"
                      className="exercise-drag-preview"
                      style={{
                        left: dragPreview.left,
                        top: dragPreview.top,
                        width: dragPreview.width,
                      }}
                    >
                      <div className="exercise-drag-preview__grip">
                        <span>
                          <UiIcon name="grip" />
                        </span>
                        <small>
                          {String(previewIndex + 1).padStart(2, "0")}
                        </small>
                      </div>
                      <div className="exercise-drag-preview__copy">
                        <strong>{previewExercise.name}</strong>
                        <span>{previewExercise.shortDescription}</span>
                        <div className="exercise-drag-preview__timing">
                          <span>{previewItem.sets} sets</span>
                          <span>
                            {previewItem.prescription.durationSeconds}s work
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })(),
                document.body,
              )}
          </section>

          <aside
            className="start-panel"
            aria-labelledby="planned-ready-heading"
          >
            <p className="kicker">Choose your effort</p>
            <h2 id="planned-ready-heading">Train at your level.</h2>
            <p>
              Select an effort for this planned workout. Your custom timings are
              the standard baseline.
            </p>
            <div className="effort-options" aria-label="Workout effort">
              {intensityLevels.map((level) => {
                const preset = intensityPresets[level];
                const selected = intensity === level;
                return (
                  <button
                    aria-pressed={selected}
                    className={`effort-option${selected ? " effort-option--selected" : ""}`}
                    onClick={() => setIntensity(level)}
                    type="button"
                    key={level}
                  >
                    <span>
                      <strong>{preset.label}</strong>
                      {selected ? (
                        <small>Selected</small>
                      ) : (
                        level === "standard" && <small>Recommended</small>
                      )}
                    </span>
                    <p>{preset.description}</p>
                    <span aria-hidden="true">
                      {selected && <UiIcon name="check" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <Link
              className="button button--primary button--full start-workout-button"
              href={
                resumeHref ??
                `/plan/workouts/${shownDraft.id}/start?intensity=${intensity}`
              }
              onClick={isResumable ? undefined : saveDraft}
            >
              {isResumable
                ? "Resume workout"
                : `Start workout · ${intensityPresets[intensity].label}`}
            </Link>
            <small>
              {durationPreferenceMessage} Intervals and rests advance
              automatically.
            </small>
            <div className="planned-workout-secondary-actions">
              <button
                className="button button--secondary button--full"
                onClick={() => {
                  setReplacementExerciseId(null);
                  setAdaptTodayOpen(true);
                }}
                type="button"
              >
                Adapt today
              </button>
              {shownDraft.todayAdaptations.length > 0 && (
                <button
                  className="text-button"
                  onClick={() => setDraft(resetTodayAdaptations(shownDraft))}
                  type="button"
                >
                  Reset adaptations
                </button>
              )}
              {isEditing ? (
                <button
                  className="button button--dark button--full"
                  onClick={() => {
                    saveDraft();
                    setIsEditing(false);
                  }}
                  type="button"
                >
                  Save changes
                </button>
              ) : (
                <button
                  className="text-button"
                  onClick={() => router.push("/plan")}
                  type="button"
                >
                  Back to plan
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {showLibrary && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={closeExerciseLibrary}
        >
          <section
            aria-labelledby="library-dialog-heading"
            aria-modal="true"
            className="exercise-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="dialog-heading">
              <div>
                <p className="kicker">Exercise library</p>
                <h2 id="library-dialog-heading">
                  Add exercise · Position {(insertionIndex ?? 0) + 1}
                </h2>
              </div>
              <button
                aria-label="Close exercise library"
                onClick={closeExerciseLibrary}
                type="button"
              >
                <UiIcon name="close" />
              </button>
            </div>
            <label className="search-field">
              <span className="sr-only">Search exercises</span>
              <input
                autoFocus
                className="plan-input"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search movement or body area"
                value={query}
              />
            </label>
            {filteredExercises.length === 0 && (
              <p role="status">
                No new exercises match. To repeat an exercise already in this
                workout, increase its sets.
              </p>
            )}
            <div className="exercise-picker-list">
              {filteredExercises.slice(0, 30).map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => addExercise(exercise.id)}
                  type="button"
                >
                  <span>
                    <strong>{exercise.name}</strong>
                    <small>{exercise.shortDescription}</small>
                  </span>
                  <UiIcon name="plus" />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {adaptTodayOpen && (
        <AdaptTodayDialog
          key={`${adaptationSession.id}-${replacementExerciseId ?? "menu"}`}
          exerciseCatalog={exercises}
          initialExerciseId={replacementExerciseId}
          onClose={() => {
            setAdaptTodayOpen(false);
            setReplacementExerciseId(null);
          }}
          onUse={(adaptations) => {
            setDraft(
              applyTodayAdaptationsToSession(
                adaptationSession,
                adaptations,
                exercises,
              ),
            );
            setAdaptTodayOpen(false);
            setReplacementExerciseId(null);
          }}
          open={adaptTodayOpen}
          session={adaptationSession}
        />
      )}
    </main>
  );
}
