"use client";
// ⚠️ DEMO — grille éditable, dérogation ajoutable, tout en état local.

import { useState } from "react";
import { Panel, Badge, BtnMini, ToastDemo } from "@/components/ui";
import HistoriqueButton from "@/components/HistoriqueButton";
import TypeToConfirm from "@/components/TypeToConfirm";

type Derogation = { agence: string; commission: string; motif: string };

// ⚠️ DEMO — devrait normalement venir de la vraie liste d'agences validées
// (GET agences avec statut actif), pas d'une liste codée en dur ici.
const agencesValideesDemo = ["Touristique Express", "Nuit Express", "Général Voyages", "Voyages Étoile du Sud"];

export default function FraisPage() {
  const [grille, setGrille] = useState([
    { tranche: "0 – 3 000 FCFA", val: "7%" },
    { tranche: "3 001 – 8 000 FCFA", val: "7%" },
    { tranche: "8 001 FCFA et +", val: "6%" },
  ]);
  const [derogations, setDerogations] = useState<Derogation[]>([
    { agence: "Touristique Express", commission: "6%", motif: "Volume élevé — accord partenariat" },
  ]);
  const [fraisAnnexes, setFraisAnnexes] = useState([
    { label: "Frais de sélection de siège (part JEGO)", val: "200 F" },
    { label: "Majoration ticket flexible", val: "500 F" },
  ]);
  const [toast, setToast] = useState<string | null>(null);
  const [nouvelleAgence, setNouvelleAgence] = useState("");
  const [nouvelleCommission, setNouvelleCommission] = useState("");
  const [nouveauMotif, setNouveauMotif] = useState("");

  function notifier(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function ajouterDerogation() {
    if (!nouvelleAgence.trim() || !nouvelleCommission.trim()) {
      notifier("Agence et commission obligatoires");
      return;
    }
    setDerogations((prev) => [...prev, { agence: nouvelleAgence, commission: nouvelleCommission, motif: nouveauMotif || "—" }]);
    setNouvelleAgence("");
    setNouvelleCommission("");
    setNouveauMotif("");
    notifier("Dérogation ajoutée (démo)");
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Configuration des frais</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">
            Démo — un taux de dérogation remplace toute la grille par tranches pour l&apos;agence concernée (pas un ajustement tranche par tranche)
          </div>
        </div>
        <HistoriqueButton label="Historique des changements" entrees={[
          { heure: "16:30", action: "Dérogation ajoutée — Touristique Express à 6%", auteur: "s.piobli" },
          { heure: "hier 09:00", action: "Frais annexes modifiés — sélection de siège", auteur: "s.piobli" },
        ]} />
      </div>

      <Panel title="Grille globale (toutes agences)" action={<span className="text-xs font-semibold text-green-700">🔒 Modification sensible</span>}>
        <table className="w-full">
          <thead><tr><th className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">Tranche de prix</th><th className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">Commission JEGO</th></tr></thead>
          <tbody>
            {grille.map((g, i) => (
              <tr key={g.tranche} className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]">{g.tranche}</td>
                <td className="px-[18px] py-2.5">
                  <input
                    value={g.val}
                    onChange={(e) => setGrille((prev) => prev.map((x, idx) => idx === i ? { ...x, val: e.target.value } : x))}
                    className="w-[70px] px-1.5 py-1 border border-line rounded-md font-mono text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-[18px] py-3">
          <TypeToConfirm
            titre="Modifier la grille globale ?"
            message="Ce changement s'applique à toutes les agences qui n'ont pas de dérogation spécifique."
            mot="confirmer"
            onConfirm={() => notifier("Grille globale enregistrée (démo)")}
            trigger={(open) => <BtnMini variant="primary" onClick={open}>Enregistrer la grille globale</BtnMini>}
          />
        </div>
      </Panel>

      <div className="mt-4">
        <Panel title="Dérogations par agence">
          <table className="w-full">
            <thead><tr>{["Agence", "Commission appliquée", "Motif", ""].map((h) => <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {derogations.map((d, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="px-[18px] py-2.5 text-[13px]"><b>{d.agence}</b></td>
                  <td className="px-[18px] py-2.5 text-[13px] font-mono">{d.commission} <Badge color="amber">Dérogation</Badge></td>
                  <td className="px-[18px] py-2.5 text-[13px]">{d.motif}</td>
                  <td className="px-[18px] py-2.5">
                    <TypeToConfirm
                      titre={`Retirer la dérogation de ${d.agence} ?`}
                      message="L'agence reviendra automatiquement sur la grille globale."
                      mot="retirer"
                      danger
                      onConfirm={() => { setDerogations((prev) => prev.filter((_, idx) => idx !== i)); notifier("Dérogation retirée (démo)"); }}
                      trigger={(open) => <BtnMini variant="danger" onClick={open}>Retirer</BtnMini>}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-[18px] py-3 grid grid-cols-4 gap-2">
            <select value={nouvelleAgence} onChange={(e) => setNouvelleAgence(e.target.value)} className="px-2 py-1.5 border border-line rounded-md text-xs col-span-1 bg-transparent">
              <option value="">— Choisir une agence —</option>
              {agencesValideesDemo.map((nom) => <option key={nom} value={nom}>{nom}</option>)}
            </select>
            <input placeholder="Commission (ex: 5%)" value={nouvelleCommission} onChange={(e) => setNouvelleCommission(e.target.value)} className="px-2 py-1.5 border border-line rounded-md text-xs col-span-1 bg-transparent" />
            <input placeholder="Motif" value={nouveauMotif} onChange={(e) => setNouveauMotif(e.target.value)} className="px-2 py-1.5 border border-line rounded-md text-xs col-span-1 bg-transparent" />
            <TypeToConfirm
              titre="Ajouter cette dérogation ?"
              message="Cette agence appliquera ce taux au lieu de la grille globale, à partir de maintenant."
              mot="ajouter"
              onConfirm={ajouterDerogation}
              trigger={(open) => <BtnMini variant="primary" onClick={open}>+ Ajouter</BtnMini>}
            />
          </div>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Frais annexes">
          <table className="w-full">
            <tbody>
              {fraisAnnexes.map((f, i) => (
                <tr key={f.label} className="border-t border-line first:border-t-0">
                  <td className="px-[18px] py-2.5 text-[13px]">{f.label}</td>
                  <td className="px-[18px] py-2.5">
                    <input
                      value={f.val}
                      onChange={(e) => setFraisAnnexes((prev) => prev.map((x, idx) => idx === i ? { ...x, val: e.target.value } : x))}
                      className="w-[70px] px-1.5 py-1 border border-line rounded-md font-mono text-xs bg-transparent"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-[18px] py-3">
            <TypeToConfirm
              titre="Enregistrer les frais annexes ?"
              message="Ces montants s'appliquent immédiatement à toutes les réservations à venir."
              mot="confirmer"
              onConfirm={() => notifier("Frais annexes enregistrés (démo)")}
              trigger={(open) => <BtnMini variant="primary" onClick={open}>Enregistrer</BtnMini>}
            />
          </div>
        </Panel>
      </div>
      <ToastDemo message={toast} />
    </div>
  );
}
