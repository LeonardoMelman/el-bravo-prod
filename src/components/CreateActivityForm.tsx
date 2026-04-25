"use client";

import React, { useEffect, useMemo, useState } from "react";

type ExerciseMeasureType = "reps" | "duration";

type AvailableExercise = {
  id: string;
  name: string;
  measureType: ExerciseMeasureType;
  muscles?: {
    exerciseId?: string;
    muscleId?: string;
    percentage: number;
    muscle: {
      id: string;
      name: string;
      slug?: string;
      groupKey?: string;
    };
  }[];
};

type Muscle = {
  id: string;
  name: string;
  slug?: string;
  groupKey?: string;
};

type ActivityCategory = {
  id: string;
  slug: string;
  name: string;
};

type RoutineExercise = {
  id?: string;
  exerciseId: string;
  name: string;
  measureType: ExerciseMeasureType;
  sets: number;
  reps?: number | null;
  durationSeconds?: number | null;
  weightKg?: number | null;
};

type RoutineItem = {
  id: string;
  name: string;
  exercises: RoutineExercise[];
};

type ActivityExerciseFormItem = {
  exerciseId: string;
  measureType: ExerciseMeasureType;
  sets: number;
  reps: string;
  durationSeconds: string;
  weightKg: string;
  newExerciseName?: string;
  newExerciseMuscles?: {
    muscleId: string;
    percentage: number;
  }[];
};

function twoDigits(n: number) {
  return String(n).padStart(2, "0");
}

function getDefaultDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultStartTime() {
  const now = new Date();
  return `${twoDigits(now.getHours())}:${twoDigits(now.getMinutes())}`;
}

function buildDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function getExerciseMeasureType(
  exerciseId: string,
  availableExercises: AvailableExercise[]
): ExerciseMeasureType {
  return (
    availableExercises.find((exercise) => exercise.id === exerciseId)?.measureType ??
    "reps"
  );
}

