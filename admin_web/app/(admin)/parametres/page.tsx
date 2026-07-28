"use client";

// ✅ BRANCHÉ SUR LE VRAI BACKEND
// GET /api/admin/parametres          — liste tous les paramètres (table parametres_systeme)
// PUT /api/admin/parametres/:cle     — { valeur } — modifie un paramètre, trace modifie_par
//
// Aucun champ n'est inventé ici : les libellés viennent de la colonne
// `description` en base, groupés par `categorie`. S'il n'y a pas encore
// de lignes dans parametres_systeme, la page affichera simplement "vide" —
// c'est un signal réel qu'il faut peupler la table, pas un bug d'affichage.

import { useEffect, useState } from "react";
import { Topbar, Panel, BtnMini } from "@/components/ui";
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

  async function charger() {
    setChargement(true);
    setErreur(null);
    try {
      const data = await apiFetch("/api/admin/parametres");
      setParametres(data.parametres);
      const init: Record<string, string> = {};
      data.parametres.forEach((p: Parametre) => (init[p.cle] = p.valeur));
      setValeurs(init);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur de chargement");
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
      <Topbar title="Paramètres système" subtitle="Table parametres_systeme — clé/valeur, tracé par modifie_par" />

      {erreur && (
        <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>
      )}

      {chargement ? (
        <div className="text-ink-soft text-sm">Chargement…</div>
      ) : Object.keys(parCategorie).length === 0 ? (
        <Panel>
          <div className="px-5 py-10 text-center text-ink-soft text-[13px]">
            Aucun paramètre en base pour l&apos;instant — la table <code>parametres_systeme</code> est vide.
          </div>
        </Panel>
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
                        <BtnMini
                          variant="primary"
                          onClick={() => enregistrer(p.cle)}
                        >
                          {enregistrement === p.cle ? "…" : "OK"}
                        </BtnMini>
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
