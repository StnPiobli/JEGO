"use client";

// ✅ BRANCHÉ SUR LE VRAI BACKEND, AVEC REPLI DÉMO AUTOMATIQUE
// GET/PUT /api/admin/parametres — si ça échoue, bascule sur des paramètres
// factices modifiables en local, bandeau visible.

import { useEffect, useState } from "react";
import { Panel, BtnMini } from "@/components/ui";
import HistoriqueButton from "@/components/HistoriqueButton";
import TypeToConfirm from "@/components/TypeToConfirm";
import { apiFetch } from "@/lib/api";

type Parametre = {
  cle: string;
  valeur: string;
  type_valeur: string;
  categorie: string;
  description: string;
  mis_a_jour_le: string;
};

const demoParametres: Parametre[] = [
  { cle: "soft_lock_minutes", valeur: "5", type_valeur: "integer", categorie: "Réservation", description: "Durée du soft lock siège (min)", mis_a_jour_le: "" },
  { cle: "delai_reponse_litige_h", valeur: "48", type_valeur: "integer", categorie: "Réservation", description: "Délai de réponse agence à un litige (h)", mis_a_jour_le: "" },
  { cle: "delai_declaration_litige_jours", valeur: "2", type_valeur: "integer", categorie: "Réservation", description: "Délai maximum après la fin du trajet pour déclarer un litige (jours)", mis_a_jour_le: "" },
  { cle: "programmation_max_jours", valeur: "30", type_valeur: "integer", categorie: "Réservation", description: "Programmation — avance maximum (jours)", mis_a_jour_le: "" },
  { cle: "points_palier_1", valeur: "500", type_valeur: "integer", categorie: "Points JEGO", description: "Barème points JEGO — palier 1", mis_a_jour_le: "" },
  { cle: "points_palier_2", valeur: "1000", type_valeur: "integer", categorie: "Points JEGO", description: "Barème points JEGO — palier 2", mis_a_jour_le: "" },
  { cle: "telephone_support", valeur: "+237 6XX XXX XXX", type_valeur: "string", categorie: "Points JEGO", description: "Numéro de téléphone support", mis_a_jour_le: "" },
  { cle: "email_support", valeur: "support@jego.cm", type_valeur: "string", categorie: "Points JEGO", description: "Email support", mis_a_jour_le: "" },
];

export default function ParametresPage() {
  const [parametres, setParametres] = useState<Parametre[]>([]);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [chargement, setChargement] = useState(true);
  const [modeDemo, setModeDemo] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState<string | null>(null);

  function initValeurs(liste: Parametre[]) {
    const init: Record<string, string> = {};
    liste.forEach((p) => (init[p.cle] = p.valeur));
    setValeurs(init);
  }

  async function charger() {
    setChargement(true);
    setErreur(null);
    try {
      const data = await apiFetch("/api/admin/parametres");
      setParametres(data.parametres);
      initValeurs(data.parametres);
      setModeDemo(false);
    } catch {
      setParametres(demoParametres);
      initValeurs(demoParametres);
      setModeDemo(true);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  async function enregistrer(cle: string) {
    setEnregistrement(cle);
    try {
      if (modeDemo) {
        setParametres((prev) => prev.map((p) => (p.cle === cle ? { ...p, valeur: valeurs[cle] } : p)));
      } else {
        await apiFetch(`/api/admin/parametres/${cle}`, {
          method: "PUT",
          body: JSON.stringify({ valeur: valeurs[cle] }),
        });
        await charger();
      }
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur d'enregistrement");
    } finally {
      setEnregistrement(null);
    }
  }

  const parCategorie = parametres.reduce<Record<string, Parametre[]>>((acc, p) => {
    (acc[p.categorie] = acc[p.categorie] || []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Paramètres système</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Table parametres_systeme — clé/valeur, tracé par modifie_par</div>
        </div>
        <HistoriqueButton label="Historique des modifications" entrees={[
          { heure: "14:02", action: "Délai de réponse litige modifié : 48h → 48h", auteur: "s.piobli" },
          { heure: "hier 10:00", action: "Email support modifié", auteur: "s.piobli" },
        ]} />
      </div>

      {modeDemo && (
        <div className="text-xs font-semibold text-amber bg-amber-bg rounded-lg px-3 py-2 mb-4">
          Mode démo — backend injoignable ou table vide, paramètres factices modifiables en local
        </div>
      )}
      {erreur && <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>}

      {chargement ? (
        <div className="text-ink-soft text-sm">Chargement…</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(parCategorie).map(([categorie, items]) => (
            <Panel key={categorie} title={categorie}>
              <table className="w-full">
                <tbody>
                  {items.map((p) => (
                    <tr key={p.cle} className="border-t border-line first:border-t-0">
                      <td className="px-[18px] py-2.5 text-[13px]">
                        {p.description || p.cle}
                        <div className="text-[10.5px] text-ink-soft font-mono">{p.cle}</div>
                      </td>
                      <td className="px-[18px] py-2.5">
                        <input
                          value={valeurs[p.cle] ?? ""}
                          onChange={(e) => setValeurs({ ...valeurs, [p.cle]: e.target.value })}
                          className="w-[110px] px-1.5 py-1 border border-line rounded-md font-mono text-xs"
                        />
                      </td>
                      <td className="px-[18px] py-2.5">
                        <TypeToConfirm
                          titre="Modifier ce paramètre système ?"
                          message={`Ce changement affecte "${p.description || p.cle}" pour toute la plateforme.`}
                          mot="confirmer"
                          onConfirm={() => enregistrer(p.cle)}
                          trigger={(open) => (
                            <BtnMini variant="primary" onClick={open}>
                              {enregistrement === p.cle ? "…" : "OK"}
                            </BtnMini>
                          )}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
