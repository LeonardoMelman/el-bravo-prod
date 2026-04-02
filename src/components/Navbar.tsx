"use client";

type NavbarProps = {
  userName: string;
  photoUrl?: string | null;
};

export default function Navbar({ userName, photoUrl }: NavbarProps) {
  return (
    <header className="w-full h-14 px-6 bg-[#3b4f6c]">
      <div className="mx-auto max-w-7xl h-full flex items-center justify-between">
        {/* Logo */}
        <a
          href="/home"
          className="text-white font-semibold text-lg hover:opacity-90 transition"
        >
          El Bravo
        </a>

        {/* User info */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-200">
            Hola, <span className="font-bold">{userName}</span>
          </span>

          <a
            href="/profile"
            aria-label="Ir a mi perfil"
            className="block"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-900 border-b border-slate-700 flex items-center justify-center hover:opacity-90 transition">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-white">
                  {userName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </a>
        </div>
      </div>
    </header>
  );
}