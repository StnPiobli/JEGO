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


export default function LitigesPage() {
  const [litiges, setLitiges] = useState<Litige[]>([]);
  const [chargement, setChargement] = useState(true);
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
      setLitiges(data.litiges || []);
    } catch (err) {
      setLitiges([]);
      setErreur(err instanceof Error ? err.message : "Impossible de charger les litiges.");
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
      await apiFetch(`/api/litiges/${l.id}/decision`, {
        method: "PUT",
        body: JSON.stringify({
          decision: decisionTexte,
          gagnant: camp === "agence" ? "agence" : "voyageur",
        }),
      });
      await charger();
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
        <HistoriqueButton label="Historique des décisions" entrees={[]} />
      </div>
      <div className="mb-4"><DateNav date={date} onChange={setDate} /></div>

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
