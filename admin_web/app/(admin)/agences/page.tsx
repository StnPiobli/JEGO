"use client";

// ✅ BRANCHÉ SUR LE VRAI BACKEND
// GET  /api/admin/agences-en-attente
// PUT  /api/admin/agences/:id/valider
// PUT  /api/admin/agences/:id/refuser   (motif obligatoire)
//
// ⚠️ Champs volontairement limités à ce que l'API renvoie vraiment :
// nom, email, telephone, adresse, ville, registre_commerce, cree_le.
// Pas de représentant légal séparé, pas de documents à vérifier, pas de
// flotte déclarée — ces champs n'existent pas dans adminController.js
// pour l'instant. Si tu veux les afficher un jour, il faut d'abord les
// ajouter côté backend (table agences + le SELECT dans agencesEnAttente).

import { useEffect, useState } from "react";
import { Topbar, Panel, BtnMini } from "@/components/ui";
import { apiFetch } from "@/lib/api";

type Agence = {
  id: number;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  registre_commerce: string;
  cree_le: string;
};

export default function AgencesPage() {
  const [agences, setAgences] = useState<Agence[]>([]);
  const [selection, setSelection] = useState<Agence | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [actionEnCours, setActionEnCours] = useState(false);

  async function charger() {
    setChargement(true);
    setErreur(null);
    try {
      const data = await apiFetch("/api/admin/agences-en-attente");
      setAgences(data.agences);
      setSelection(data.agences[0] || null);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  async function valider(id: number) {
    setActionEnCours(true);
    try {
      await apiFetch(`/api/admin/agences/${id}/valider`, { method: "PUT" });
      await charger();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur de validation");
    } finally {
      setActionEnCours(false);
    }
  }

  async function refuser(id: number) {
    if (!motifRefus.trim()) {
      setErreur("Le motif de refus est obligatoire");
      return;
    }
    setActionEnCours(true);
    try {
      await apiFetch(`/api/admin/agences/${id}/refuser`, {
        method: "PUT",
        body: JSON.stringify({ motif: motifRefus }),
      });
      setMotifRefus("");
      await charger();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur de refus");
    } finally {
      setActionEnCours(false);
    }
  }

  return (
    <div>
      <Topbar title="Agences" subtitle={`${agences.length} agence(s) en attente de validation`} />

      {erreur && (
        <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>
      )}

      {chargement ? (
        <div className="text-ink-soft text-sm">Chargement…</div>
      ) : agences.length === 0 ? (
        <Panel>
          <div className="px-5 py-10 text-center text-ink-soft text-[13px]">
            Aucune agence en attente de validation
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-[1.4fr_1fr] gap-4">
          <Panel title="Dossiers en attente">
            <table className="w-full">
              <tbody>
                {agences.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelection(a)}
                    className={`border-t border-line first:border-t-0 cursor-pointer hover:bg-green-500/5 ${
                      selection?.id === a.id ? "bg-green-500/10" : ""
                    }`}
                  >
                    <td className="px-[18px] py-3 text-[13px]">
                      <b>{a.nom}</b>
                      <br />
                      <span className="text-ink-soft text-[11.5px]">
                        {a.ville} · inscrite le {new Date(a.cree_le).toLocaleDateString("fr-FR")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {selection && (
            <Panel title={`Dossier — ${selection.nom}`}>
              <div className="px-[18px] py-4">
                <div className="kv"><span>Email</span><span className="font-semibold">{selection.email}</span></div>
                <div className="kv"><span>Téléphone</span><span className="font-semibold">{selection.telephone}</span></div>
                <div className="kv"><span>Adresse</span><span className="font-semibold">{selection.adresse}</span></div>
                <div className="kv"><span>Ville</span><span className="font-semibold">{selection.ville}</span></div>
                <div className="kv"><span>Registre de commerce</span><span className="font-mono font-semibold">{selection.registre_commerce}</span></div>

                <div className="mt-4">
                  <BtnMini variant="primary" onClick={() => !actionEnCours && valider(selection.id)}>
                    ✅ Valider l&apos;agence
                  </BtnMini>
                </div>

                <div className="mt-4 pt-4 border-t border-dashed border-line">
                  <label className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">
                    Motif de refus (obligatoire pour refuser)
                  </label>
                  <textarea
                    value={motifRefus}
                    onChange={(e) => setMotifRefus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-line text-sm mb-2"
                    rows={2}
                  />
                  <BtnMini variant="danger" onClick={() => !actionEnCours && refuser(selection.id)}>
                    Refuser
                  </BtnMini>
                </div>
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
