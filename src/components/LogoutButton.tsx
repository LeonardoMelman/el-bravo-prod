"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  className?: string;
};

export default function LogoutButton({ className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        console.error("Logout failed", await res.text());
      }
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      router.push("/login");
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      className={
        className ??
        "inline-flex w-full items-center justify-center rounded-md bg-gray-700 px-3 py-2 text-center text-sm hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
      }
      aria-busy={loading}
    >
      {loading ? "Saliendo…" : "Logout"}
    </button>
  );
}