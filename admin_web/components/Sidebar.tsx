"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href?: string;
  badge?: number;
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
      { label: "Rapports & statistiques", href: "/rapports" },
    ],
  },
  {
    label: "Opérations",
    items: [
      { label: "Agences", href: "/agences", badge: 3 },
      { label: "Voyageurs", href: "/voyageurs" },
      { label: "Billets & trajets", href: "/billets" },
      { label: "Litiges", href: "/litiges", badge: 5 },
      { label: "Finances", href: "/finances" },
      { label: "Configuration des frais", href: "/frais" },
      { label: "Modération", href: "/moderation", badge: 4 },
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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-green-900 text-off-white px-4 py-7 flex flex-col sticky top-0 h-screen overflow-y-auto w-[248px] shrink-0">
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
                {item.badge && (
                  <span className="ml-auto text-[10.5px] font-bold bg-red text-white rounded-full px-1.5">
                    {item.badge}
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

      <div className="mt-auto pt-3.5 border-t border-white/10 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center text-xs font-bold">
          SP
        </div>
        <div className="text-[12.5px]">
          <b className="block text-[13px]">Stéphane P.</b>
          <span className="text-white/50 text-[11px]">Super Admin</span>
        </div>
      </div>
    </aside>
  );
}
