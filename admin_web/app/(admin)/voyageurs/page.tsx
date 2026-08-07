"use client";

import { useEffect, useState } from "react";
import { Panel, Badge, BtnMini, Toast } from "@/components/ui";
import TypeToConfirm from "@/components/TypeToConfirm";
import { apiFetch } from "@/lib/api";

type Voyageur = {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  statut: "actif" | "banni_commentaires";
  nombre_voyages: string | number;
  nombre_litiges: string | number;
};

export default function VoyageursPage() {
  const [voyageurs, setVoyageurs] = useState<Voyageur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  async function charger(termeRecherche = "") {
    try {
      const q = termeRecherche ? `?recherche=${encodeURIComponent(termeRecherche)}` : "";
      const res = await apiFetch(`/api/admin/voyageurs${q}`);
      setVoyageurs(res.voyageurs || []);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger les voyageurs.");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  // Recherche différée côté serveur (évite un appel à chaque frappe)
  useEffect(() => {
    const t = setTimeout(() => charger(recherche), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche]);

  async function toggleBan(v: Voyageur) {
    const nouveauStatut = v.statut === "actif" ? "banni_commentaires" : "actif";
    try {
      await apiFetch(`/api/admin/voyageurs/${v.id}/statut`, {
        method: "PUT",
        body: JSON.stringify({ statut: nouveauStatut }),
      });
      setVoyageurs((prev) => prev.map((p) => (p.id === v.id ? { ...p, statut: nouveauStatut } : p)));
      setToast("Statut mis à jour");
      setTimeout(() => setToast(null), 2000);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Erreur lors de la mise à jour.");
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Voyageurs</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">
            {chargement ? "Chargement..." : `${voyageurs.length} compte(s)`}
          </div>
        </div>
      </div>
      <Panel
        title="Rechercher un voyageur"
        action={<input placeholder="Nom, téléphone, email…" value={recherche} onChange={(e) => setRecherche(e.target.value)} className="px-2.5 py-1.5 border border-line rounded-lg text-xs w-56 bg-transparent" />}
      >
        {erreur && <p className="px-[18px] py-4 text-[13px] text-red font-medium">{erreur}</p>}
        <div className="max-h-[420px] overflow-y-auto">
<table className="w-full">
          <thead>
            <tr>{["Voyageur", "Téléphone", "Email", "Voyages", "Litiges", "Statut", ""].map((h) => <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {voyageurs.map((v) => (
              <tr key={v.id} className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]"><b>{v.prenom} {v.nom}</b></td>
                <td className="px-[18px] py-2.5 text-[13px] font-mono">{v.telephone}</td>
                <td className="px-[18px] py-2.5 text-[12.5px]">{v.email}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{v.nombre_voyages}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{v.nombre_litiges}</td>
                <td className="px-[18px] py-2.5"><Badge color={v.statut === "actif" ? "green" : "red"}>{v.statut === "actif" ? "Actif" : "Banni commentaires"}</Badge></td>
                <td className="px-[18px] py-2.5">
                  <TypeToConfirm
                    titre={v.statut === "actif" ? `Bannir ${v.prenom} ${v.nom} des commentaires ?` : `Réactiver ${v.prenom} ${v.nom} ?`}
                    message={v.statut === "actif" ? "Le compte ne pourra plus laisser de commentaires écrits (les notes chiffrées restent possibles)." : "Le compte pourra de nouveau laisser des commentaires."}
                    mot={v.statut === "actif" ? "bannir" : "réactiver"}
                    danger={v.statut === "actif"}
                    onConfirm={() => toggleBan(v)}
                    trigger={(open) => (
                      <BtnMini variant={v.statut === "actif" ? "danger" : "primary"} onClick={open}>
                        {v.statut === "actif" ? "Bannir" : "Réactiver"}
                      </BtnMini>
                    )}
                  />
                </td>
              </tr>
            ))}
            {!chargement && voyageurs.length === 0 && !erreur && <tr><td colSpan={7} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Aucun résultat</td></tr>}
          </tbody>
        </table>
</div>
      </Panel>
      <Toast message={toast} />
    </div>
  );
}
