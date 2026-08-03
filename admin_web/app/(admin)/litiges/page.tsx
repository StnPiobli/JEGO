"use client";

// ✅ BRANCHÉ (GET /api/litiges/admin/tous), REPLI DÉMO si injoignable.
// ⚠️ Flux volontairement changé par rapport à un système niveau1→2→3 :
// tous les litiges arrivent directement ici, actionnables immédiatement
// (le backend n'exige déjà aucune réponse d'agence avant que l'admin tranche —
// vérifié dans litigeController.js, "sans effet automatique").
// ⚠️ IMPORTANT : trancherLitige() n'a AUCUN effet automatique sur l'argent —
// "en faveur du client" ici ne déclenche aucun vrai remboursement tant que
// cette logique n'existe pas côté backend. C'est un vrai développement à faire,
// pas juste un réglage d'interface.

import { useEffect, useState } from "react";
import { Panel, Badge, BtnMini } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import DateNav from "@/components/DateNav";
import HistoriqueButton from "@/components/HistoriqueButton";
import TypeToConfirm from "@/components/TypeToConfirm";

type Litige = {
  id: number | string; numero: string; motif: string; description: string;
  statut: string; niveau: number; reponse_agence: string | null; cree_le: string;
  nom_agence: string; nom_voyageur: string; prenom_voyageur: string;
  // ⚠️ Champs suivants absents de la vraie réponse API actuelle
  // (litigesAdmin() ne les sélectionne pas) — undefined si branché en vrai.
  telephone_voyageur?: string; email_voyageur?: string;
  trajet_nom?: string; trajet_date?: string;
};

const demoLitiges: Litige[] = [
  { id: "demo-1", numero: "LIT-DEMO-001", motif: "Conduite dangereuse", description: "Le chauffeur roulait dangereusement, dépassements répétés.", statut: "ouvert", niveau: 1, reponse_agence: null, cree_le: new Date(Date.now() - 26 * 3600 * 1000).toISOString(), nom_agence: "Touristique Express", nom_voyageur: "Dupont", prenom_voyageur: "Jean", telephone_voyageur: "+237 6 77 xx xx 12", email_voyageur: "j.dupont@gmail.com", trajet_nom: "Douala → Yaoundé", trajet_date: "15 jan. 2026, 07h00" },
  { id: "demo-2", numero: "LIT-DEMO-002", motif: "Retard sans annonce", description: "Bus parti avec 1h30 de retard sans annonce.", statut: "en_cours", niveau: 2, reponse_agence: "Retard annoncé dans l'app 20 min avant.", cree_le: new Date(Date.now() - 10 * 3600 * 1000).toISOString(), nom_agence: "Nuit Express", nom_voyageur: "Bello", prenom_voyageur: "Aïcha", telephone_voyageur: "+237 6 90 xx xx 45", email_voyageur: "aicha.bello@yahoo.fr", trajet_nom: "Yaoundé → Bertoua", trajet_date: "15 jan. 2026, 21h00" },
  { id: "demo-3", numero: "LIT-DEMO-003", motif: "Bagage endommagé", description: "Valise abîmée à l'arrivée.", statut: "ouvert", niveau: 1, reponse_agence: null, cree_le: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), nom_agence: "Général Voyages", nom_voyageur: "Mbida", prenom_voyageur: "Franck", telephone_voyageur: "+237 6 55 xx xx 88", email_voyageur: "f.mbida@outlook.com", trajet_nom: "Douala → Kribi", trajet_date: "14 jan. 2026, 15h30" },
];

