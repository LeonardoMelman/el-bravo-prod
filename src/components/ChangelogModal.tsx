"use client";

import { useState } from "react";

const CHANGELOG_VERSION = "25 Abr 2026";

const sections = [
  {
    label: "Nuevo",
    color: "text-lime-400",
    dotColor: "bg-lime-500",
    items: [
      {
        title: "Insignias y logros",
        desc: "Desbloqueá medallas según tu esfuerzo: constancia, running, músculo, variedad y más. Cada insignia tiene niveles Bronce, Plata, Oro y Bravo.",
      },
      {
        title: "Resumen al terminar un entrenamiento",
        desc: "Al registrar una actividad, aparece un popup con los puntos que ganaste, tus multiplicadores, el progreso de la semana y si lograste algún logro.",
      },
      {
        title: "Foto de perfil",
        desc: "Ahora podés subir una foto a tu perfil directamente desde la app.",
      },
      {
        title: "Estadísticas detalladas",
        desc: "Nueva sección de estadísticas con gráficos de actividad semanal, grupos musculares trabajados y horarios de entrenamiento.",
      },
      {
        title: "Recuperar contraseña",
        desc: "Si olvidaste tu contraseña, podés pedir un email de recuperación desde la pantalla de inicio de sesión.",
      },
      {
        title: "Ejercicios personalizados privados",
        desc: "Los ejercicios que creás vos son solo tuyos: no aparecen para otros usuarios.",
      },
    ],
  },
  {
    label: "Mejorado",
    color: "text-sky-400",
    dotColor: "bg-sky-500",
    items: [
      {
        title: "Tiempo en minutos:segundos",
        desc: "Al cargar ejercicios en tus rutinas, el tiempo ahora se muestra en formato min:seg (ej. 1:30 en vez de 90 seg).",
      },
      {
        title: "Ejercicios solo en actividades de fuerza",
        desc: "Los ejercicios y rutinas ya no aparecen cuando registrás actividades de cardio, yoga u otros tipos. La pantalla queda más limpia.",
      },
      {
        title: "Búsqueda de ejercicios mejorada",
        desc: "La búsqueda al registrar una actividad es más rápida y precisa.",
      },
      {
        title: "Pantalla de inicio rediseñada",
        desc: "Progreso semanal más visual, acceso rápido a grupos y rutinas, y frases motivacionales nuevas cada vez que entrás.",
      },
      {
        title: "Sistema de puntuación más preciso",
        desc: "Los bonos semanales y multiplicadores de consistencia se calculan de forma más exacta.",
      },
      {
        title: "Personalización de tema desde el inicio",
        desc: "Podés cambiar el tema visual de la app directamente desde la pantalla de inicio.",
      },
    ],
  },
  {
    label: "Corregido",
    color: "text-orange-400",
    dotColor: "bg-orange-500",
    items: [
      {
        title: "Ejercicios creados no aparecían",
        desc: "Los nuevos ejercicios que creabas no se mostraban correctamente al cargar una actividad. Ya está solucionado.",
      },
      {
        title: "Errores menores en puntuación",
        desc: "Se corrigieron casos donde los puntos no se calculaban bien en ciertas actividades.",
      },
      {
        title: "Problemas visuales con el tema",
        desc: "Se arreglaron algunos elementos que no respetaban el tema de color seleccionado.",
      },
    ],
  },
];

export default function ChangelogModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-lime-500" />
        Novedades · {CHANGELOG_VERSION}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-slate-900 text-left sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-white">Novedades de El Bravo</h2>
                <p className="text-xs text-slate-500">{CHANGELOG_VERSION}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-6">
              {sections.map((section) => (
                <div key={section.label}>
                  <p className={`mb-3 text-xs font-bold uppercase tracking-widest ${section.color}`}>
                    {section.label}
                  </p>
                  <ul className="space-y-3">
                    {section.items.map((item) => (
                      <li key={item.title} className="flex gap-3">
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${section.dotColor}`} />
                        <div>
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{item.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 px-5 py-3">
              <button
                onClick={() => setOpen(false)}
                className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
