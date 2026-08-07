"use client";
// BRANCHÉ SUR LE VRAI BACKEND.
//   GET    /api/admin/frais                    → { grille, derogations, fraisAnnexes }
//   PUT    /api/admin/frais/grille             body { grille }
//   POST   /api/admin/frais/derogations        body { agence_id, pourcentage, motif }
//   DELETE /api/admin/frais/derogations/:id
//   GET    /api/admin/agences?statut=actif     → sélecteur de dérogation
//
// La grille lue ici est CELLE QUI SERT RÉELLEMENT au calcul de commission
// à chaque billet vendu (voir reservationController.js). Une dérogation
// remplace toute la grille pour l'agence concernée.
//
// PAS ENCORE BRANCHÉ : les frais annexes (supplément siège premium,
// majoration ticket flexible) sont codés en dur dans reservationController.js.
// La section reste vide tant qu'ils n'auront pas été migrés en base.

import { useEffect, useState } from "react";
import { Panel, Badge, BtnMini, Toast } from "@/components/ui";
import HistoriqueButton from "@/components/HistoriqueButton";
import TypeToConfirm from "@/components/TypeToConfirm";
import { apiFetch } from "@/lib/api";

type LigneGrille = {
  id?: string;
  tranche_min: number | string;
  tranche_max: number | string | null;
  pourcentage: number | string;
};
type Derogation = { id: string; agence_id: string; agence: string; pourcentage: number | string; motif: string | null };
type FraisAnnexe = { cle: string; label: string; val: string };
type AgenceOption = { id: string; nom: string };

function formaterTranche(l: LigneGrille): string {
  const min = Number(l.tranche_min || 0).toLocaleString("fr-FR");
  if (l.tranche_max === null || l.tranche_max === "" || l.tranche_max === undefined) {
    return `${min} FCFA et +`;
  }
  return `${min} – ${Number(l.tranche_max).toLocaleString("fr-FR")} FCFA`;
}

