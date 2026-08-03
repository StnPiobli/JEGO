"use client";
// Composants réutilisés sur toutes les pages — identiques à ceux d'admin_web
// pour garantir un rendu visuel exactement pareil entre les deux espaces.

import { useState } from "react";

export function Topbar({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between mb-5">
      <div>
        <h1 className="font-display text-[22px] tracking-tight text-ink">{title}</h1>
        {subtitle && <div className="text-ink-soft text-[13px] mt-0.5">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-paper border border-line rounded-2xl shadow-card overflow-hidden">
      {title && (
        <div className="px-[18px] py-[15px] border-b border-line flex items-center justify-between">
          <h3 className="font-display text-[14.5px] m-0 text-ink">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Badge({
  children,
  color = "grey",
}: {
  children: React.ReactNode;
  color?: "green" | "amber" | "red" | "grey" | "purple";
}) {
  const map: Record<string, string> = {
    green: "bg-ok-bg text-green-700",
    amber: "bg-amber-bg text-amber",
    red: "bg-red-bg text-red",
    grey: "bg-grey-bg text-ink-soft",
    purple: "bg-purple-bg text-purple",
  };
  return (
    <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full inline-block ${map[color]}`}>
      {children}
    </span>
  );
}

export function BtnMini({
  children,
  variant = "default",
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  variant?: "default" | "primary" | "danger" | "danger-primary";
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const map: Record<string, string> = {
    default: "border border-green-500 text-green-700 bg-transparent",
    primary: "bg-green-700 text-white border border-green-700",
    danger: "border border-red text-red bg-transparent",
    "danger-primary": "bg-red text-white border border-red",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={`text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg mr-1.5 ${map[variant]}`}
    >
      {children}
    </button>
  );
}

export function StatCard({
  num,
  label,
  delta,
}: {
  num: string;
  label: string;
  delta?: { text: string; up: boolean };
}) {
  return (
    <div className="bg-paper border border-line rounded-2xl shadow-card px-[18px] py-4">
      <div className="font-display text-2xl font-bold text-ink">{num}</div>
      <div className="text-[11.5px] text-ink-soft mt-1">{label}</div>
      {delta && (
        <div className={`text-[11px] font-semibold mt-1.5 ${delta.up ? "text-green-700" : "text-red"}`}>
          {delta.up ? "↑" : "↓"} {delta.text}
        </div>
      )}
    </div>
  );
}

export function ExpandableCard({
  num,
  label,
  children,
}: {
  num: string;
  label: string;
  children: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="bg-paper border border-line rounded-2xl shadow-card overflow-hidden">
      <button onClick={() => setOuvert((v) => !v)} className="w-full text-left px-[18px] py-4">
        <div className="flex items-center justify-between">
          <div className="font-display text-2xl font-bold text-ink">{num}</div>
          <span className="text-ink-soft text-xs">{ouvert ? "▲" : "▼"}</span>
        </div>
        <div className="text-[11.5px] text-ink-soft mt-1">{label}</div>
      </button>
      {ouvert && <div className="border-t border-dashed border-line px-[18px] py-3">{children}</div>}
    </div>
  );
}

export function ToastDemo({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 bg-green-700 text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl shadow-card z-50">
      {message}
    </div>
  );
}

export function ThemeToggle() {
  const [sombre, setSombre] = useState(false);

  if (typeof window !== "undefined") {
    // Synchronise l'état affiché avec la classe déjà appliquée par le script anti-flash
  }

  function basculer() {
    const nouveau = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nouveau);
    localStorage.setItem("jego_agence_theme", nouveau ? "dark" : "light");
    setSombre(nouveau);
  }

  return (
    <button
      onClick={basculer}
      className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white/70 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10"
    >
      {sombre ? "☀️ Clair" : "🌙 Sombre"}
    </button>
  );
}
