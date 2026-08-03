"use client";
// ⚠️ DEMO — état local uniquement.

import { useState } from "react";
import { Panel, Badge, BtnMini, ToastDemo } from "@/components/ui";
import HistoriqueButton from "@/components/HistoriqueButton";
import TypeToConfirm from "@/components/TypeToConfirm";

type Voyageur = {
  id: number; nom: string; tel: string; email: string; voyages: number; litiges: number;
  statut: "Actif" | "Banni commentaires";
};

const initial: Voyageur[] = [
  { id: 5001, nom: "Jean Dupont", tel: "+237 6 77 xx xx 12", email: "j.dupont@gmail.com", voyages: 14, litiges: 0, statut: "Actif" },
  { id: 5002, nom: "Aïcha Bello", tel: "+237 6 90 xx xx 45", email: "aicha.bello@yahoo.fr", voyages: 3, litiges: 1, statut: "Actif" },
  { id: 5003, nom: "Franck Mbida", tel: "+237 6 55 xx xx 88", email: "f.mbida@outlook.com", voyages: 9, litiges: 3, statut: "Banni commentaires" },
];

export default function VoyageursPage() {
  const [voyageurs, setVoyageurs] = useState(initial);
  const [recherche, setRecherche] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function toggleBan(id: number) {
    setVoyageurs((prev) => prev.map((v) => v.id === id ? { ...v, statut: v.statut === "Actif" ? "Banni commentaires" : "Actif" } : v));
    setToast("Statut mis à jour (démo)");
    setTimeout(() => setToast(null), 2000);
  }

  const filtres = voyageurs.filter((v) => v.nom.toLowerCase().includes(recherche.toLowerCase()));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Voyageurs</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">4 218 comptes actifs — démo, données en mémoire</div>
        </div>
        <HistoriqueButton label="Historique des actions" entrees={[
          { heure: "10:12", action: "Franck Mbida banni des commentaires", auteur: "s.piobli" },
          { heure: "hier 15:03", action: "Aïcha Bello réactivée", auteur: "s.piobli" },
        ]} />
      </div>
      <Panel
        title="Rechercher un voyageur"
        action={<input placeholder="Nom, téléphone, email…" value={recherche} onChange={(e) => setRecherche(e.target.value)} className="px-2.5 py-1.5 border border-line rounded-lg text-xs w-56 bg-transparent" />}
      >
        <div className="max-h-[420px] overflow-y-auto">
<table className="w-full">
          <thead>
            <tr>{["ID", "Voyageur", "Téléphone", "Email", "Voyages", "Litiges", "Statut", ""].map((h) => <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtres.map((v) => (
              <tr key={v.id} className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[12px] font-mono text-ink-soft">#{v.id}</td>
                <td className="px-[18px] py-2.5 text-[13px]"><b>{v.nom}</b></td>
                <td className="px-[18px] py-2.5 text-[13px] font-mono">{v.tel}</td>
                <td className="px-[18px] py-2.5 text-[12.5px]">{v.email}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{v.voyages}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{v.litiges}</td>
                <td className="px-[18px] py-2.5"><Badge color={v.statut === "Actif" ? "green" : "red"}>{v.statut}</Badge></td>
                <td className="px-[18px] py-2.5">
                  <TypeToConfirm
                    titre={v.statut === "Actif" ? `Bannir ${v.nom} des commentaires ?` : `Réactiver ${v.nom} ?`}
                    message={v.statut === "Actif" ? "Le compte ne pourra plus laisser de commentaires ni d'avis." : "Le compte pourra de nouveau laisser des commentaires."}
                    mot={v.statut === "Actif" ? "bannir" : "réactiver"}
                    danger={v.statut === "Actif"}
                    onConfirm={() => toggleBan(v.id)}
                    trigger={(open) => (
                      <BtnMini variant={v.statut === "Actif" ? "danger" : "primary"} onClick={open}>
                        {v.statut === "Actif" ? "Bannir" : "Réactiver"}
                      </BtnMini>
                    )}
                  />
                </td>
              </tr>
            ))}
            {filtres.length === 0 && <tr><td colSpan={8} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Aucun résultat</td></tr>}
          </tbody>
        </table>
</div>
      </Panel>
      <ToastDemo message={toast} />
    </div>
  );
}
