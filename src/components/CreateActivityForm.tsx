"use client";

import { useEffect, useState } from "react";

function twoDigits(n: number) {
  return String(n).padStart(2, '0');
}

// using native time inputs for simpler, consistent mobile behavior

export default function CreateActivityForm(): any {
  const [routineExercises, setRoutineExercises] = useState<any[]>([]);
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [searchTerms, setSearchTerms] = useState<Record<number, string | undefined>>({});
  const now = new Date();
  const startDefault = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const defaultDate = startDefault.toISOString().slice(0,10);
  const defaultStartTime = `${twoDigits(startDefault.getHours())}:${twoDigits(startDefault.getMinutes())}`;
  const defaultEndTime = `${twoDigits(now.getHours())}:${twoDigits(now.getMinutes())}`;
  const [date, setDate] = useState<string>(defaultDate);
  const [startTime, setStartTime] = useState<string>(defaultStartTime);
  const [endTime, setEndTime] = useState<string>(defaultEndTime);
  // endDate is kept separate so default end uses today's date (now)
  const [endDate] = useState<string>(now.toISOString().slice(0,10));
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [activityType, setActivityType] = useState<string>('other');
  const [routines, setRoutines] = useState<any[]>([]);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/routine/list');
        const data = await res.json() ;
        if (!res.ok) return;
        if (!mounted) return;
        setRoutines(Array.isArray(data) ? data : data.routines || []);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    fetch("/api/exercise/list")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAvailableExercises(data);
        else if (Array.isArray(data.exercises)) setAvailableExercises(data.exercises);
      })
      .catch(() => setAvailableExercises([]));
  }, []);

  function startSearch(index: number, value: string) {
    setSearchTerms(prev => ({ ...prev, [index]: value }));
  }
  
  function closeSearch(index: number) {
    setSearchTerms(prev => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  }
  
  function getFilteredExercises(index: number) {
    const term = searchTerms[index]?.toLowerCase() ?? "";
    return availableExercises.filter((e: any) =>
      e.name.toLowerCase().includes(term)
    );
  }

  // native time inputs will handle hours/minutes on mobile devices

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          const s = new Date(`${date}T${startTime}:00`);
          let ed = new Date(`${endDate}T${endTime}:00`);
          if (ed.getTime() <= s.getTime()) {
            ed = new Date(ed.getTime() + 24 * 60 * 60 * 1000);
          }
          const payload: any = { startedAt: s.toISOString(), endedAt: ed.toISOString(), notes, type: activityType };
          if (selectedRoutineId) payload.routineId = selectedRoutineId;
          if (routineExercises.length > 0) payload.exercises = routineExercises;
          const res = await fetch('/api/activities/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            alert(data?.error || 'Error creating activity');
          } else {
            window.location.href = '/dashboard';
          }
        } catch (err) {
          alert('Network error');
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-4"
    >
      {/* activity type removed from model */}

      <div>
        <label className="block text-sm font-medium text-gray-200">Tipo</label>
        <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded">
          <option value="gym">Gimnasio</option>
          <option value="run">Correr</option>
          <option value="sport">Deporte</option>
          <option value="mobility">Movilidad</option>
          <option value="other">Otro</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-200">Fecha</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-200">Inicio</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200">Fin</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded" />
        </div>
      </div>

      

      <div>
        <label className="block text-sm font-medium text-gray-200">Notas</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded" rows={3} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-200">Rutina (opcional)</label>
        <select value={selectedRoutineId ?? ""} onChange={(e) => { const id = e.target.value || null; setSelectedRoutineId(id); const r = routines.find(x => x.id === id);
            if (r) {setRoutineExercises( r.exercises.map((ex: any) => ({
              id: ex.id,
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps }))
                );
              } else {
                setRoutineExercises([]);
              }
            }}
            className="w-full mt-1 px-3 py-2 bg-gray-700 rounded"
          >
          <option value="">-- Ninguna --</option>
          {routines.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {routineExercises.length > 0 && (
          <div className="bg-gray-800 p-3 rounded space-y-2">
            <h3 className="font-medium">Ejercicios</h3>

            {routineExercises.map((ex, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-center">

                <div className="col-span-2 relative">
                  <input
                    value={searchTerms[i] ?? ex.name ?? ""}
                    onChange={(e) => startSearch(i, e.target.value)}
                    placeholder="Buscar ejercicio..."
                    className="w-full px-2 py-1 bg-gray-700 rounded"
                  />

                  {searchTerms[i] !== undefined && (
                    <div className="absolute z-10 w-full bg-gray-900 max-h-40 overflow-y-auto rounded mt-1">
                      {getFilteredExercises(i).map((e: any) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => {
                            const copy = [...routineExercises];
                            copy[i].exerciseId = e.id;
                            copy[i].name = e.name;
                            setRoutineExercises(copy);
                            closeSearch(i);
                          }}
                          className="block w-full text-left px-3 py-2 hover:bg-gray-700"
                        >
                          {e.name}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...routineExercises];
                          copy[i].exerciseId = "__new";
                          setRoutineExercises(copy);
                          closeSearch(i);
                        }}
                        className="block w-full text-left px-3 py-2 text-indigo-400 hover:bg-gray-700"
                      >
                        ➕ Crear nuevo ejercicio
                      </button>
                    </div>
                  )}
                </div>

                {ex.exerciseId === "__new" && (
                <input
                  value={ex.newExerciseName || ""}
                  onChange={(e) => {
                    const copy = [...routineExercises];
                    copy[i].newExerciseName = e.target.value;
                    setRoutineExercises(copy);
                  }}
                  placeholder="Nombre del nuevo ejercicio"
                  className="col-span-2 px-2 py-1 bg-gray-700 rounded"
                />
              )}

                <input
                  type="number"
                  className="px-2 py-1 bg-gray-700 rounded"
                  value={ex.sets}
                  onChange={(e) => {
                    const copy = [...routineExercises];
                    copy[i].sets = Number(e.target.value);
                    setRoutineExercises(copy);
                  }}
                />

                <input
                  type="number"
                  className="px-2 py-1 bg-gray-700 rounded"
                  value={ex.reps}
                  onChange={(e) => {
                    const copy = [...routineExercises];
                    copy[i].reps = Number(e.target.value);
                    setRoutineExercises(copy);
                  }}
                />

              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setRoutineExercises([
                  ...routineExercises,
                  { name: "", sets: 3, reps: 10 }
                ])
              }
              className="text-sm px-3 py-1 bg-gray-700 rounded"
            >
              + Agregar ejercicio
            </button>
          </div>
        )}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 rounded">{saving ? 'Guardando...' : 'Guardar actividad'}</button>
        <a href="/dashboard" className="px-4 py-2 bg-gray-600 rounded">Cancelar</a>
      </div>
    </form>
  );
}
