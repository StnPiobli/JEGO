"use client";
// BRANCHÉ SUR LE VRAI BACKEND
//   GET /api/admin/notifications        (notifications de l'admin connecté)
//   PUT /api/admin/notifications/lues
//
// Messages « Nous contacter », dénonciations, litiges à trancher : ce
// qui ne partait que par email est désormais lisible ici.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Panel, BtnMini } from "@/components/ui";
import { apiFetch } from "@/lib/api";

type Notif = { id: string; type: string; titre: string | null; contenu: string; lu: boolean; cree_le: string };

const LIENS: Record<string, string> = {
  denonciation_ouverte: "/denonciations",
  litige_a_trancher: "/litiges",
  alerte_signalement: "/billets",
  signalement_trajet: "/billets",
  fausse_arrivee: "/billets",
};

// Un filtre par cas de figure. « Autres » ramasse tout type qui n'entre
// dans aucun des cas nommés, pour que rien ne disparaisse de la vue.
const FILTRES: { cle: string; label: string; types?: string[] }[] = [
  { cle: "toutes", label: "Toutes" },
  { cle: "non_lues", label: "Non lues" },
  { cle: "contact", label: "Messages de voyageurs", types: ["contact_voyageur"] },
  { cle: "denonciations", label: "Dénonciations", types: ["denonciation_ouverte"] },
  { cle: "litiges", label: "Litiges à trancher", types: ["litige_a_trancher"] },
  { cle: "signalements", label: "Signalements", types: ["signalement_trajet", "alerte_signalement"] },
  { cle: "fausse_arrivee", label: "Fausses arrivées", types: ["fausse_arrivee"] },
  { cle: "autres", label: "Autres" },
];
const TYPES_CONNUS = new Set(FILTRES.flatMap((f) => f.types ?? []));

function correspond(n: Notif, cle: string): boolean {
  if (cle === "toutes") return true;
  if (cle === "non_lues") return !n.lu;
  if (cle === "autres") return !TYPES_CONNUS.has(n.type);
  return FILTRES.find((f) => f.cle === cle)?.types?.includes(n.type) ?? false;
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState("toutes");

  const charger = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/notifications");
      setNotifs(res.notifications || []);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger les notifications.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  async function toutLire() {
    try {
      await apiFetch("/api/admin/notifications/lues", { method: "PUT" });
      setNotifs((l) => l.map((n) => ({ ...n, lu: true })));
      window.dispatchEvent(new Event("jego-notifications-lues"));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur");
    }
  }

  const nonLues = notifs.filter((n) => !n.lu).length;
  const affichees = notifs.filter((n) => correspond(n, filtre));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Notifications</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">
            {chargement ? "Chargement…" : nonLues > 0 ? `${nonLues} non lue(s)` : "Tout est lu"}
          </div>
        </div>
        {nonLues > 0 && <BtnMini variant="primary" onClick={toutLire}>Tout marquer comme lu</BtnMini>}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTRES.map((f) => {
          const nombre = notifs.filter((n) => correspond(n, f.cle)).length;
          const actif = filtre === f.cle;
          return (
            <button
              key={f.cle}
              onClick={() => setFiltre(f.cle)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${actif ? "bg-green-700 text-white" : "bg-paper border border-line text-ink-soft"}`}
            >
              {f.label} ({nombre})
            </button>
          );
        })}
      </div>

      {erreur && <p className="mb-3 text-[13px] text-red font-medium">{erreur}</p>}

      <Panel>
        {!chargement && affichees.length === 0 ? (
          <div className="px-5 py-10 text-center text-ink-soft text-[13px]">
            {notifs.length === 0 ? "Aucune notification" : "Aucune notification pour ce filtre"}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {affichees.map((n) => {
              const lien = LIENS[n.type];
              return (
                <div key={n.id} className={`px-[18px] py-3.5 ${n.lu ? "" : "bg-green-700/5"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-[13px] ${n.lu ? "font-medium" : "font-bold"}`}>{n.titre || "Notification"}</p>
                    <span className="text-[11px] text-ink-soft font-mono whitespace-nowrap">
                      {new Date(n.cree_le).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-ink-soft mt-1 whitespace-pre-line">{n.contenu}</p>
                  {lien && <Link href={lien} className="text-[11.5px] font-semibold text-green-700 mt-1 inline-block">Ouvrir →</Link>}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
