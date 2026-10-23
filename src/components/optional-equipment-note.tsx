import type { Exercise } from "@/domain/exercise/exercise.types";

export function OptionalEquipmentNote({ exercise }: { exercise: Exercise }) {
  if (!exercise.optionalEquipment?.length) return null;
  return (
    <p className="optional-equipment-note" role="note">
      <strong>Dumbbells optional.</strong> You can do this exercise without
      weights.
    </p>
  );
}
