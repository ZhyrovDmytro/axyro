import { sportSchema } from "@/domain/sport/sport-exercise-profile.schema";
import type { Sport } from "@/domain/sport/sport-exercise-profile.types";

export type SportDefinition = {
  id: Sport;
  name: string;
};

export const sports: SportDefinition[] = [
  { id: sportSchema.parse("padel"), name: "Padel" },
];
