"use client";
// ⚠️ DEMO — Supprimer/Conserver/Ignorer retirent la ligne (état local) + navigateur de date.

import { useState } from "react";
import { Panel, Badge, BtnMini, ToastDemo } from "@/components/ui";
import DateNav from "@/components/DateNav";
import HistoriqueButton from "@/components/HistoriqueButton";

type Commentaire = {
  id: number; texte: string; auteur: string; agence: string;
  motif: string; color: "red" | "amber" | "grey"; primaryDanger: boolean;
};

const initial: Commentaire[] = [
  { id: 1, texte: "« Chauffeur imb*** roulait comme un fou, plus jamais cette agence »", auteur: "Franck M.", agence: "Nuit Express", motif: "Filtre automatique", color: "red", primaryDanger: true },
  { id: 2, texte: "« Bus toujours en retard, agence à éviter »", auteur: "Aïcha B.", agence: "Rapid'Bus Cameroun", motif: "Signalé par l'agence", color: "amber", primaryDanger: false },
  { id: 3, texte: "« Numéro de téléphone du chauffeur : 6XX XXX XXX, contactez-le direct »", auteur: "Jean D.", agence: "Touristique Express", motif: "Filtre automatique — données perso", color: "red", primaryDanger: true },
  { id: 4, texte: "« Service correct mais siège 12B cassé »", auteur: "Marc A.", agence: "Général Voyages", motif: "Signalé — faux positif probable", color: "grey", primaryDanger: false },
];

export default function ModerationPage() {
  const [commentaires, setCommentaires] = useState(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());

  function traiter(id: number, action: string) {
    setCommentaires((prev) => prev.filter((c) => c.id !== id));
    setToast(`Commentaire ${action.toLowerCase()} (démo)`);
    setTimeout(() => setToast(null), 2000);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Modération</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">{commentaires.length} commentaire(s) signalé(s) — démo</div>
        </div>
        <HistoriqueButton label="Historique de modération" entrees={[
          { heure: "09:45", action: "Commentaire supprimé — données personnelles", auteur: "s.piobli" },
          { heure: "hier 20:12", action: "Commentaire conservé — signalement rejeté", auteur: "s.piobli" },
        ]} />
      </div>
      <div className="mb-4"><DateNav date={date} onChange={setDate} /></div>

      <Panel>
        {commentaires.length === 0 ? (
          <div className="px-5 py-10 text-center text-ink-soft text-[13px]">File de modération vide — tout a été traité</div>
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
      <ToastDemo message={toast} />
    </div>
  );
}
