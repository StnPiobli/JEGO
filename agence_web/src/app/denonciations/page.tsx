'use client';
// BRANCHÉ SUR LE VRAI BACKEND
//   GET /api/denonciations/mes-denonciations   (dossiers visant l'agence)
//   PUT /api/denonciations/:id/observation     { observation }
//
// Un voyageur dénonce des faits graves sur un voyage effectué. L'agence
// est en mode observation : elle donne sa version, seul JEGO tranche.

import { useCallback, useEffect, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import { Panel, Badge } from '../components/ui';
import { apiFetch } from '../lib/api';

type Denonciation = {
  id: string;
  numero: string;
  categorie: string;
  raison: string;
  statut: 'ouverte' | 'observation_agence' | 'traitee' | 'classee';
  observation_agence: string | null;
  observation_agence_le: string | null;
  decision: string | null;
  decide_le: string | null;
  cree_le: string;
  numero_billet: string;
  date_depart: string;
  depart: string;
  arrivee: string;
};

const CATEGORIES: Record<string, string> = {
  conduite_dangereuse: 'Conduite dangereuse',
  comportement_chauffeur: 'Comportement du chauffeur',
  etat_du_bus: 'État du bus',
  surcharge: 'Surcharge',
  arret_non_respecte: 'Arrêt non respecté',
  horaire_non_respecte: 'Horaire non respecté',
  securite: 'Sécurité',
  autre: 'Autre',
};

const STATUTS: Record<Denonciation['statut'], { label: string; color: 'amber' | 'purple' | 'red' | 'grey' }> = {
  ouverte: { label: 'À votre réponse', color: 'amber' },
  observation_agence: { label: 'Réponse envoyée — JEGO instruit', color: 'purple' },
  traitee: { label: 'Faits retenus par JEGO', color: 'red' },
  classee: { label: 'Classée sans suite', color: 'grey' },
};

const dateFr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '');

export default function DenonciationsPage() {
  const [dossiers, setDossiers] = useState<Denonciation[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [brouillons, setBrouillons] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const charger = useCallback(async () => {
    try {
      const rep = await apiFetch('/api/denonciations/mes-denonciations');
      setDossiers(rep.denonciations || []);
      setErreur('');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  async function repondre(d: Denonciation) {
    const observation = (brouillons[d.id] || '').trim();
    if (!observation) return;
    setEnvoi(d.id);
    try {
      const rep = await apiFetch(`/api/denonciations/${d.id}/observation`, {
        method: 'PUT',
        body: JSON.stringify({ observation }),
      });
      setMessage(rep.message || 'Réponse transmise à JEGO');
      setBrouillons((b) => ({ ...b, [d.id]: '' }));
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setEnvoi(null);
    }
  }

  const aRepondre = dossiers.filter((d) => d.statut === 'ouverte').length;

  return (
    <LayoutAgence>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-[28px] font-extrabold text-ink mb-1">Dénonciations</h1>
        <p className="text-[13px] text-ink-soft mb-4">
          Des voyageurs rapportent des faits graves sur un voyage effectué. Donnez votre version : JEGO la lit avant de trancher, vous ne pouvez pas clore le dossier.
        </p>

        {erreur && <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>}
        {message && <div className="text-xs text-green-700 bg-ok-bg rounded-lg px-3 py-2 mb-4">{message}</div>}

        {!chargement && dossiers.length > 0 && (
          <p className="text-[12px] text-ink-soft mb-3">
            {aRepondre > 0 ? `${aRepondre} dossier(s) attendent votre réponse.` : 'Aucun dossier en attente de votre réponse.'}
          </p>
        )}

        {chargement ? (
          <div className="text-sm text-ink-soft">Chargement…</div>
        ) : dossiers.length === 0 ? (
          <Panel><div className="p-10 text-center text-sm text-ink-soft">Aucune dénonciation contre votre agence</div></Panel>
        ) : (
          <div className="space-y-3">
            {dossiers.map((d) => {
              const clos = d.statut === 'traitee' || d.statut === 'classee';
              const statut = STATUTS[d.statut] || { label: d.statut, color: 'grey' as const };
              return (
                <Panel key={d.id}>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-ink text-[13px]">{d.depart} → {d.arrivee}</span>
                        <Badge color={statut.color}>{statut.label}</Badge>
                      </div>
                      <span className="text-[11px] text-ink-soft font-mono">{d.numero}</span>
                    </div>
                    <p className="text-[12px] text-ink-soft mb-2">
                      {CATEGORIES[d.categorie] || d.categorie} · voyage du {dateFr(d.date_depart)} · billet {d.numero_billet} · ouverte le {dateFr(d.cree_le)}
                    </p>
                    <p className="text-[13px] text-ink mb-3">« {d.raison} »</p>

                    {d.observation_agence && (
                      <div className="rounded-lg bg-off-white border border-line px-3 py-2 mb-3">
                        <p className="text-[10.5px] font-bold text-ink-soft mb-0.5">Votre réponse · {dateFr(d.observation_agence_le)}</p>
                        <p className="text-[12.5px] text-ink">{d.observation_agence}</p>
                      </div>
                    )}

                    {d.decision && (
                      <div className="rounded-lg bg-ok-bg px-3 py-2 mb-3">
                        <p className="text-[10.5px] font-bold text-green-700 mb-0.5">Décision de JEGO · {dateFr(d.decide_le)}</p>
                        <p className="text-[12.5px] text-ink">{d.decision}</p>
                      </div>
                    )}

                    {!clos && (
                      <div>
                        <textarea
                          value={brouillons[d.id] || ''}
                          onChange={(e) => setBrouillons((b) => ({ ...b, [d.id]: e.target.value }))}
                          rows={3}
                          placeholder={d.observation_agence ? 'Compléter votre réponse (elle remplace la précédente)' : 'Votre version des faits'}
                          className="w-full rounded-lg border border-line bg-off-white px-3 py-2 text-[12.5px] mb-2"
                        />
                        <button
                          onClick={() => repondre(d)}
                          disabled={!(brouillons[d.id] || '').trim() || envoi === d.id}
                          className="rounded-lg bg-green-700 disabled:opacity-40 text-white font-semibold text-[11px] px-4 py-2"
                        >
                          {envoi === d.id ? 'Envoi…' : 'Envoyer ma réponse à JEGO'}
                        </button>
                      </div>
                    )}
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </div>
    </LayoutAgence>
  );
}
