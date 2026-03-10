"use client";

import { useState } from "react";

type Exercise = {
  exerciseId?: string;
  name?: string;
  sets: number;
  reps: number;
  newExerciseName?: string;
};

export default function ExerciseSelector({
  index,
  exercise,
  availableExercises,
  onChange,
  onRemove,
}: {
  index: number;
  exercise: Exercise;
  availableExercises: any[];
  onChange: (index: number, value: Exercise) => void;
  onRemove: (index: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = availableExercises.filter((e: any) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (e: any) => {
    onChange(index, {
      ...exercise,
      exerciseId: e.id,
      name: e.name,
      newExerciseName: undefined
    });

    setSearch("");
    setOpen(false);
  };

  const handleCreateNew = () => {
    onChange(index, {
      ...exercise,
      exerciseId: "__new",
      name: undefined,
      newExerciseName: search
    });

    setSearch("");
    setOpen(false);
  };

  return (
    <div className="grid grid-cols-5 gap-2 items-center">

      <div className="col-span-2 relative">

        {/* BUSCADOR */}
        {exercise.exerciseId !== "__new" && (
          <input
            value={search || exercise.name || ""}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar ejercicio..."
            className="w-full px-2 py-1 bg-gray-700 rounded"
          />
        )}

        {/* INPUT NUEVO EJERCICIO */}
        {exercise.exerciseId === "__new" && (
          <input
            value={exercise.newExerciseName || ""}
            onChange={(e) =>
              onChange(index, {
                ...exercise,
                newExerciseName: e.target.value
              })
            }
            placeholder="Nombre del nuevo ejercicio"
            className="w-full px-2 py-1 bg-gray-700 rounded"
          />
        )}

        {/* DROPDOWN */}
        {open && exercise.exerciseId !== "__new" && (
          <div className="absolute z-10 w-full bg-gray-900 rounded max-h-40 overflow-y-auto mt-1 border border-gray-700">

            {/* RESULTADOS */}
            {filtered.length > 0 ? (
              filtered.map((e: any) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => handleSelect(e)}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-700"
                >
                  {e.name}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-400 text-sm">
                No se encontraron ejercicios
              </div>
            )}

            {/* CREAR NUEVO */}
            <button
              type="button"
              onClick={handleCreateNew}
              className="block w-full text-left px-3 py-2 text-indigo-400 hover:bg-gray-700 border-t border-gray-700"
            >
              ➕ Crear nuevo ejercicio
            </button>

          </div>
        )}
      </div>

      {/* SETS */}
      <input
        type="number"
        value={exercise.sets}
        onChange={(e) =>
          onChange(index, {
            ...exercise,
            sets: Number(e.target.value)
          })
        }
        className="px-2 py-1 bg-gray-700 rounded"
      />

      {/* REPS */}
      <input
        type="number"
        value={exercise.reps}
        onChange={(e) =>
          onChange(index, {
            ...exercise,
            reps: Number(e.target.value)
          })
        }
        className="px-2 py-1 bg-gray-700 rounded"
      />

      <button
        type="button"
        onClick={() => onRemove(index)}
        className="w-5 flex items-center justify-center text-red-500 hover:text-red-400"
      >
        ✕
      </button>
    </div>
  );
}