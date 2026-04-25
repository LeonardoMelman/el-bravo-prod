import "./globals.css";
import type { Metadata } from "next";
import { getCurrentUser } from "@/src/lib/currentUser";
import AppNavbarShell from "@/src/components/AppNavbarShell";
import ThemeProvider from "@/src/components/ThemeProvider";

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
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Anti-flash: apply stored theme before React hydrates to avoid color flicker */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('elbravo-theme');document.documentElement.setAttribute('data-theme',t==='manu'?'manu':'leo');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="text-white">
        <ThemeProvider>
          {user ? (
            <AppNavbarShell
              userName={user.name ?? user.email ?? "Usuario"}
              photoUrl={user.photoUrl ?? null}
            />
          ) : null}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
