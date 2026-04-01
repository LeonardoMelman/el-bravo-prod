"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const ACTIVITY_TYPE_OPTIONS = [
  { value: "gym", label: "Gimnasio" },
  { value: "run", label: "Running" },
  { value: "sport", label: "Deporte" },
  { value: "mobility", label: "Movilidad" },
  { value: "other", label: "Otro" },
] as const;

type EditSeasonFormProps = {
  groupId: string;
  seasonId: string;
  initialName: string;
  initialDescription: string;
  initialStartDate: string;
  initialEndDate: string;
  initialWeeklyGoal: number;
  initialAllowedActivityTypes: string[];
};

export default function EditSeasonForm({
  groupId,
  seasonId,
  initialName,
  initialDescription,
  initialStartDate,
  initialEndDate,
  initialWeeklyGoal,
  initialAllowedActivityTypes,
}: EditSeasonFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [minPerWeek, setMinPerWeek] = useState(initialWeeklyGoal);
  const [allowedActivityTypes, setAllowedActivityTypes] = useState<string[]>(
    initialAllowedActivityTypes.length > 0 ? initialAllowedActivityTypes : ["gym"]
  );

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activityTypeSet = useMemo(
    () => new Set(allowedActivityTypes),
    [allowedActivityTypes]
  );

  function toggleActivityType(value: string) {
    setAllowedActivityTypes((current) => {
      if (current.includes(value)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== value);
      }

      return [...current, value];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre de la temporada es requerido");
      return;
    }

    if (!startDate || !endDate) {
      setError("Tenés que completar las fechas");
      return;
    }

    if (endDate < startDate) {
      setError("La fecha de fin no puede ser anterior a la de inicio");
      return;
    }

    if (!Number.isInteger(minPerWeek) || minPerWeek < 1 || minPerWeek > 7) {
      setError("El objetivo semanal debe estar entre 1 y 7");
      return;
    }

    if (allowedActivityTypes.length === 0) {
      setError("Tenés que seleccionar al menos un tipo de actividad permitido");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/seasons/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId,
          seasonId,
          name: name.trim(),
          description: description.trim(),
          startDate,
          endDate,
          minPerWeek,
          allowedActivityTypes,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLoading(false);
        setError(data?.error || "No se pudo actualizar la temporada");
        return;
      }

      router.push(`/group/${groupId}`);
      router.refresh();
    } catch (err) {
      console.error("/season edit submit error:", err);
      setLoading(false);
      setError("Error de red al actualizar la temporada");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl bg-slate-900/70 p-5">
        <h2 className="mb-4 text-xl font-semibold text-white">Detalles</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">
              Nombre de la temporada
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">
              Descripción
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de la temporada"
              className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/60"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/70 p-5">
        <h2 className="mb-4 text-xl font-semibold text-white">Fechas y objetivo</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">
              Fecha de inicio
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-500/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">
              Fecha de fin
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-500/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">
              Objetivo semanal
            </label>
            <input
              type="number"
              min={1}
              max={7}
              value={minPerWeek}
              onChange={(e) => setMinPerWeek(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-500/60"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/70 p-5">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">Tipos permitidos</h2>
          <p className="mt-1 text-sm text-slate-400">
            Solo estos tipos de actividad van a sumar puntos en esta temporada.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {ACTIVITY_TYPE_OPTIONS.map((option) => {
            const checked = activityTypeSet.has(option.value);

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleActivityType(option.value)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  checked
                    ? "border-lime-500 bg-lime-500/10 text-white"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <div className="font-semibold">{option.label}</div>
                <div className="mt-1 text-sm text-slate-400">
                  {checked ? "Actualmente incluido" : "Disponible para incluir"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(`/group/${groupId}`)}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-gradient-to-b from-lime-600 to-lime-800 px-5 py-2 text-sm font-semibold text-white shadow-md hover:from-lime-500 hover:to-lime-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}