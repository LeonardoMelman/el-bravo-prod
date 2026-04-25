import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/currentUser";
import CreateActivityForm from "@/src/components/CreateActivityForm";

export default async function LoadPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="t-page-bg min-h-screen p-6 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 px-6">
          <a
            href="/home"
            className="inline-flex items-center justify-center rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-500"
          >
            ← Volver
          </a>
        </div>

        <CreateActivityForm />
      </div>
    </main>
  );
}