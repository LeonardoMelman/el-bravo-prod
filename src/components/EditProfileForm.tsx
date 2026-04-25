"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useState } from "react";

type EditProfileUser = {
  id: string;
  name: string | null;
  email: string;
  photoUrl: string | null;
  weeklyGoal: number;
};

function getFileExtension(file: File) {
  const byName = file.name.split(".").pop()?.toLowerCase();

  if (byName && byName.length <= 5) {
    return byName;
  }

  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function getInitial(name: string | null | undefined, email: string) {
  const source = (name ?? "").trim() || email.trim();
  return source.charAt(0).toUpperCase();
}

export default function EditProfileForm({ user }: { user: EditProfileUser }) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl ?? "");
  const [weeklyGoal, setWeeklyGoal] = useState(String(user?.weeklyGoal ?? 3));

  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetPasswordMessage, setResetPasswordMessage] = useState("");

  useEffect(() => {
    if (!selectedPhotoFile) {
      setLocalPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedPhotoFile);
    setLocalPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedPhotoFile]);

  const displayPhotoUrl = useMemo(() => {
    return localPreviewUrl || photoUrl || "";
  }, [localPreviewUrl, photoUrl]);

  async function uploadProfilePhotoIfNeeded() {
    if (!selectedPhotoFile) {
      return photoUrl.trim() || null;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxBytes = 3 * 1024 * 1024;

    if (!allowedTypes.includes(selectedPhotoFile.type)) {
      throw new Error("La foto debe ser JPG, PNG o WEBP.");
    }

    if (selectedPhotoFile.size > maxBytes) {
      throw new Error("La foto no puede pesar más de 3 MB.");
    }

    const ext = getFileExtension(selectedPhotoFile);
    const pathname = `profiles/${user.id}/avatar-${Date.now()}.${ext}`;

    setUploadingPhoto(true);
    setUploadProgress(0);

    try {
      const blob = await upload(pathname, selectedPhotoFile, {
        access: "public",
        contentType: selectedPhotoFile.type,
        handleUploadUrl: "/api/profile/photo/upload",
        onUploadProgress(progressEvent) {
          setUploadProgress(progressEvent.percentage);
        },
      });

      setPhotoUrl(blob.url);
      return blob.url;
    } finally {
      setUploadingPhoto(false);
      setUploadProgress(null);
    }
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        setSuccess("");
        setResetPasswordMessage("");

        if (!name.trim()) {
          setSaving(false);
          setError("El nombre es obligatorio.");
          return;
        }

        const parsedWeeklyGoal = Number(weeklyGoal);

        if (
          !Number.isInteger(parsedWeeklyGoal) ||
          parsedWeeklyGoal < 1 ||
          parsedWeeklyGoal > 14
        ) {
          setSaving(false);
          setError("El objetivo semanal debe ser un número entero entre 1 y 14.");
          return;
        }

        try {
          const finalPhotoUrl = await uploadProfilePhotoIfNeeded();

          const res = await fetch("/api/profile/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              email: email.trim(),
              photoUrl: finalPhotoUrl,
              weeklyGoal: parsedWeeklyGoal,
            }),
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            setError(data?.error || "Error guardando perfil");
          } else {
            setSuccess("Perfil actualizado correctamente.");
            setSelectedPhotoFile(null);

            setTimeout(() => {
              window.location.href = "/profile";
            }, 700);
          }
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error ? err.message : "Error de red guardando el perfil"
          );
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-200">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg bg-slate-700 px-3 py-2 text-white outline-none ring-1 ring-transparent placeholder:text-slate-400 focus:ring-lime-500"
            placeholder="Tu nombre"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg bg-slate-700 px-3 py-2 text-white outline-none ring-1 ring-transparent placeholder:text-slate-400 focus:ring-lime-500"
            placeholder="tuemail@mail.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-xl bg-slate-800 p-4">
          <label className="block text-sm font-medium text-slate-200">
            Foto de perfil
          </label>

          <div className="mt-3 flex items-center gap-4">
            {displayPhotoUrl ? (
              <img
                src={displayPhotoUrl}
                alt="Preview foto de perfil"
                className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-600"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-700 text-2xl font-bold text-white ring-1 ring-slate-600">
                {getInitial(name, email)}
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-3">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setError("");
                  setSuccess("");
                  setSelectedPhotoFile(file);
                }}
                className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-slate-600"
              />

              <p className="text-xs text-slate-400">
                JPG, PNG o WEBP. Máximo 3 MB.
              </p>

              <div className="flex flex-wrap gap-2">
                {photoUrl || selectedPhotoFile ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPhotoFile(null);
                      setLocalPreviewUrl("");
                      setPhotoUrl("");
                      setError("");
                      setSuccess("");
                    }}
                    className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600"
                  >
                    Quitar foto
                  </button>
                ) : null}
              </div>

              {uploadingPhoto && uploadProgress !== null ? (
                <div className="text-xs text-sky-300">
                  Subiendo foto... {Math.round(uploadProgress)}%
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Objetivo semanal personal
          </label>
          <input
            type="number"
            min={1}
            max={14}
            value={weeklyGoal}
            onChange={(e) => setWeeklyGoal(e.target.value)}
            className="mt-1 w-full rounded-lg bg-slate-700 px-3 py-2 text-white outline-none ring-1 ring-transparent placeholder:text-slate-400 focus:ring-lime-500"
          />
        </div>
      </div>

      <div className="rounded-xl bg-slate-800 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Contraseña
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Restablecé tu contraseña desde tu email.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setResetPasswordMessage(
                "Próximamente te enviaremos un email para restablecer la contraseña."
              );
            }}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
          >
            Cambiar contraseña
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg bg-green-500/15 px-3 py-2 text-sm text-green-300">
          {success}
        </div>
      ) : null}

      {resetPasswordMessage ? (
        <div className="rounded-lg bg-sky-500/15 px-3 py-2 text-sm text-sky-300">
          {resetPasswordMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={saving || uploadingPhoto}
          className="rounded-lg bg-gradient-to-b from-lime-600 to-lime-800 px-6 py-2 font-semibold text-white shadow-md hover:from-lime-500 hover:to-lime-700 disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>

        <a
          href="/profile"
          className="rounded-md bg-slate-600 px-4 py-2 text-center font-medium hover:bg-slate-500"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}