"use client";
// ⚠️ DEMO — trajets, passagers, signalements factices. Aucune vue agrégée
// par trajet (passagers + moyens de paiement) n'a été vérifiée côté backend.

import { useState } from "react";
import { Panel, Badge, ExpandableCard, BtnMini } from "@/components/ui";
import DateNav from "@/components/DateNav";
import HistoriqueButton from "@/components/HistoriqueButton";

type Passager = {
  nom: string; tel: string; siege: string;
  vente: "app" | "site";
  paiement: string | null; // null si vente sur site
  origine: "Acheté" | "Billet cadeau";
  trajetAssocie: string; // tronçon réellement réservé, un trajet à arrêts peut vendre plusieurs tronçons séparément
};

type Signalement = { passager: string; motif: string; heure: string };

type Trajet = {
  id: number; trajet: string; agence: string; depart: string; arrivee: string;
  occ: string; statut: string; color: "green" | "amber" | "grey";
  app: number; site: number;
  signalements: Signalement[];
  passagers: Passager[];
};

const trajets: Trajet[] = [
  {
    id: 401, trajet: "Douala → Loum → Yaoundé", agence: "Touristique Express", depart: "07h00", arrivee: "12h30",
    occ: "29/32", statut: "En cours", color: "green", app: 22, site: 7,
    signalements: [],
    passagers: [
      { nom: "Jean Dupont", tel: "+237 6 77 xx xx 12", siege: "4A", vente: "app", paiement: "MTN Mobile Money", origine: "Acheté", trajetAssocie: "Douala → Yaoundé" },
      { nom: "Sandrine Kamga", tel: "+237 6 82 xx xx 07", siege: "4B", vente: "app", paiement: "Orange Money", origine: "Billet cadeau", trajetAssocie: "Douala → Loum" },
      { nom: "Passager guichet", tel: "—", siege: "7C", vente: "site", paiement: null, origine: "Acheté", trajetAssocie: "Loum → Yaoundé" },
    ],
  },
  {
    id: 402, trajet: "Yaoundé → Bertoua", agence: "Nuit Express", depart: "21h00", arrivee: "02h15",
    occ: "18/32", statut: "Retard déclaré +45min", color: "amber", app: 12, site: 6,
    signalements: [
      { passager: "Aïcha Bello", motif: "Chauffeur roule trop vite", heure: "21h40" },
      { passager: "Anonyme", motif: "Bus non climatisé", heure: "21h52" },
      { passager: "Franck Mbida", motif: "Chauffeur roule trop vite", heure: "22h05" },
    ],
    passagers: [
      { nom: "Aïcha Bello", tel: "+237 6 90 xx xx 45", siege: "2A", vente: "app", paiement: "MTN Mobile Money", origine: "Acheté", trajetAssocie: "Yaoundé → Bertoua" },
      { nom: "Franck Mbida", tel: "+237 6 55 xx xx 88", siege: "2B", vente: "app", paiement: "Orange Money", origine: "Acheté", trajetAssocie: "Yaoundé → Bertoua" },
      { nom: "Passager guichet", tel: "—", siege: "9D", vente: "site", paiement: null, origine: "Acheté", trajetAssocie: "Yaoundé → Bertoua" },
    ],
  },
  {
    id: 403, trajet: "Bafoussam → Douala", agence: "Voyages Étoile du Sud", depart: "06h30", arrivee: "11h00",
    occ: "—", statut: "À venir", color: "grey", app: 0, site: 0,
    signalements: [],
    passagers: [],
  },
];

type Tri = "recent" | "ancien";

