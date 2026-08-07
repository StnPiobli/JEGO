"use client";
// Garde d'authentification : sans token en localStorage, on ne rentre pas
// dans l'espace admin — redirection immédiate vers /login.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getToken } from "@/lib/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [autorise, setAutorise] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setAutorise(true);
  }, [router]);

  // Tant que la vérification n'a pas eu lieu, on n'affiche rien : évite le
  // flash de l'interface admin à quelqu'un qui n'est pas connecté.
  if (!autorise) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-soft text-sm">
        Vérification de la session…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[248px_1fr] min-h-screen">
      <Sidebar />
      <main className="px-10 py-7 pb-16">{children}</main>
    </div>
  );
}
