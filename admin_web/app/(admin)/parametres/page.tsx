"use client";

// BRANCHÉ SUR LE VRAI BACKEND — GET/PUT /api/admin/parametres.
// Si l'appel échoue, l'erreur est affichée telle quelle : aucune donnée
// de remplacement n'est inventée.

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


export default function ParametresPage() {
  const [parametres, setParametres] = useState<Parametre[]>([]);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [chargement, setChargement] = useState(true);
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
      setParametres(data.parametres || []);
      initValeurs(data.parametres || []);
    } catch (err) {
      setParametres([]);
      setErreur(err instanceof Error ? err.message : "Impossible de charger les paramètres.");
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
      await apiFetch(`/api/admin/parametres/${cle}`, {
        method: "PUT",
        body: JSON.stringify({ valeur: valeurs[cle] }),
      });
      await charger();
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
        <HistoriqueButton label="Historique des modifications" entrees={[]} />
      </div>

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
