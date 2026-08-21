"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { apiFetch, getMembre, clearSession, initialesMembre, type Membre } from "@/lib/api";

type CleBadge = "agences" | "litiges" | "moderation" | "messages";

type NavItem = {
  label: string;
  href?: string;
  badge?: CleBadge;
  locked?: "later" | "todo"; // "later" = différé (choix), "todo" = pas encore spécifié
};

type NavGroup = {
  label: string;
  note?: string;
  items: NavItem[];
};

const groups: NavGroup[] = [
  {
    label: "Vue d'ensemble",
    items: [
      { label: "Tableau de bord", href: "/dashboard" },
      { label: "Utilisateurs & activité", href: "/activite" },
      { label: "Rapports & statistiques", href: "/rapports" },
    ],
  },
  {
    label: "Opérations",
    items: [
      { label: "Agences", href: "/agences", badge: "agences" },
      { label: "Voyageurs", href: "/voyageurs" },
      { label: "Points JEGO", href: "/points" },
      { label: "Billets & trajets", href: "/billets" },
      { label: "Litiges", href: "/litiges", badge: "litiges" },
      { label: "Finances", href: "/finances" },
      { label: "Configuration des frais", href: "/frais" },
            { label: "Modération", href: "/moderation", badge: "moderation" },
      { label: "Messages", href: "/messages", badge: "messages" },
    ],
  },
  {
    label: "Organisation",
    note: "— plus tard",
    items: [
      { label: "Équipe admin", locked: "later" },
      { label: "Rôles & permissions", locked: "later" },
    ],
  },
  {
    label: "Système",
    items: [
      { label: "Paramètres", href: "/parametres" },
      { label: "Sécurité & logs", href: "/securite" },
    ],
  },
  {
    label: "À spécifier",
    note: "— pas encore décidé",
    items: [
      { label: "Demandes RGPD", href: "/rgpd", locked: "todo" },
      { label: "Incidents & accidents", href: "/incidents", locked: "todo" },
    ],
  },
];

/** Compteurs réels affichés en pastille. 0 = pas de pastille affichée. */
type Compteurs = Record<CleBadge, number>;
const compteursVides: Compteurs = { agences: 0, litiges: 0, moderation: 0, messages: 0 };

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [membre, setMembre] = useState<Membre | null>(null);
  const [compteurs, setCompteurs] = useState<Compteurs>(compteursVides);

  useEffect(() => {
    setMembre(getMembre());
  }, []);

  useEffect(() => {
    let annule = false;
    async function charger() {
      try {
        // Agences en attente, litiges ouverts, conversations avec des
        // messages non lus : routes réelles existantes.
        const [ag, lit, msg] = await Promise.allSettled([
          apiFetch("/api/admin/agences-en-attente"),
          apiFetch("/api/litiges/admin/tous"),
          apiFetch("/api/messages/admin/conversations"),
        ]);
        if (annule) return;
        const conversationsNonLues = msg.status === "fulfilled"
          ? (msg.value.conversations || []).filter((c: { non_lus: number }) => c.non_lus > 0).length
          : 0;
        setCompteurs({
          agences: ag.status === "fulfilled" ? (ag.value.agences?.length ?? 0) : 0,
          litiges: lit.status === "fulfilled" ? (lit.value.litiges?.length ?? 0) : 0,
          // BRANCHEMENT : GET /api/admin/moderation → { commentaires: [...] }
          moderation: 0,
          messages: conversationsNonLues,
        });
      } catch {
        if (!annule) setCompteurs(compteursVides);
      }
    }
    charger();
    // Rafraîchit aussi en tâche de fond, pas seulement au changement
    // de page -- sinon un badge (nouveau message reçu, ou message lu
    // dans un autre onglet) ne se met à jour qu'en changeant de route.
    const intervalle = window.setInterval(charger, 12000);
    window.addEventListener("jego-messages-lus", charger);
    return () => {
      annule = true;
      window.clearInterval(intervalle);
      window.removeEventListener("jego-messages-lus", charger);
    };
  }, [pathname]);

  function seDeconnecter() {
    clearSession();
    router.replace("/login");
  }

  return (
        <aside className="bg-green-900 text-on-dark px-4 py-7 flex flex-col sticky top-0 h-screen overflow-y-auto overscroll-contain w-[248px] shrink-0">
      <div className="flex items-center gap-2.5 px-2 pb-6">
        <div className="w-[34px] h-[34px] rounded-[9px] bg-green-300 flex items-center justify-center text-green-900 font-display font-bold text-base -rotate-3">
          J
        </div>
        <div>
          <div className="font-display font-bold text-[17px]">JEGO</div>
          <div className="text-[10.5px] text-green-300 uppercase tracking-wider">admin.jego.cm</div>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.label}>
          <div className="text-[10.5px] uppercase tracking-wider text-white/40 mt-4 mb-1.5 px-2.5">
            {group.label}{" "}
            {group.note && <span className="normal-case tracking-normal opacity-70">{group.note}</span>}
          </div>
          {group.items.map((item) => {
            const active = item.href && pathname === item.href;
            const isLocked = !!item.locked;
            const valeurBadge = item.badge ? compteurs[item.badge] : 0;
            const content = (
              <div
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] mb-0.5 transition-colors ${
                  active
                    ? "bg-white/10 text-white font-semibold"
                    : isLocked
                    ? "opacity-60 cursor-not-allowed text-white/70"
                    : "text-white/80 hover:bg-white/5"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    active ? "bg-green-300" : "bg-white/30"
                  }`}
                />
                {item.label}
                {valeurBadge > 0 && (
                  <span className="ml-auto text-[10.5px] font-bold bg-red text-white rounded-full px-1.5">
                    {valeurBadge}
                  </span>
                )}
                {item.locked === "later" && <span className="ml-auto text-[10px]">🔒</span>}
                {item.locked === "todo" && <span className="ml-auto text-[10px]">⚠️</span>}
              </div>
            );
            return isLocked && !item.href ? (
              <div key={item.label}>{content}</div>
            ) : (
              <Link key={item.label} href={item.href!}>
                {content}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="mt-auto">
        <div className="pt-3.5 border-t border-white/10">
          <ThemeToggle />
        </div>
        <div className="mt-2 pt-3.5 border-t border-white/10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center text-xs font-bold shrink-0">
            {initialesMembre(membre)}
          </div>
          <div className="text-[12.5px] min-w-0">
            <b className="block text-[13px] truncate">
              {membre ? `${membre.prenom} ${membre.nom}` : "—"}
            </b>
            <span className="text-white/50 text-[11px]">
              {membre && String(membre.niveau) === "0" ? "Super Admin" : membre ? `Niveau ${membre.niveau}` : ""}
            </span>
          </div>
          <button
            onClick={seDeconnecter}
            title="Se déconnecter"
            className="ml-auto text-white/50 hover:text-white text-[11px] font-semibold shrink-0"
          >
            Quitter
          </button>
        </div>
      </div>
    </aside>
  );
}
