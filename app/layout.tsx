import "./globals.css";
import type { Metadata } from "next";
import { getCurrentUser } from "@/src/lib/currentUser";
import AppNavbarShell from "@/src/components/AppNavbarShell";

export const metadata: Metadata = {
  title: "El Bravo",
  description: "El Bravo App",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="es">
      <body className="bg-[#08142d] text-white">
        {user ? (
          <AppNavbarShell
            userName={user.name ?? user.email ?? "Usuario"}
            photoUrl={user.photoUrl ?? null}
          />
        ) : null}

        {children}
      </body>
    </html>
  );
}