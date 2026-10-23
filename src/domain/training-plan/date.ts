import type { AthleteProfile } from "./training-plan.types";

const weekdayIndex: Record<AthleteProfile["preferredDays"][number], number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function addDays(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function preferredDayIndexes(profile: AthleteProfile): number[] {
  return profile.preferredDays.map((day) => weekdayIndex[day]);
}

export function formatPlanDate(
  key: string,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(
    "en",
    options ?? {
      weekday: "short",
      month: "short",
      day: "numeric",
    },
  ).format(fromDateKey(key));
}
