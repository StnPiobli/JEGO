"use client";
// Bouton de bascule clair/sombre, persisté en localStorage.

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [sombre, setSombre] = useState(false);

  useEffect(() => {
    const enregistre = localStorage.getItem("jego_admin_theme");
    setSombre(enregistre === "dark");
  }, []);

  function basculer() {
    const nouveau = !sombre;
    setSombre(nouveau);
    document.documentElement.classList.toggle("dark", nouveau);
    localStorage.setItem("jego_admin_theme", nouveau ? "dark" : "light");
  }

  return (
    <button
      onClick={basculer}
      className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white/70 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10"
      title={sombre ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      {sombre ? "☀️ Clair" : "🌙 Sombre"}
    </button>
  );
}
