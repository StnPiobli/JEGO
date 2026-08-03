"use client";
// Petits composants réutilisés sur toutes les pages admin.

import { useState } from "react";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-5">
      <div>
        <h1 className="font-display text-[22px] tracking-tight">{title}</h1>
        {subtitle && <div className="text-ink-soft text-[13px] mt-0.5">{subtitle}</div>}
      </div>
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
          <h3 className="font-display text-[14.5px] m-0">{title}</h3>
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
}: {
  children: React.ReactNode;
  variant?: "default" | "primary" | "danger" | "danger-primary";
  onClick?: () => void;
}) {
  const map: Record<string, string> = {
    default: "border border-green-500 text-green-700 bg-transparent",
    primary: "bg-green-700 text-white border border-green-700",
    danger: "border border-red text-red bg-transparent",
    "danger-primary": "bg-red text-white border border-red",
  };
  return (
    <button
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
      <div className="font-display text-2xl font-bold">{num}</div>
      <div className="text-[11.5px] text-ink-soft mt-1">{label}</div>
      {delta && (
        <div className={`text-[11px] font-semibold mt-1.5 ${delta.up ? "text-green-700" : "text-red"}`}>
          {delta.up ? "↑" : "↓"} {delta.text}
        </div>
      )}
    </div>
  );
}

export function LockedPage({
  icon = "⚠️",
  title,
  children,
}: {
  icon?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-paper border border-line rounded-2xl shadow-card p-8">
      <div className="text-3xl mb-2.5">{icon}</div>
      <h2 className="font-display text-lg mb-2">{title}</h2>
      <div className="text-[13px] leading-relaxed text-ink-soft max-w-2xl">{children}</div>
    </div>
  );
}

// Bandeau de confirmation démo — pas de backend, juste un retour visuel
// pour que chaque action ait un effet visible pendant les tests.
export function ToastDemo({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 bg-green-700 text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl shadow-card z-50">
      {message}
    </div>
  );
}

// Modale de double confirmation — pour les changements sensibles
// (commissions, paramètres support...).

export function ConfirmModal({
  titre,
  message,
  onConfirm,
  trigger,
}: {
  titre: string;
  message: string;
  onConfirm: () => void;
  trigger: (open: () => void) => React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      {trigger(() => setOuvert(true))}
      {ouvert && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-paper rounded-2xl shadow-card p-6 w-[380px]">
            <h3 className="font-display text-[15px] font-semibold mb-2">{titre}</h3>
            <p className="text-[13px] text-ink-soft mb-5">{message}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOuvert(false)} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border border-line text-ink-soft">
                Annuler
              </button>
              <button
                onClick={() => { onConfirm(); setOuvert(false); }}
                className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg bg-green-700 text-white"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Carte statistique dépliable — clic pour révéler un détail en dessous.
export function ExpandableCard({
  num,
  label,
  delta,
  children,
}: {
  num: string;
  label: string;
  delta?: { text: string; up: boolean };
  children: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="bg-paper border border-line rounded-2xl shadow-card overflow-hidden">
      <button onClick={() => setOuvert((v) => !v)} className="w-full text-left px-[18px] py-4">
        <div className="flex items-center justify-between">
          <div className="font-display text-2xl font-bold">{num}</div>
          <span className="text-ink-soft text-xs">{ouvert ? "▲" : "▼"}</span>
        </div>
        <div className="text-[11.5px] text-ink-soft mt-1">{label}</div>
        {delta && (
          <div className={`text-[11px] font-semibold mt-1 ${delta.up ? "text-green-700" : "text-red"}`}>
            {delta.up ? "↑" : "↓"} {delta.text}
          </div>
        )}
      </button>
      {ouvert && <div className="border-t border-dashed border-line px-[18px] py-3">{children}</div>}
    </div>
  );
}