export default function BilletsPage() {
  const [date, setDate] = useState(new Date());
  const [tri, setTri] = useState<Tri>("recent");
  const [depliés, setDepliés] = useState<Set<number>>(new Set());
  const [signalementsOuvert, setSignalementsOuvert] = useState<number | null>(null);

  function toggleDeplier(id: number) {
    setDepliés((prev) => {
      const copie = new Set(prev);
      copie.has(id) ? copie.delete(id) : copie.add(id);
      return copie;
    });
  }

  const trajetsTries = [...trajets].sort((a, b) =>
    tri === "recent" ? b.id - a.id : a.id - b.id
  );

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Billets & trajets</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Vue globale, toutes agences — démo</div>
        </div>
        <HistoriqueButton entrees={[
          { heure: "09:30", action: "Retard déclaré — Nuit Express, Yaoundé→Bertoua", auteur: "système" },
          { heure: "07:00", action: "Trajet démarré — Touristique Express, Douala→Yaoundé", auteur: "système" },
        ]} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button onClick={() => setTri("recent")} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${tri === "recent" ? "bg-green-700 text-white border-green-700" : "border-line text-ink-soft"}`}>+ récent</button>
          <button onClick={() => setTri("ancien")} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${tri === "ancien" ? "bg-green-700 text-white border-green-700" : "border-line text-ink-soft"}`}>− récent</button>
        </div>
        <DateNav date={date} onChange={setDate} />
      </div>

      <div className="grid grid-cols-4 gap-3.5 mb-4">
        <ExpandableCard num="341" label="Trajets programmés — 7 prochains jours" delta={{ text: "6% vs semaine dernière", up: true }}>
          <table className="w-full text-[12px]"><tbody>
            <tr><td className="py-1">Douala → Yaoundé</td><td className="py-1 text-right font-mono">48 trajets</td></tr>
            <tr><td className="py-1">Yaoundé → Bertoua</td><td className="py-1 text-right font-mono">21 trajets</td></tr>
          </tbody></table>
        </ExpandableCard>
        <ExpandableCard num="78%" label="Taux de remplissage moyen" delta={{ text: "3% vs semaine dernière", up: true }}>
          <div className="text-[11px] text-ink-soft">
            <b>Vendus via l&apos;app JEGO :</b> 254 (67%) · <b>vendus au guichet :</b> 125 (33%)
            <div className="mt-0.5 italic">Le guichet ne compte pas dans le revenu JEGO (pas de commission).</div>
          </div>
        </ExpandableCard>
        <ExpandableCard num="18" label="Agences avec programme < 2 semaines ⚠️" delta={{ text: "2 de plus que la semaine dernière", up: false }}>
          <table className="w-full text-[12px]"><tbody>
            <tr><td className="py-1">Général Voyages</td><td className="py-1 text-right font-mono">9 jours restants</td></tr>
          </tbody></table>
        </ExpandableCard>
        <ExpandableCard num="6" label="Trajets retardés aujourd'hui" delta={{ text: "1 de moins qu'hier", up: true }}>
          <table className="w-full text-[12px]"><tbody>
            <tr><td className="py-1">Nuit Express — Yaoundé→Bertoua</td><td className="py-1 text-right font-mono">+45 min</td></tr>
          </tbody></table>
        </ExpandableCard>
      </div>

      <div className="space-y-3">
        {trajetsTries.map((t) => (
          <Panel key={t.id}>
            <div className="px-[18px] py-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <button onClick={() => toggleDeplier(t.id)} className="text-left">
                    <span className="text-ink-soft text-xs mr-1">{depliés.has(t.id) ? "▲" : "▼"}</span>
                    <b className="text-[13.5px]">{t.trajet}</b>
                  </button>
                  <div className="text-[11.5px] text-ink-soft mt-0.5">
                    {t.agence} · {date.toLocaleDateString("fr-FR")} {t.depart} → arrivée prévue {t.arrivee} · {t.occ}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.signalements.length > 0 ? (
                    <BtnMini variant="danger" onClick={() => setSignalementsOuvert(t.id)}>⚠️ {t.signalements.length} signalement(s)</BtnMini>
                  ) : (
                    <span className="text-ink-soft text-[12px]">Aucun signalement</span>
                  )}
                  <Badge color={t.color}>{t.statut}</Badge>
                </div>
              </div>

              {depliés.has(t.id) && (
                <div className="mt-3 pt-3 border-t border-dashed border-line">
                  <div className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-2">
                    Passagers ({t.passagers.length}) — {t.app} app · {t.site} guichet
                  </div>
                  {t.passagers.length === 0 ? (
                    <div className="text-[12.5px] text-ink-soft italic">Aucun passager pour l&apos;instant</div>
                  ) : (
                    <div className="max-h-[240px] overflow-y-auto">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr>{["Passager", "Téléphone", "Siège", "Vente", "Paiement", "Type", "Trajet associé"].map((h) => <th key={h} className="text-left text-[10px] uppercase tracking-wide text-ink-soft py-1.5 pr-3">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {t.passagers.map((p, i) => (
                            <tr key={i} className="border-t border-line">
                              <td className="py-1.5 pr-3">{p.nom}</td>
                              <td className="py-1.5 pr-3 font-mono">{p.tel}</td>
                              <td className="py-1.5 pr-3 font-mono">{p.siege}</td>
                              <td className="py-1.5 pr-3">
                                <Badge color={p.vente === "app" ? "green" : "grey"}>{p.vente === "app" ? "App JEGO" : "Guichet"}</Badge>
                              </td>
                              <td className="py-1.5 pr-3">{p.paiement ?? "—"}</td>
                              <td className="py-1.5 pr-3">
                                <Badge color={p.origine === "Billet cadeau" ? "purple" : "grey"}>{p.origine}</Badge>
                              </td>
                              <td className="py-1.5 pr-3 text-purple font-semibold">{p.trajetAssocie}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Panel>
        ))}
      </div>

      {signalementsOuvert !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setSignalementsOuvert(null)}>
          <div className="bg-paper rounded-2xl shadow-card p-6 w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-display text-[15px] font-semibold">Signalements — {trajets.find((t) => t.id === signalementsOuvert)?.trajet}</h3>
              <button onClick={() => setSignalementsOuvert(null)} className="text-ink-soft text-xs">✕</button>
            </div>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {trajets.find((t) => t.id === signalementsOuvert)?.signalements.map((s, i) => (
                <div key={i} className="border border-line rounded-lg px-3 py-2 text-[12.5px]">
                  <div className="flex justify-between"><b>{s.passager}</b><span className="text-ink-soft font-mono text-[11px]">{s.heure}</span></div>
                  <div className="text-ink-soft mt-0.5">{s.motif}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="text-[11px] text-ink-soft mt-3">
        ⚠️ Signalements — démo. La route existante (<code>signalementRoutes.js</code>) gère l&apos;ouverture, mais aucune vue agrégée par trajet pour l&apos;admin n&apos;a été vérifiée côté backend.
      </div>
    </div>
  );
}
