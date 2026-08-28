"use client";

import { useEffect, useState } from "react";
import { Panel, Badge, BtnMini, Toast } from "@/components/ui";
import TypeToConfirm from "@/components/TypeToConfirm";
import { apiFetch } from "@/lib/api";
import { formatTelephone } from "@/lib/format";

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
  const [tri, setTri] = useState<"voyages_desc" | "voyages_asc" | "litiges_desc" | "litiges_asc" | null>(null);
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

  const n = (x: unknown) => parseInt(String(x ?? "0"), 10) || 0;
  const voyageursTries = tri
    ? [...voyageurs].sort((a, b) => {
        const [champ, sens] = tri.split("_");
        const va = champ === "voyages" ? n(a.nombre_voyages) : n(a.nombre_litiges);
        const vb = champ === "voyages" ? n(b.nombre_voyages) : n(b.nombre_litiges);
        return sens === "asc" ? va - vb : vb - va;
      })
    : voyageurs;

  return (
    <div className="flex flex-col flex-1 min-h-0">
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
        action={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {([
              ["voyages_desc", "Plus de voyages"], ["voyages_asc", "Moins de voyages"],
              ["litiges_desc", "Plus de litiges"], ["litiges_asc", "Moins de litiges"],
            ] as const).map(([code, label]) => (
              <button key={code} onClick={() => setTri((t) => (t === code ? null : code))} className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-full border ${tri === code ? "bg-green-700 text-white border-green-700" : "border-line text-ink-soft"}`}>{label}</button>
            ))}
            <input placeholder="Nom, téléphone, email…" value={recherche} onChange={(e) => setRecherche(e.target.value)} className="px-2.5 py-1.5 border border-line rounded-lg text-xs w-52 bg-transparent" />
          </div>
        }
      >
        {erreur && <p className="px-[18px] py-4 text-[13px] text-red font-medium">{erreur}</p>}
        <div className="h-[calc(100vh-185px)] overflow-y-auto">
<table className="w-full">
          <thead>
            <tr>{["Voyageur", "Téléphone", "Email", "Voyages", "Litiges", "Statut", ""].map((h) => <th key={h} title={h === "Statut" ? "Actif = compte normal. Banni commentaires = ne peut plus laisser de commentaires écrits (les notes chiffrées restent possibles)." : undefined} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}{h === "Statut" && <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-ink-soft/20 text-ink-soft text-[8px] font-bold not-italic normal-case">i</span>}</th>)}</tr>
          </thead>
          <tbody>
            {voyageursTries.map((v) => (
              <tr key={v.id} className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]"><b>{v.prenom} {v.nom}</b></td>
                <td className="px-[18px] py-2.5 text-[13px] font-mono whitespace-nowrap">{formatTelephone(v.telephone)}</td>
                <td className="px-[18px] py-2.5 text-[12.5px]">{v.email}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{v.nombre_voyages}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{v.nombre_litiges}</td>
                <td className="px-[18px] py-2.5" title={v.statut === "actif" ? "Compte normal, peut laisser des commentaires" : "Ne peut plus laisser de commentaires écrits"}><Badge color={v.statut === "actif" ? "green" : "red"}>{v.statut === "actif" ? "Actif" : "Banni commentaires"}</Badge></td>
                <td className="px-[18px] py-2.5">
                  <TypeToConfirm
                    titre={v.statut === "actif" ? `Bannir ${v.prenom} ${v.nom} des commentaires ?` : `Réactiver ${v.prenom} ${v.nom} ?`}
                    message={v.statut === "actif" ? "Le compte ne pourra plus laisser de commentaires écrits (les notes chiffrées restent possibles)." : "Le compte pourra de nouveau laisser des commentaires."}
                    mot={v.statut === "actif" ? "bannir" : "réactiver"}
                    danger={v.statut === "actif"}
                    onConfirm={() => toggleBan(v)}
                    trigger={(open) => (
                      <BtnMini variant={v.statut === "actif" ? "danger" : "primary"} onClick={open}>
                        {v.statut === "actif" ? "Bannir des commentaires" : "Réactiver"}
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
