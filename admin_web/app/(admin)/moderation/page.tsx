"use client";
// PRÊT À BRANCHER — file de modération des commentaires signalés.
// Routes attendues :
//   GET /api/admin/moderation?date=YYYY-MM-DD
//     → { commentaires: [{ id, texte, auteur, agence, motif, color, primaryDanger }] }
//   PUT /api/admin/moderation/:id  body { action: "supprimer" | "conserver" | "ignorer" }

import { useEffect, useState } from "react";
import { Panel, Badge, BtnMini, Toast } from "@/components/ui";
import DateNav from "@/components/DateNav";
import HistoriqueButton from "@/components/HistoriqueButton";
import { apiFetch } from "@/lib/api";

type Commentaire = {
  id: string; texte: string; auteur: string; agence: string;
  motif: string; color: "red" | "amber" | "grey"; primaryDanger: boolean;
};

export default function ModerationPage() {
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    let annule = false;
    async function charger() {
      setChargement(true);
      try {
        const res = await apiFetch(`/api/admin/moderation?date=${date.toISOString().slice(0, 10)}`);
        if (!annule) setCommentaires(res.commentaires || []);
        if (!annule) setErreur(null);
      } catch (e) {
        if (!annule) setErreur(e instanceof Error ? e.message : "Impossible de charger la file de modération.");
      } finally {
        if (!annule) setChargement(false);
      }
    }
    charger();
    return () => { annule = true; };
  }, [date]);

  async function traiter(id: string, action: string) {
    try {
      await apiFetch(`/api/admin/moderation/${id}`, {
        method: "PUT",
        body: JSON.stringify({ action: action.toLowerCase() }),
      });
      setCommentaires((prev) => prev.filter((c) => c.id !== id));
      setToast(`Commentaire ${action.toLowerCase()}`);
      setTimeout(() => setToast(null), 2000);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Erreur lors du traitement.");
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Modération</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">
            {chargement ? "Chargement…" : `${commentaires.length} commentaire(s) signalé(s)`}
          </div>
        </div>
        <HistoriqueButton label="Historique de modération" entrees={[]} />
      </div>
      <div className="mb-4"><DateNav date={date} onChange={setDate} /></div>

      <Panel>
        {erreur && <p className="px-[18px] py-4 text-[13px] text-red font-medium">{erreur}</p>}
        {!chargement && commentaires.length === 0 && !erreur ? (
          <div className="px-5 py-10 text-center text-ink-soft text-[13px]">File de modération vide — tout a été traité</div>
        ) : chargement ? (
          <div className="px-5 py-10 text-center text-ink-soft text-[13px]">Chargement…</div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
<table className="w-full">
            <thead><tr>{["Commentaire", "Auteur", "Agence visée", "Motif", ""].map((h) => <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {commentaires.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-[18px] py-2.5 text-[13px] max-w-[280px]">{c.texte}</td>
                  <td className="px-[18px] py-2.5 text-[13px]">{c.auteur}</td>
                  <td className="px-[18px] py-2.5 text-[13px]">{c.agence}</td>
                  <td className="px-[18px] py-2.5"><Badge color={c.color}>{c.motif}</Badge></td>
                  <td className="px-[18px] py-2.5 whitespace-nowrap">
                    {c.primaryDanger ? (
                      <><BtnMini variant="danger-primary" onClick={() => traiter(c.id, "Supprimé")}>Supprimer</BtnMini><BtnMini onClick={() => traiter(c.id, "Ignoré")}>Ignorer</BtnMini></>
                    ) : (
                      <><BtnMini variant="danger" onClick={() => traiter(c.id, "Supprimé")}>Supprimer</BtnMini><BtnMini variant="primary" onClick={() => traiter(c.id, "Conservé")}>Conserver</BtnMini></>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        )}
      </Panel>
      <Toast message={toast} />
    </div>
  );
}
