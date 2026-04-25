import { z } from "zod";

export const createExerciseSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  measureType: z.enum(["reps", "duration"]).default("reps"),
  muscles: z
    .array(
      z.object({
        muscleId: z.string().min(1, "muscleId requerido"),
        percentage: z.number().positive("percentage debe ser mayor a 0"),
      })
    )
    .optional()
    .default([]),
});