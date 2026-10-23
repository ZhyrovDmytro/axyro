"use client";
import { FREE_WORKOUT_ID } from "@/domain/access/entitlements";
import { ProGate } from "./pro-gate";
export function WorkoutAccess({
  children,
  workoutId,
  returnTo,
}: {
  children: React.ReactNode;
  workoutId: string;
  returnTo: string;
}) {
  return workoutId === FREE_WORKOUT_ID ? (
    children
  ) : (
    <ProGate embedded context="workout" returnTo={returnTo}>
      {children}
    </ProGate>
  );
}