export default function FraisPage() {
  const [grille, setGrille] = useState<LigneGrille[]>([]);
  const [derogations, setDerogations] = useState<Derogation[]>([]);
  const [fraisAnnexes, setFraisAnnexes] = useState<FraisAnnexe[]>([]);
  const [agencesActives, setAgencesActives] = useState<AgenceOption[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [nouvelleAgence, setNouvelleAgence] = useState("");
  const [nouvelleCommission, setNouvelleCommission] = useState("");
  const [nouveauMotif, setNouveauMotif] = useState("");

  function notifier(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  async function charger() {
    try {
      const res = await apiFetch("/api/admin/frais");
      setGrille(res.grille || []);
      setDerogations(res.derogations || []);
      setFraisAnnexes(res.fraisAnnexes || []);
      const ag = await apiFetch("/api/admin/agences?statut=actif");
      setAgencesActives(ag.agences || []);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger la configuration des frais.");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { charger(); }, []);

  function modifierLigne(index: number, champ: keyof LigneGrille, valeur: string) {
    setGrille((prev) => prev.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)));
  }

  function ajouterTranche() {
    const derniere = grille[grille.length - 1];
    const debut = derniere && derniere.tranche_max ? Number(derniere.tranche_max) + 1 : 0;
    setGrille((prev) => [...prev, { tranche_min: debut, tranche_max: null, pourcentage: "" }]);
  }

  function retirerTranche(index: number) {
    setGrille((prev) => prev.filter((_, i) => i !== index));
  }

  async function enregistrerGrille() {
    try {
      const res = await apiFetch("/api/admin/frais/grille", {
        method: "PUT",
        body: JSON.stringify({
          grille: grille.map((l) => ({
            id: l.id,
            tranche_min: l.tranche_min,
            tranche_max: l.tranche_max === "" ? null : l.tranche_max,
            pourcentage: l.pourcentage,
          })),
        }),
      });
      setGrille(res.grille || []);
      notifier("Grille globale enregistrée");
    } catch (e) {
      notifier(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
    }
  }

  async function ajouterDerogation() {
    if (!nouvelleAgence.trim() || !nouvelleCommission.trim()) {
      notifier("Agence et commission obligatoires");
      return;
    }
    try {
      const res = await apiFetch("/api/admin/frais/derogations", {
        method: "POST",
        body: JSON.stringify({
          agence_id: nouvelleAgence,
          pourcentage: nouvelleCommission.replace("%", "").trim(),
          motif: nouveauMotif || null,
        }),
      });
      setDerogations((prev) => [...prev, res.derogation]);
      setNouvelleAgence("");
      setNouvelleCommission("");
      setNouveauMotif("");
      notifier("Dérogation ajoutée");
    } catch (e) {
      notifier(e instanceof Error ? e.message : "Erreur lors de l'ajout.");
    }
  }

  async function retirerDerogation(d: Derogation) {
    try {
      await apiFetch(`/api/admin/frais/derogations/${d.id}`, { method: "DELETE" });
      setDerogations((prev) => prev.filter((x) => x.id !== d.id));
      notifier("Dérogation retirée");
    } catch (e) {
      notifier(e instanceof Error ? e.message : "Erreur lors du retrait.");
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Configuration des frais</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">
            Un taux de dérogation remplace toute la grille par tranches pour l&apos;agence concernée (pas un ajustement tranche par tranche)
          </div>
        </div>
        <HistoriqueButton label="Historique des changements" entrees={[]} />
      </div>

      {erreur && <p className="mb-4 text-[13px] text-red font-medium">{erreur}</p>}

      <Panel title="Grille globale (toutes agences)" action={<span className="text-xs font-semibold text-green-700">🔒 Modification sensible</span>}>
        <table className="w-full">
          <thead>
            <tr>
              {["De (FCFA)", "À (FCFA)", "Commission JEGO", ""].map((h) => (
                <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grille.map((g, i) => (
              <tr key={g.id ?? `nouvelle-${i}`} className="border-t border-line">
                <td className="px-[18px] py-2.5">
                  <input
                    type="number"
                    value={g.tranche_min ?? ""}
                    onChange={(e) => modifierLigne(i, "tranche_min", e.target.value)}
                    className="w-[100px] px-1.5 py-1 border border-line rounded-md font-mono text-xs bg-transparent"
                  />
                </td>
                <td className="px-[18px] py-2.5">
                  <input
                    type="number"
                    value={g.tranche_max ?? ""}
                    placeholder="sans limite"
                    onChange={(e) => modifierLigne(i, "tranche_max", e.target.value)}
                    className="w-[100px] px-1.5 py-1 border border-line rounded-md font-mono text-xs bg-transparent"
                  />
                </td>
                <td className="px-[18px] py-2.5">
                  <input
                    type="number"
                    step="0.01"
                    value={g.pourcentage ?? ""}
                    onChange={(e) => modifierLigne(i, "pourcentage", e.target.value)}
                    className="w-[70px] px-1.5 py-1 border border-line rounded-md font-mono text-xs bg-transparent"
                  />
                  <span className="text-[12px] text-ink-soft ml-1">%</span>
                  <span className="text-[11px] text-ink-soft ml-3">{formaterTranche(g)}</span>
                </td>
                <td className="px-[18px] py-2.5">
                  <BtnMini variant="danger" onClick={() => retirerTranche(i)} disabled={grille.length <= 1}>
                    Retirer
                  </BtnMini>
                </td>
              </tr>
            ))}
            {!chargement && grille.length === 0 && (
              <tr><td colSpan={4} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Aucune tranche configurée</td></tr>
            )}
            {chargement && (
              <tr><td colSpan={4} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Chargement…</td></tr>
            )}
          </tbody>
        </table>
        <div className="px-[18px] py-3 flex items-center gap-1.5">
          <TypeToConfirm
            titre="Modifier la grille globale ?"
            message="Ce changement s'applique immédiatement à toutes les agences qui n'ont pas de dérogation spécifique, sur tous les billets vendus à partir de maintenant."
            mot="confirmer"
            onConfirm={enregistrerGrille}
            trigger={(open) => (
              <BtnMini variant="primary" onClick={open} disabled={grille.length === 0}>
                Enregistrer la grille globale
              </BtnMini>
            )}
          />
          <BtnMini onClick={ajouterTranche}>+ Ajouter une tranche</BtnMini>
        </div>
      </Panel>

      <div className="mt-4">
        <Panel title="Dérogations par agence">
          <table className="w-full">
            <thead><tr>{["Agence", "Commission appliquée", "Motif", ""].map((h) => <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {derogations.map((d) => (
                <tr key={d.id} className="border-t border-line">
                  <td className="px-[18px] py-2.5 text-[13px]"><b>{d.agence}</b></td>
                  <td className="px-[18px] py-2.5 text-[13px] font-mono">{d.pourcentage}% <Badge color="amber">Dérogation</Badge></td>
                  <td className="px-[18px] py-2.5 text-[13px]">{d.motif ?? "—"}</td>
                  <td className="px-[18px] py-2.5">
                    <TypeToConfirm
                      titre={`Retirer la dérogation de ${d.agence} ?`}
                      message="L'agence reviendra automatiquement sur la grille globale."
                      mot="retirer"
                      danger
                      onConfirm={() => retirerDerogation(d)}
                      trigger={(open) => <BtnMini variant="danger" onClick={open}>Retirer</BtnMini>}
                    />
                  </td>
                </tr>
              ))}
              {!chargement && derogations.length === 0 && (
                <tr><td colSpan={4} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Aucune dérogation — toutes les agences suivent la grille globale</td></tr>
              )}
            </tbody>
          </table>
          <div className="px-[18px] py-3 grid grid-cols-4 gap-2">
            <select value={nouvelleAgence} onChange={(e) => setNouvelleAgence(e.target.value)} className="px-2 py-1.5 border border-line rounded-md text-xs col-span-1 bg-transparent">
              <option value="">— Choisir une agence —</option>
              {agencesActives.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
            </select>
            <input placeholder="Commission (ex: 5)" value={nouvelleCommission} onChange={(e) => setNouvelleCommission(e.target.value)} className="px-2 py-1.5 border border-line rounded-md text-xs col-span-1 bg-transparent" />
            <input placeholder="Motif" value={nouveauMotif} onChange={(e) => setNouveauMotif(e.target.value)} className="px-2 py-1.5 border border-line rounded-md text-xs col-span-1 bg-transparent" />
            <TypeToConfirm
              titre="Ajouter cette dérogation ?"
              message="Cette agence appliquera ce taux au lieu de la grille globale, à partir de maintenant."
              mot="ajouter"
              onConfirm={ajouterDerogation}
              trigger={(open) => (
                <BtnMini variant="primary" onClick={open} disabled={agencesActives.length === 0}>
                  + Ajouter
                </BtnMini>
              )}
            />
          </div>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Frais annexes">
          <table className="w-full">
            <tbody>
              {fraisAnnexes.map((f, i) => (
                <tr key={f.cle} className="border-t border-line first:border-t-0">
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
              {!chargement && fraisAnnexes.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-[18px] py-5 text-center text-ink-soft text-[12.5px]">
                    Le supplément siège premium et la majoration ticket flexible sont encore
                    fixés dans le code, pas en base — ils ne sont pas modifiables ici pour l&apos;instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>
      <Toast message={toast} />
    </div>
  );
}
