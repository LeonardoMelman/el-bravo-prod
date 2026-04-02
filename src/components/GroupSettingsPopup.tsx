"use client";

import LeaveGroupButton from "@/src/components/LeaveGroupButton";
import DeleteGroupButton from "@/src/components/DeleteGroupButton";

type GroupSettingsPopupProps = {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  isAdmin: boolean;
  activeMemberCount: number;
  createdAt: Date;
};

export default function GroupSettingsPopup({
  open,
  onClose,
  groupId,
  groupName,
  isAdmin,
  activeMemberCount,
  createdAt,
}: GroupSettingsPopupProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-[#1a2942] shadow-2xl">
        <div className="border-b border-slate-700/80 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white">
                Configuración del grupo
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600 bg-slate-800/70 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <section className="rounded-2xl border border-slate-700 bg-[#0f1d35] p-4">
            <div className="mb-3">
              <p className="text-base font-semibold text-white">
                Tu participación
              </p>
            </div>

            <LeaveGroupButton
              groupId={groupId}
              isAdmin={isAdmin}
              activeMemberCount={activeMemberCount}
            />
          </section>

          {isAdmin && (
            <section className="rounded-2xl border border-red-900/60 bg-red-950/20 p-4">
              <div className="mb-3">
                <p className="text-base font-semibold text-red-300">
                  Administración del grupo
                </p>
                <p className="mt-1 text-sm text-red-200/70">
                  Esta acción elimina el grupo y expulsa a sus miembros.
                </p>
              </div>

              <DeleteGroupButton
                groupId={groupId}
                groupName={groupName}
              />
            </section>
          )}

          <div className="border-t border-slate-700/70 pt-3 text-sm text-slate-400">
            Creado: {new Date(createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}