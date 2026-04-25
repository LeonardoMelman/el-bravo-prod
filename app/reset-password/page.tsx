"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setError("Link inválido. Solicitá uno nuevo.");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al restablecer la contraseña");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => { window.location.href = "/login?reset=ok"; }, 2000);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="t-page-bg min-h-screen px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="w-full max-w-md rounded-[28px] bg-slate-800/85 p-8 shadow-2xl">
          <div className="mb-8">
            <div className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
              El Bravo
            </div>
            <h1 className="mt-2 text-4xl font-bold leading-tight text-white">
              Nueva contraseña
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Elegí una nueva contraseña para tu cuenta.
            </p>
          </div>

          {success ? (
            <div className="rounded-xl border border-lime-500/40 bg-lime-500/10 px-4 py-5 text-sm text-lime-300">
              <p className="font-semibold">¡Contraseña actualizada!</p>
              <p className="mt-1 text-lime-400/80">Redirigiendo al inicio de sesión...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  placeholder="Repetí la contraseña"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || !token}
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-b from-lime-600 to-lime-800 px-4 py-3 text-base font-semibold text-white shadow-md transition hover:from-lime-500 hover:to-lime-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Guardando..." : "Guardar nueva contraseña"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-slate-300">
            <button
              type="button"
              onClick={() => { window.location.href = "/login"; }}
              className="font-semibold text-lime-400 transition hover:text-lime-300"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
