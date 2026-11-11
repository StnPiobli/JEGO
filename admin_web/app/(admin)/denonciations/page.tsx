"use client";
// BRANCHÉ SUR LE VRAI BACKEND
//   GET /api/denonciations/admin/tous[?statut=traitee|classee]
//   PUT /api/denonciations/:id/decision  { decision, statut: "traitee" | "classee" }
//
// Le voyageur dénonce des faits graves sur un voyage effectué, l'agence
// donne sa version, JEGO tranche. Le voyageur et l'agence reçoivent la
// décision.

import { useCallback, useEffect, useState } from "react";
import { Panel, Badge, BtnMini, Toast } from "@/components/ui";
import { apiFetch } from "@/lib/api";

type Denonciation = {
  id: string;
  numero: string;
  categorie: string;
  raison: string;
  statut: "ouverte" | "observation_agence" | "traitee" | "classee";
  observation_agence: string | null;
  cree_le: string;
  nom_agence: string;
  nom_voyageur: string;
  prenom_voyageur: string;
  nom_chauffeur: string | null;
  prenom_chauffeur: string | null;
  signalements_trajet: string;
};

const CATEGORIES: Record<string, string> = {
  conduite_dangereuse: "Conduite dangereuse",
  comportement_chauffeur: "Comportement du chauffeur",
  etat_du_bus: "État du bus",
  surcharge: "Surcharge",
  arret_non_respecte: "Arrêt non respecté",
  horaire_non_respecte: "Horaire non respecté",
  securite: "Sécurité",
  autre: "Autre",
};

const ONGLETS = [
  { cle: "", label: "À instruire" },
  { cle: "traitee", label: "Faits retenus" },
  { cle: "classee", label: "Classées" },
] as const;

export default function DenonciationsPage() {
  const [onglet, setOnglet] = useState<"" | "traitee" | "classee">("");
  const [dossiers, setDossiers] = useState<Denonciation[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, string>>({});

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await apiFetch(`/api/denonciations/admin/tous${onglet ? `?statut=${onglet}` : ""}`);
      setDossiers(res.denonciations || []);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger les dénonciations.");
    } finally {
      setChargement(false);
    }
  }, [onglet]);

  useEffect(() => { charger(); }, [charger]);

  async function trancher(d: Denonciation, statut: "traitee" | "classee") {
    const decision = (decisions[d.id] || "").trim();
    if (!decision) return;
    try {
      await apiFetch(`/api/denonciations/${d.id}/decision`, {
        method: "PUT",
        body: JSON.stringify({ decision, statut }),
      });
      setToast(statut === "traitee" ? "Faits retenus — voyageur et agence notifiés" : "Classée sans suite — voyageur et agence notifiés");
      setTimeout(() => setToast(null), 2500);
      await charger();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Erreur");
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Dénonciations</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">
            Faits graves rapportés par des voyageurs après un voyage. L&apos;agence donne sa version, vous tranchez.
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {ONGLETS.map((o) => (
          <button
            key={o.cle}
            onClick={() => setOnglet(o.cle)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${onglet === o.cle ? "bg-green-700 text-white" : "bg-paper border border-line text-ink-soft"}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {erreur && <p className="mb-3 text-[13px] text-red font-medium">{erreur}</p>}

      {chargement ? (
        <Panel><div className="px-5 py-10 text-center text-ink-soft text-[13px]">Chargement…</div></Panel>
      ) : dossiers.length === 0 ? (
        <Panel><div className="px-5 py-10 text-center text-ink-soft text-[13px]">Aucun dossier</div></Panel>
      ) : (
        <div className="space-y-3">
          {dossiers.map((d) => {
            const clos = d.statut === "traitee" || d.statut === "classee";
            const corrobore = Number(d.signalements_trajet) > 0;
            return (
              <Panel key={d.id}>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[13.5px]">{CATEGORIES[d.categorie] || d.categorie}</span>
                      <Badge color={d.statut === "ouverte" ? "amber" : d.statut === "observation_agence" ? "purple" : d.statut === "traitee" ? "red" : "grey"}>
                        {d.statut === "ouverte" ? "Agence pas encore répondu" : d.statut === "observation_agence" ? "Agence a répondu" : d.statut === "traitee" ? "Faits retenus" : "Classée"}
                      </Badge>
                      {corrobore && <Badge color="red">{d.signalements_trajet} signalement(s) sur ce trajet</Badge>}
                    </div>
                    <span className="text-[11px] text-ink-soft font-mono">{d.numero} · {new Date(d.cree_le).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <p className="text-[12px] text-ink-soft mb-2">
                    {d.prenom_voyageur} {d.nom_voyageur} contre {d.nom_agence}
                    {d.nom_chauffeur ? ` · chauffeur ${d.prenom_chauffeur ?? ""} ${d.nom_chauffeur}` : ""}
                  </p>
                  <p className="text-[13px] mb-3">« {d.raison} »</p>
                  <div className="rounded-lg bg-off-white border border-line px-3 py-2 mb-3">
                    <p className="text-[10.5px] font-bold text-ink-soft mb-0.5">Version de l&apos;agence</p>
                    <p className="text-[12.5px]">{d.observation_agence || "Pas encore de réponse."}</p>
                  </div>
                  {!clos && (
                    <div>
                      <textarea
                        value={decisions[d.id] || ""}
                        onChange={(e) => setDecisions((x) => ({ ...x, [d.id]: e.target.value }))}
                        rows={3}
                        placeholder="Décision motivée — elle est envoyée telle quelle au voyageur et à l'agence"
                        className="w-full rounded-lg border border-line bg-off-white px-3 py-2 text-[12.5px] mb-2"
                      />
                      <div className="flex gap-2">
                        <BtnMini variant="danger-primary" onClick={() => trancher(d, "traitee")}>Retenir les faits</BtnMini>
                        <BtnMini onClick={() => trancher(d, "classee")}>Classer sans suite</BtnMini>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
      <Toast message={toast} />
    </div>
  );
}
