"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/src/components/Navbar";

type Props = {
  userName: string;
  photoUrl?: string | null;
};

const HIDE_ON_PATHS = ["/login", "/register"];

export default function AppNavbarShell({ userName, photoUrl }: Props) {
  const pathname = usePathname();

  const shouldHide = HIDE_ON_PATHS.some((path) => pathname?.startsWith(path));

  if (shouldHide) return null;

  return (
    <Navbar
      userName={userName}
      photoUrl={photoUrl ?? undefined}
    />
  );
}