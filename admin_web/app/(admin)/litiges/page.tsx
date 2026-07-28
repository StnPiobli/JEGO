"use client";

// ✅ BRANCHÉ SUR LE VRAI BACKEND
// GET /api/litiges/admin/tous       — tous les litiges non résolus
// PUT /api/litiges/:id/decision     — { decision } — décision finale (niveau 3)
//
// ⚠️ Pas de champ de deadline stocké en base pour les 48h de réponse agence —
// calculé ici côté client à partir de cree_le (niveau 1 uniquement, la
// deadline n'a plus de sens une fois que l'agence a répondu, niveau ≥ 2).

import { useEffect, useState } from "react";
import { Topbar, Panel, Badge, BtnMini } from "@/components/ui";
import { apiFetch } from "@/lib/api";

type Litige = {
  id: number;
  numero: string;
  motif: string;
  description: string;
  statut: string;
  niveau: number;
  reponse_agence: string | null;
  cree_le: string;
  nom_agence: string;
  nom_voyageur: string;
  prenom_voyageur: string;
};

function heuresRestantes(creeLe: string): number {
  const deadline = new Date(creeLe).getTime() + 48 * 60 * 60 * 1000;
  return Math.max(0, Math.round((deadline - Date.now()) / (60 * 60 * 1000)));
}

export default function LitigesPage() {
  const [litiges, setLitiges] = useState<Litige[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<number, string>>({});
  const [envoiEnCours, setEnvoiEnCours] = useState<number | null>(null);

  async function charger() {
    setChargement(true);
    setErreur(null);
    try {
      const data = await apiFetch("/api/litiges/admin/tous");
      setLitiges(data.litiges);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  async function trancher(id: number) {
    const decision = decisions[id];
    if (!decision || !decision.trim()) {
      setErreur("La décision est obligatoire avant de trancher");
      return;
    }
    setEnvoiEnCours(id);
    try {
      await apiFetch(`/api/litiges/${id}/decision`, {
        method: "PUT",
        body: JSON.stringify({ decision }),
      });
      await charger();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la décision");
    } finally {
      setEnvoiEnCours(null);
    }
  }

  const niveau1 = litiges.filter((l) => l.niveau === 1);
  const niveau2 = litiges.filter((l) => l.niveau === 2);
  const niveau3plus = litiges.filter((l) => l.niveau >= 3);

  return (
    <div>
      <Topbar title="Litiges" subtitle={`${litiges.length} litige(s) non résolu(s) — flux réel niveau 1 → 2 → 3`} />

      {erreur && <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>}

      {chargement ? (
        <div className="text-ink-soft text-sm">Chargement…</div>
      ) : (
        <div className="grid grid-cols-[1.4fr_1fr] gap-4">
          <Panel title={`Niveau 2 — en attente de ton arbitrage (${niveau2.length})`}>
            {niveau2.length === 0 ? (
              <div className="px-5 py-8 text-center text-ink-soft text-[12.5px]">
                Aucun litige au niveau 2 pour l&apos;instant
              </div>
            ) : (
              <div className="px-[18px] py-3.5 space-y-3">
                {niveau2.map((l) => (
                  <div key={l.id} className="border border-line rounded-xl p-3.5">
                    <div className="flex justify-between">
                      <b className="font-mono text-xs">{l.numero}</b>
                      <span className="text-[11px] text-ink-soft">
                        {l.nom_agence} · {l.prenom_voyageur} {l.nom_voyageur}
                      </span>
                    </div>
                    <p className="text-[13px] mt-2.5 mb-1">
                      <b>Motif :</b> {l.motif}
                    </p>
                    <p className="text-[13px] text-ink-soft mb-1">{l.description}</p>
                    {l.reponse_agence && (
                      <p className="text-[13px] text-ink-soft mb-2 italic">
                        Réponse agence : {l.reponse_agence}
                      </p>
                    )}
                    <textarea
                      placeholder="Ta décision finale…"
                      value={decisions[l.id] || ""}
                      onChange={(e) => setDecisions({ ...decisions, [l.id]: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-line text-sm mb-2"
                      rows={2}
                    />
                    <BtnMini variant="primary" onClick={() => envoiEnCours !== l.id && trancher(l.id)}>
                      {envoiEnCours === l.id ? "…" : "Trancher"}
                    </BtnMini>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <div className="space-y-4">
            <Panel title={`Niveau 1 — en attente de réponse agence (${niveau1.length})`}>
              {niveau1.length === 0 ? (
                <div className="px-5 py-6 text-center text-ink-soft text-[12.5px]">Aucun</div>
              ) : (
                <table className="w-full">
                  <tbody>
                    {niveau1.map((l) => {
                      const h = heuresRestantes(l.cree_le);
                      return (
                        <tr key={l.id} className="border-t border-line first:border-t-0">
                          <td className="px-[18px] py-3 text-[13px]">
                            {l.numero}
                            <br />
                            <span className="text-ink-soft text-[11.5px]">{l.motif} — {l.nom_agence}</span>
                          </td>
                          <td className="px-[18px] py-3">
                            <Badge color={h < 12 ? "red" : h < 24 ? "amber" : "green"}>
                              {h}h restantes
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Panel>

            {niveau3plus.length > 0 && (
              <Panel title={`Autres (niveau ≥ 3) — ${niveau3plus.length}`}>
                <div className="px-5 py-4 text-[12.5px] text-ink-soft">
                  Statut inattendu pour des litiges déjà tranchés — vérifie le filtre backend.
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