export default function CreateActivityForm() {
  const [availableExercises, setAvailableExercises] = useState<AvailableExercise[]>([]);
  const [availableMuscles, setAvailableMuscles] = useState<Muscle[]>([]);
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const [openSearchIndex, setOpenSearchIndex] = useState<number | null>(null);
  const [isCreatingNewExercise, setIsCreatingNewExercise] = useState<Record<number, boolean>>({});
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [activityCategories, setActivityCategories] = useState<ActivityCategory[]>([]);

  const [activityCategoryId, setActivityCategoryId] = useState("");
  const [date, setDate] = useState(getDefaultDate());
  const [startTime, setStartTime] = useState(getDefaultStartTime());
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [selectedRoutineId, setSelectedRoutineId] = useState("");
  const [notes, setNotes] = useState("");

  const [exercises, setExercises] = useState<ActivityExerciseFormItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [updatingRoutine, setUpdatingRoutine] = useState(false);
  const [error, setError] = useState("");
  const [updateRoutineMessage, setUpdateRoutineMessage] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);
        setError("");

        const [exerciseRes, routineRes, categoryRes, muscleRes] = await Promise.all([
          fetch("/api/exercise/list", { cache: "no-store" }),
          fetch("/api/routine/list", { cache: "no-store" }),
          fetch("/api/activity-types/list", { cache: "no-store" }),
          fetch("/api/muscle/list", { cache: "no-store" }),
        ]);

        const exerciseData = await exerciseRes.json().catch(() => ({}));
        const routineData = await routineRes.json().catch(() => ({}));
        const categoryData = await categoryRes.json().catch(() => ({}));
        const muscleData = await muscleRes.json().catch(() => ({}));

        if (!exerciseRes.ok) {
          throw new Error(exerciseData?.error || "No se pudieron cargar los ejercicios.");
        }

        if (!routineRes.ok) {
          throw new Error(routineData?.error || "No se pudieron cargar las rutinas.");
        }

        if (!categoryRes.ok) {
          throw new Error(categoryData?.error || "No se pudieron cargar los tipos.");
        }

        if (!muscleRes.ok) {
          throw new Error(muscleData?.error || "No se pudieron cargar los músculos.");
        }

        const loadedExercises = Array.isArray(exerciseData)
          ? exerciseData
          : Array.isArray(exerciseData?.exercises)
          ? exerciseData.exercises
          : [];

        const loadedRoutines = Array.isArray(routineData)
          ? routineData
          : Array.isArray(routineData?.routines)
          ? routineData.routines
          : [];

        const loadedCategories = Array.isArray(categoryData) ? categoryData : [];
        const loadedMuscles = Array.isArray(muscleData)
          ? muscleData
          : Array.isArray(muscleData?.muscles)
          ? muscleData.muscles
          : [];

        setAvailableExercises(loadedExercises);
        setAvailableMuscles(loadedMuscles);
        setRoutines(loadedRoutines);
        setActivityCategories(loadedCategories);

        if (loadedCategories.length > 0) {
          setActivityCategoryId((prev) => prev || loadedCategories[0].id);
        }
      } catch (err: any) {
        console.error("Error cargando datos de actividades:", err);
        setError(err?.message || "Error cargando ejercicios, rutinas y tipos.");
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, []);

  const selectedRoutine = useMemo(
    () => routines.find((routine) => routine.id === selectedRoutineId) ?? null,
    [routines, selectedRoutineId]
  );

  const hasSelectedRoutine = !!selectedRoutineId && !!selectedRoutine;

  const selectedActivityCategory = useMemo(
    () =>
      activityCategories.find((category) => category.id === activityCategoryId) ?? null,
    [activityCategories, activityCategoryId]
  );

  const isStrengthActivity =
    selectedActivityCategory?.slug === "strength" ||
    selectedActivityCategory?.name?.toLowerCase() === "fuerza";

  useEffect(() => {
    if (!isStrengthActivity) {
      setSelectedRoutineId("");
      setExercises([]);
      setUpdateRoutineMessage("");
      setSearchTerms({});
      setOpenSearchIndex(null);
      setIsCreatingNewExercise({});
    }
  }, [isStrengthActivity]);

  function applyRoutine(routineId: string) {
    setSelectedRoutineId(routineId);
    setError("");
    setUpdateRoutineMessage("");

    const routine = routines.find((item) => item.id === routineId);

    if (!routine) {
      setExercises([]);
      return;
    }

    const mapped = routine.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      measureType: exercise.measureType ?? "reps",
      sets: Number(exercise.sets ?? 3),
      reps:
        exercise.reps !== null && exercise.reps !== undefined
          ? String(exercise.reps)
          : "",
      durationSeconds:
        exercise.durationSeconds !== null && exercise.durationSeconds !== undefined
          ? String(exercise.durationSeconds)
          : "",
      weightKg:
        exercise.weightKg !== null && exercise.weightKg !== undefined
          ? String(exercise.weightKg)
          : "",
      newExerciseName: "",
      newExerciseMuscles: [],
    }));

    setExercises(mapped);
  }

  function addExercise() {
    setError("");
    setUpdateRoutineMessage("");
    setExercises((prev) => [
      ...prev,
      {
        exerciseId: "",
        measureType: "reps",
        sets: 3,
        reps: "10",
        durationSeconds: "",
        weightKg: "",
        newExerciseName: "",
        newExerciseMuscles: [],
      },
    ]);
  }

  function updateExercise(index: number, patch: Partial<ActivityExerciseFormItem>) {
    setError("");
    setUpdateRoutineMessage("");
    setExercises((prev) =>
      prev.map((exercise, i) => (i === index ? { ...exercise, ...patch } : exercise))
    );
  }

  function handleExerciseChange(index: number, exerciseId: string) {
    const measureType = getExerciseMeasureType(exerciseId, availableExercises);

    updateExercise(index, {
      exerciseId,
      measureType,
      reps: measureType === "reps" ? "10" : "",
      durationSeconds: measureType === "duration" ? "30" : "",
    });
  }

  function removeExercise(index: number) {
    setError("");
    setUpdateRoutineMessage("");
    setExercises((prev) => prev.filter((_, i) => i !== index));
    setSearchTerms((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setIsCreatingNewExercise((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    if (openSearchIndex === index) {
      setOpenSearchIndex(null);
    }
  }

  function getExerciseName(exerciseId?: string) {
    if (!exerciseId || exerciseId === "__new") return "";
    return availableExercises.find((exercise) => exercise.id === exerciseId)?.name ?? "";
  }

  function getFilteredExercises(index: number) {
    const term = (searchTerms[index] ?? "").toLowerCase().trim();

    if (!term) return availableExercises.slice(0, 8);

    return availableExercises
      .filter((exercise) => exercise.name.toLowerCase().includes(term))
      .slice(0, 8);
  }

  function formatGroupLabel(groupKey?: string) {
    switch (groupKey) {
      case "legs":
        return "Piernas";
      case "core":
        return "Core";
      case "chest":
        return "Pecho";
      case "back":
        return "Espalda";
      case "arms":
        return "Brazos";
      case "shoulders":
        return "Hombros";
      case "glutes":
        return "Glúteos";
      default:
        return groupKey || "Otros";
    }
  }

  function getTotalMusclePercentage(
    muscles: { muscleId: string; percentage: number }[] | undefined
  ) {
    return (muscles ?? []).reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);
  }

  function addNewExerciseMuscle(index: number) {
    const current = exercises[index]?.newExerciseMuscles ?? [];
    const total = getTotalMusclePercentage(current);

    if (total >= 100) return;

    setExercises((prev) =>
      prev.map((exercise, i) =>
        i === index
          ? {
              ...exercise,
              newExerciseMuscles: [
                ...(exercise.newExerciseMuscles ?? []),
                { muscleId: "", percentage: 0 },
              ],
            }
          : exercise
      )
    );
  }

  function updateNewExerciseMuscle(
    exerciseIndex: number,
    muscleIndex: number,
    field: "muscleId" | "percentage",
    value: string | number
  ) {
    setExercises((prev) =>
      prev.map((exercise, i) => {
        if (i !== exerciseIndex) return exercise;

        const nextMuscles = [...(exercise.newExerciseMuscles ?? [])];
        const current = nextMuscles[muscleIndex];

        if (!current) return exercise;

        if (field === "percentage") {
          const numericValue = Number(value) || 0;
          const otherTotal = nextMuscles.reduce((sum, item, idx) => {
            if (idx === muscleIndex) return sum;
            return sum + (Number(item.percentage) || 0);
          }, 0);

          nextMuscles[muscleIndex] = {
            ...current,
            percentage: Math.max(0, Math.min(100 - otherTotal, numericValue)),
          };
        } else {
          nextMuscles[muscleIndex] = {
            ...current,
            muscleId: String(value),
          };
        }

        return {
          ...exercise,
          newExerciseMuscles: nextMuscles,
        };
      })
    );
  }

  function removeNewExerciseMuscle(exerciseIndex: number, muscleIndex: number) {
    setExercises((prev) =>
      prev.map((exercise, i) =>
        i === exerciseIndex
          ? {
              ...exercise,
              newExerciseMuscles: (exercise.newExerciseMuscles ?? []).filter(
                (_, idx) => idx !== muscleIndex
              ),
            }
          : exercise
      )
    );
  }

  function validateNewExerciseMuscles(
    newExerciseMuscles: { muscleId: string; percentage: number }[]
  ) {
    if (newExerciseMuscles.length === 0) {
      return "Tenés que definir al menos un músculo para el nuevo ejercicio.";
    }

    const usedMuscles = new Set<string>();
    let total = 0;

    for (const item of newExerciseMuscles) {
      if (!item.muscleId) {
        return "Todos los músculos del nuevo ejercicio deben estar seleccionados.";
      }

      if (usedMuscles.has(item.muscleId)) {
        return "No podés repetir el mismo músculo en el nuevo ejercicio.";
      }

      usedMuscles.add(item.muscleId);

      if (!Number.isFinite(item.percentage) || item.percentage <= 0) {
        return "Todos los porcentajes del nuevo ejercicio deben ser mayores a 0.";
      }

      total += item.percentage;
    }

    if (total !== 100) {
      return "Los porcentajes del nuevo ejercicio deben sumar exactamente 100.";
    }

    return null;
  }

  async function createNewExercisesIfNeeded(items: ActivityExerciseFormItem[]) {
    const finalExercises = [...items];

    for (let i = 0; i < finalExercises.length; i++) {
      const current = finalExercises[i];

      if (!current.exerciseId && !current.newExerciseName?.trim()) {
        setError("Cada bloque debe tener un ejercicio seleccionado o creado.");
        return null;
      }

      if (
        current.exerciseId === "__new" ||
        (!current.exerciseId && current.newExerciseName)
      ) {
        const newName = current.newExerciseName?.trim();

        if (!newName) {
          setError("El nombre del nuevo ejercicio es requerido.");
          return null;
        }

        const newExerciseMuscles = current.newExerciseMuscles ?? [];
        const muscleValidationError = validateNewExerciseMuscles(newExerciseMuscles);

        if (muscleValidationError) {
          setError(muscleValidationError);
          return null;
        }

        const res = await fetch("/api/exercise/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName,
            muscles: newExerciseMuscles,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(data?.error || "Error creando ejercicio");
          return null;
        }

        const createdExercise: AvailableExercise = {
          id: data.id,
          name: data.name ?? newName,
          measureType: "reps",
          muscles: Array.isArray(data.muscles) ? data.muscles : [],
        };

        setAvailableExercises((prev) => {
          if (prev.some((exercise) => exercise.id === createdExercise.id)) return prev;
          return [...prev, createdExercise];
        });

        finalExercises[i] = {
          ...current,
          exerciseId: data.id,
          measureType: "reps",
          newExerciseName: "",
          newExerciseMuscles: [],
        };
      }
    }

    setExercises(finalExercises);

    return finalExercises;
  }

  function validateExercisesForSave(items = exercises) {
    for (const exercise of items) {
      if (!exercise.exerciseId) {
        return "Todos los ejercicios deben estar seleccionados.";
      }

      if (!exercise.sets || exercise.sets <= 0) {
        return "Todas las series deben ser mayores a 0.";
      }

      if (exercise.measureType === "reps") {
        if (!exercise.reps || Number(exercise.reps) <= 0) {
          return "Todos los ejercicios por repeticiones deben tener reps mayores a 0.";
        }
      }

      if (exercise.measureType === "duration") {
        if (!exercise.durationSeconds || Number(exercise.durationSeconds) <= 0) {
          return "Todos los ejercicios por tiempo deben tener una duración mayor a 0.";
        }
      }

      if (
        exercise.weightKg.trim() !== "" &&
        (!Number.isFinite(Number(exercise.weightKg)) || Number(exercise.weightKg) < 0)
      ) {
        return "El peso debe ser un número válido mayor o igual a 0.";
      }
    }

    return null;
  }

  function normalizeExercisesPayload(items = exercises) {
    return items.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      sets: Number(exercise.sets),
      reps:
        exercise.measureType === "reps" && exercise.reps.trim() !== ""
          ? Number(exercise.reps)
          : null,
      durationSeconds:
        exercise.measureType === "duration" && exercise.durationSeconds.trim() !== ""
          ? Number(exercise.durationSeconds)
          : null,
      weightKg: exercise.weightKg.trim() === "" ? null : Number(exercise.weightKg),
    }));
  }

  async function handleUpdateRoutine() {
    setError("");
    setUpdateRoutineMessage("");

    if (!selectedRoutine) return;

    setUpdatingRoutine(true);

    const finalExercises = await createNewExercisesIfNeeded(exercises);

    if (!finalExercises) {
      setUpdatingRoutine(false);
      return;
    }

    const validationError = validateExercisesForSave(finalExercises);
    if (validationError) {
      setUpdateRoutineMessage(validationError);
      setUpdatingRoutine(false);
      return;
    }

    const normalizedExercises = normalizeExercisesPayload(finalExercises);

    try {
      const res = await fetch(`/api/routine/${selectedRoutine.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: selectedRoutine.name,
          exercises: normalizedExercises,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setUpdateRoutineMessage(data?.error || "No se pudo actualizar la rutina.");
        return;
      }

      setRoutines((prev) =>
        prev.map((routine) =>
          routine.id === selectedRoutine.id
            ? {
                ...routine,
                exercises: normalizedExercises.map((exercise) => {
                  const available = availableExercises.find(
                    (item) => item.id === exercise.exerciseId
                  );

                  return {
                    exerciseId: exercise.exerciseId,
                    name: available?.name ?? "",
                    measureType: available?.measureType ?? "reps",
                    sets: exercise.sets,
                    reps: exercise.reps,
                    durationSeconds: exercise.durationSeconds,
                    weightKg: exercise.weightKg,
                  };
                }),
              }
            : routine
        )
      );

      setUpdateRoutineMessage(`Rutina "${selectedRoutine.name}" actualizada correctamente.`);
    } catch (err) {
      console.error("Error actualizando rutina:", err);
      setUpdateRoutineMessage("Ocurrió un error de red al actualizar la rutina.");
    } finally {
      setUpdatingRoutine(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (!activityCategoryId) {
      setError("Seleccioná un tipo de actividad.");
      return;
    }

    if (!date || !startTime) {
      setError("Completá la fecha y la hora de inicio.");
      return;
    }

    const duration = Number(durationMinutes);

    if (!Number.isFinite(duration) || duration <= 0) {
      setError("La duración debe ser mayor a 0 minutos.");
      return;
    }

    let finalExercises: ActivityExerciseFormItem[] = [];

    if (isStrengthActivity) {
      const createdExercises = await createNewExercisesIfNeeded(exercises);

      if (!createdExercises) {
        return;
      }

      const validationError = validateExercisesForSave(createdExercises);
      if (validationError) {
        setError(validationError);
        return;
      }

      finalExercises = createdExercises;
    }

    const startedAt = buildDateTime(date, startTime);

    if (Number.isNaN(startedAt.getTime())) {
      setError("La fecha u hora de inicio no son válidas.");
      return;
    }

    const endedAt = new Date(startedAt.getTime() + duration * 60 * 1000);

    setSaving(true);

    try {
      const payload = {
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        activityCategoryId,
        notes: notes.trim() || null,
        routineId: isStrengthActivity ? selectedRoutineId || null : null,
        exercises: isStrengthActivity ? normalizeExercisesPayload(finalExercises) : [],
      };

      const res = await fetch("/api/activities/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "No se pudo crear la actividad.");
        return;
      }

      window.history.back();
    } catch (err) {
      console.error("Error creando actividad:", err);
      setError("Ocurrió un error de red al guardar la actividad.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-slate-900/60 p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Cargar actividad</h1>
        <p className="mt-2 text-sm text-slate-400">
          Registrá tu entrenamiento de forma simple, con rutina, ejercicios y peso.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={`grid grid-cols-1 gap-4 ${isStrengthActivity ? "md:grid-cols-2" : ""}`}>
          <div className="rounded-xl bg-slate-800 p-4">
            <label className="mb-2 block text-sm font-semibold text-slate-200">
              Tipo de actividad
            </label>
            <select
              value={activityCategoryId}
              onChange={(e) => setActivityCategoryId(e.target.value)}
              className="w-full rounded-lg bg-slate-700 px-3 py-3 text-white outline-none"
            >
              <option value="">Seleccionar tipo</option>
              {activityCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {isStrengthActivity ? (
            <div className="rounded-xl bg-slate-800 p-4">
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Rutina
              </label>
              <select
                value={selectedRoutineId}
                onChange={(e) => applyRoutine(e.target.value)}
                className="w-full rounded-lg bg-slate-700 px-3 py-3 text-white outline-none"
              >
                <option value="">-- Ninguna --</option>
                {routines.map((routine) => (
                  <option key={routine.id} value={routine.id}>
                    {routine.name}
                  </option>
                ))}
              </select>

              {selectedRoutine ? (
                <p className="mt-2 text-xs text-slate-400">
                  Se cargaron automáticamente {selectedRoutine.exercises.length} ejercicios.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-slate-800 p-4">
            <label className="mb-2 block text-sm font-semibold text-slate-200">
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg bg-slate-700 px-3 py-3 text-white outline-none"
            />
          </div>

          <div className="rounded-xl bg-slate-800 p-4">
            <label className="mb-2 block text-sm font-semibold text-slate-200">
              Hora de inicio
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg bg-slate-700 px-3 py-3 text-white outline-none"
            />
          </div>

          <div className="rounded-xl bg-slate-800 p-4">
            <label className="mb-2 block text-sm font-semibold text-slate-200">
              Duración (minutos)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full rounded-lg bg-slate-700 px-3 py-3 text-white outline-none"
              placeholder="Ej: 90"
            />
          </div>
        </div>

        <div className="rounded-xl bg-slate-800 p-4">
          <label className="mb-2 block text-sm font-semibold text-slate-200">
            Notas
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg bg-slate-700 px-3 py-3 text-white outline-none"
            placeholder="Cómo te sentiste, observaciones, etc."
          />
        </div>

        {isStrengthActivity ? (
          <div className="rounded-xl bg-slate-800 p-4">
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white">Ejercicios</h2>
                <p className="text-sm text-slate-400">
                  Agregá ejercicios, series y reps o tiempo según corresponda.
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px]">
                {hasSelectedRoutine ? (
                  <button
                    type="button"
                    onClick={handleUpdateRoutine}
                    disabled={updatingRoutine || saving || loadingData}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-b from-amber-400 to-orange-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:from-amber-300 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingRoutine ? "Actualizando..." : "Actualizar rutina"}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={addExercise}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-slate-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-500"
                >
                  + Agregar ejercicio
                </button>
              </div>
            </div>

            {updateRoutineMessage ? (
              <div
                className={`mb-4 rounded-lg px-4 py-3 text-sm ${
                  updateRoutineMessage.includes("correctamente")
                    ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border border-amber-500/40 bg-amber-500/10 text-amber-300"
                }`}
              >
                {updateRoutineMessage}
              </div>
            ) : null}

            {loadingData ? (
              <div className="rounded-lg bg-slate-900 px-4 py-4 text-sm text-slate-400">
                Cargando ejercicios y rutinas...
              </div>
            ) : exercises.length === 0 ? (
              <div className="rounded-lg bg-slate-900 px-4 py-4 text-sm text-slate-400">
                Todavía no agregaste ejercicios.
              </div>
            ) : (
              <div className="space-y-4">
                {exercises.map((exercise, index) => (
                  <div
                    key={`${exercise.exerciseId}-${index}`}
                    className="rounded-xl bg-slate-900 p-4"
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                      <div>
                        {(() => {
                          const selectedExerciseName = getExerciseName(exercise.exerciseId);
                          const filteredExercises = getFilteredExercises(index);
                          const isCreating = isCreatingNewExercise[index];
                          const newExerciseMuscles = exercise.newExerciseMuscles ?? [];
                          const muscleTotal = getTotalMusclePercentage(newExerciseMuscles);

                          return (
                            <div className="space-y-2">
                              <label className="mb-2 block text-sm font-semibold text-slate-200">
                                Ejercicio
                              </label>

                              {!isCreating ? (
                                <>
                                  {exercise.exerciseId && openSearchIndex !== index ? (
                                    <div className="rounded-lg bg-slate-700 px-3 py-3">
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-white">{selectedExerciseName}</span>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenSearchIndex(index);
                                            setSearchTerms((prev) => ({ ...prev, [index]: "" }));
                                          }}
                                          className="text-sm font-semibold text-lime-400 hover:text-lime-300"
                                        >
                                          Cambiar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <input
                                        value={searchTerms[index] ?? ""}
                                        onChange={(e) => {
                                          setSearchTerms((prev) => ({
                                            ...prev,
                                            [index]: e.target.value,
                                          }));
                                          setOpenSearchIndex(index);
                                          updateExercise(index, { exerciseId: "" });
                                        }}
                                        onFocus={() => setOpenSearchIndex(index)}
                                        placeholder="Buscar ejercicio..."
                                        className="w-full rounded-lg bg-slate-700 px-3 py-3 text-white outline-none placeholder:text-slate-400"
                                      />

                                      {openSearchIndex === index ? (
                                        <div className="max-h-48 overflow-y-auto rounded-lg bg-slate-900">
                                          {filteredExercises.length > 0 ? (
                                            filteredExercises.map((availableExercise) => (
                                              <button
                                                key={availableExercise.id}
                                                type="button"
                                                onClick={() => {
                                                  handleExerciseChange(index, availableExercise.id);
                                                  updateExercise(index, {
                                                    newExerciseName: "",
                                                    newExerciseMuscles: [],
                                                  });
                                                  setSearchTerms((prev) => {
                                                    const next = { ...prev };
                                                    delete next[index];
                                                    return next;
                                                  });
                                                  setOpenSearchIndex(null);
                                                }}
                                                className="block w-full px-3 py-2 text-left text-slate-100 hover:bg-slate-700"
                                              >
                                                {availableExercise.name}
                                              </button>
                                            ))
                                          ) : (
                                            <div className="px-3 py-2 text-sm text-slate-400">
                                              No hay coincidencias.
                                            </div>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setIsCreatingNewExercise((prev) => ({
                                                ...prev,
                                                [index]: true,
                                              }));
                                              updateExercise(index, {
                                                exerciseId: "__new",
                                                measureType: "reps",
                                                reps: "10",
                                                durationSeconds: "",
                                                newExerciseName: searchTerms[index] ?? "",
                                                newExerciseMuscles: [],
                                              });
                                              setOpenSearchIndex(null);
                                            }}
                                            className="block w-full px-3 py-2 text-left text-lime-400 hover:bg-slate-700"
                                          >
                                            + Crear nuevo ejercicio
                                          </button>
                                        </div>
                                      ) : null}
                                    </>
                                  )}
                                </>
                              ) : (
                                <div className="space-y-3">
                                  <input
                                    value={exercise.newExerciseName ?? ""}
                                    onChange={(e) =>
                                      updateExercise(index, { newExerciseName: e.target.value })
                                    }
                                    placeholder="Nombre del nuevo ejercicio"
                                    className="w-full rounded-lg bg-slate-700 px-3 py-3 text-white outline-none placeholder:text-slate-400"
                                  />

                                  <div className="rounded-xl bg-slate-900 p-3">
                                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                      <div>
                                        <div className="text-sm font-medium text-slate-200">
                                          Músculos trabajados
                                        </div>
                                        <div className="text-xs text-slate-400">
                                          Total actual: {muscleTotal} / 100
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => addNewExerciseMuscle(index)}
                                        disabled={muscleTotal >= 100}
                                        className="rounded-md bg-slate-600 px-3 py-2 text-xs font-medium text-white hover:bg-slate-500 disabled:opacity-50"
                                      >
                                        + Agregar músculo
                                      </button>
                                    </div>

                                    {newExerciseMuscles.length === 0 ? (
                                      <div className="text-sm text-slate-400">
                                        Agregá al menos un músculo y su porcentaje.
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        {newExerciseMuscles.map((item, muscleIndex) => (
                                          <div
                                            key={`${index}-${muscleIndex}`}
                                            className="grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_120px_90px]"
                                          >
                                            <select
                                              value={item.muscleId}
                                              onChange={(e) =>
                                                updateNewExerciseMuscle(
                                                  index,
                                                  muscleIndex,
                                                  "muscleId",
                                                  e.target.value
                                                )
                                              }
                                              className="rounded-lg bg-slate-800 px-3 py-2 text-white outline-none"
                                            >
                                              <option value="">Seleccionar músculo</option>
                                              {availableMuscles.map((muscle) => (
                                                <option key={muscle.id} value={muscle.id}>
                                                  {muscle.name} ({formatGroupLabel(muscle.groupKey)})
                                                </option>
                                              ))}
                                            </select>

                                            <input
                                              type="number"
                                              min={1}
                                              max={100}
                                              value={item.percentage}
                                              onChange={(e) =>
                                                updateNewExerciseMuscle(
                                                  index,
                                                  muscleIndex,
                                                  "percentage",
                                                  Number(e.target.value)
                                                )
                                              }
                                              className="rounded-lg bg-slate-800 px-3 py-2 text-white outline-none"
                                              placeholder="%"
                                            />

                                            <button
                                              type="button"
                                              onClick={() =>
                                                removeNewExerciseMuscle(index, muscleIndex)
                                              }
                                              className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
                                            >
                                              Quitar
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <div className="mt-3 text-xs text-slate-400">
                                      La suma total debe ser exactamente 100.
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsCreatingNewExercise((prev) => ({
                                        ...prev,
                                        [index]: false,
                                      }));
                                      updateExercise(index, {
                                        exerciseId: "",
                                        measureType: "reps",
                                        newExerciseName: "",
                                        newExerciseMuscles: [],
                                      });
                                    }}
                                    className="text-sm text-slate-400 hover:text-slate-200"
                                  >
                                    Cancelar creación
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-200">
                          Series
                        </label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={exercise.sets}
                          onChange={(e) =>
                            updateExercise(index, { sets: Number(e.target.value) })
                          }
                          className="w-full rounded-lg bg-slate-700 px-3 py-3 text-white outline-none"
                        />
                      </div>

                      {exercise.measureType === "duration" ? (
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-200">
                            Tiempo (seg)
                          </label>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={exercise.durationSeconds}
                            onChange={(e) =>
                              updateExercise(index, { durationSeconds: e.target.value })
                            }
                            className="w-full rounded-lg bg-slate-700 px-3 py-3 text-white outline-none"
                            placeholder="Ej: 30"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-200">
                            Reps
                          </label>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={exercise.reps}
                            onChange={(e) => updateExercise(index, { reps: e.target.value })}
                            className="w-full rounded-lg bg-slate-700 px-3 py-3 text-white outline-none"
                          />
                        </div>
                      )}

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-200">
                          Peso (kg)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.5"
                          value={exercise.weightKg}
                          onChange={(e) =>
                            updateExercise(index, { weightKg: e.target.value })
                          }
                          className="w-full rounded-lg bg-slate-700 px-3 py-3 text-white outline-none"
                          placeholder="Opcional"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeExercise(index)}
                          className="inline-flex w-full items-center justify-center rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 md:w-auto"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={saving || loadingData}
            className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-b from-lime-600 to-lime-800 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg hover:from-lime-500 hover:to-lime-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? "Guardando..." : "Guardar actividad"}
          </button>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex w-full items-center justify-center rounded-lg bg-slate-700 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-slate-600 sm:w-auto"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}