export default function LitigesPage() {
  const [litiges, setLitiges] = useState<Litige[]>([]);
  const [chargement, setChargement] = useState(true);
  const [modeDemo, setModeDemo] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [ouvertId, setOuvertId] = useState<string | number | null>(null);
  const [camp, setCamp] = useState<"agence" | "client" | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState<string | number | null>(null);

  async function charger() {
    setChargement(true);
    setErreur(null);
    try {
      const data = await apiFetch("/api/litiges/admin/tous");
      setLitiges(data.litiges);
      setModeDemo(false);
    } catch {
      setLitiges(demoLitiges);
      setModeDemo(true);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { charger(); }, []);

  function choisirCamp(id: string | number, c: "agence" | "client") {
    setOuvertId(id);
    setCamp(c);
    setCommentaire("");
  }

  async function trancher(l: Litige) {
    if (!camp) return;
    const gagnant = camp === "agence" ? l.nom_agence : `${l.prenom_voyageur} ${l.nom_voyageur}`;
    const perdant = camp === "agence" ? `${l.prenom_voyageur} ${l.nom_voyageur}` : l.nom_agence;
    if (!commentaire.trim()) { setErreur(`Explique à ${perdant} pourquoi il/elle n'a pas eu gain de cause`); return; }

    const decisionTexte = `En faveur de ${camp === "agence" ? "l'agence" : "du client"}. Raison communiquée au perdant : ${commentaire}`;
    setEnvoiEnCours(l.id);
    try {
      if (modeDemo) {
        setLitiges((prev) => prev.filter((x) => x.id !== l.id));
      } else {
        await apiFetch(`/api/litiges/${l.id}/decision`, { method: "PUT", body: JSON.stringify({ decision: decisionTexte }) });
        await charger();
      }
      setOuvertId(null);
      setCamp(null);
      setCommentaire("");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la décision");
    } finally {
      setEnvoiEnCours(null);
    }
    void gagnant;
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Litiges</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">{litiges.length} litige(s) — tous arrivent directement ici pour arbitrage</div>
        </div>
        <HistoriqueButton label="Historique des décisions" entrees={[
          { heure: "11:20", action: "LIT-0065 tranché en faveur du client", auteur: "s.piobli" },
          { heure: "hier 09:10", action: "LIT-0058 tranché en faveur de l'agence", auteur: "s.piobli" },
        ]} />
      </div>
      <div className="mb-4"><DateNav date={date} onChange={setDate} /></div>

      {modeDemo && <div className="text-xs font-semibold text-amber bg-amber-bg rounded-lg px-3 py-2 mb-4">Mode démo — backend injoignable, litiges factices</div>}
      {erreur && <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>}

      {chargement ? (
        <div className="text-ink-soft text-sm">Chargement…</div>
      ) : litiges.length === 0 ? (
        <Panel><div className="px-5 py-10 text-center text-ink-soft text-[13px]">Aucun litige en cours</div></Panel>
      ) : (
        <div className="max-h-[560px] overflow-y-auto space-y-3">
          {litiges.map((l) => (
            <Panel key={l.id}>
              <div className="px-[18px] py-3.5">
                <div className="flex justify-between items-start">
                  <div>
                    <b className="font-mono text-xs">{l.numero}</b>
                    <span className="text-[11px] text-ink-soft ml-2">{l.nom_agence} · {l.prenom_voyageur} {l.nom_voyageur}</span>
                  </div>
                  {l.reponse_agence && <Badge color="amber">L&apos;agence a répondu</Badge>}
                </div>
                <p className="text-[13px] mt-2 mb-1"><b>Motif :</b> {l.motif}</p>
                <p className="text-[13px] text-ink-soft mb-1">{l.description}</p>
                {l.reponse_agence && <p className="text-[13px] text-ink-soft italic mb-2">Réponse agence : {l.reponse_agence}</p>}

                <div className="grid grid-cols-2 gap-3 mt-2 mb-2 text-[12px]">
                  <div className="border border-line rounded-lg px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-ink-soft mb-1">Plaignant</div>
                    <div className="font-semibold">{l.prenom_voyageur} {l.nom_voyageur}</div>
                    <div className="font-mono text-ink-soft">{l.telephone_voyageur ?? "non fourni par l'API"}</div>
                    <div className="text-ink-soft">{l.email_voyageur ?? "non fourni par l'API"}</div>
                  </div>
                  <div className="border border-line rounded-lg px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-ink-soft mb-1">Trajet concerné</div>
                    <div className="font-semibold">{l.trajet_nom ?? "non fourni par l'API"}</div>
                    <div className="text-ink-soft font-mono">{l.trajet_date ?? "—"}</div>
                    <div className="text-ink-soft">Agence : {l.nom_agence}</div>
                  </div>
                </div>

                {ouvertId === l.id ? (
                  <div className="mt-3 pt-3 border-t border-dashed border-line">
                    <div className="text-[12.5px] font-semibold mb-2">
                      Décision : en faveur {camp === "agence" ? "de l'agence" : "du client"}
                    </div>
                    <label className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">
                      Raison envoyée à {camp === "agence" ? `${l.prenom_voyageur} ${l.nom_voyageur}` : l.nom_agence} (le perdant — le gagnant reçoit juste "vous avez gagné")
                    </label>
                    <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-line bg-transparent text-sm mb-2" rows={2} />
                    <TypeToConfirm
                      titre="Confirmer cette décision ?"
                      message="Cette décision est notifiée aux deux parties et ne peut pas être annulée."
                      mot="trancher"
                      onConfirm={() => trancher(l)}
                      trigger={(open) => (
                        <BtnMini variant="primary" onClick={open}>
                          {envoiEnCours === l.id ? "…" : "Confirmer la décision"}
                        </BtnMini>
                      )}
                    />
                    <BtnMini onClick={() => { setOuvertId(null); setCamp(null); }}>Annuler</BtnMini>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-1.5">
                    <BtnMini variant="primary" onClick={() => choisirCamp(l.id, "agence")}>En faveur de l&apos;agence</BtnMini>
                    <BtnMini variant="primary" onClick={() => choisirCamp(l.id, "client")}>En faveur du client</BtnMini>
                  </div>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
