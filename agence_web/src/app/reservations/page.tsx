'use client';

// Données réelles du backend.
//
// Champs volontairement limités à ce qui concerne l'agence :
// options supp. = uniquement bagage/premium (pas les options internes
// JEGO), montant = net perçu par l'agence (pas le prix payé par le
// client, qui inclut la commission JEGO et les frais annexes).

import { useCallback, useEffect, useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import DateNavigator from '../components/DateNavigator';
import { todayInputDate } from '../lib/date';
import { apiFetch } from '../lib/api';
import { formatTelephone } from '../lib/format';

type Passager = {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  siege: string;
  montantAgence: number; // net perçu par l'agence, pas le prix payé par le client
  statut: 'confirme' | 'embarque' | 'annule';
    optionsSupp?: string[];
  trajetAssocie: string; // tronçon réellement réservé (ex: "Loum → Yaounde") — un même trajet physique peut avoir plusieurs tronçons vendus séparément
};
type TrajetAvecPassagers = {
  id: string; numeroVoyage: string; date: string; heure: string; heureArrivee: string; trajet: string;
  capacite: number; demarre: boolean; passagers: Passager[];
  pointsDetail: { ville: string; lieu: string | null; heure: string | null }[];
};

const AUJOURDHUI = todayInputDate();

const stylesStatut = { confirme: 'bg-green-700/10 text-green-700', embarque: 'bg-ink/10 text-ink', annule: 'bg-red/10 text-red' };
const libellesStatut = { confirme: 'Confirme', embarque: 'Embarque', annule: 'Annule' };

function chaineHoraires(t: TrajetAvecPassagers): string {
  const heures = [t.heure];
  if (t.pointsDetail.length > 2) {
    for (let i = 1; i < t.pointsDetail.length - 1; i++) {
      const h = t.pointsDetail[i].heure;
      if (h) heures.push(h);
    }
  }
  if (t.heureArrivee) heures.push(t.heureArrivee);
  return heures.join(' → ');
}

export default function Reservations() {
  const [dateChoisie, setDateChoisie] = useState(AUJOURDHUI);
  const [ouverts, setOuverts] = useState<Set<string>>(new Set());
  const [recherche, setRecherche] = useState('');
  const [tousLesTrajets, setTousLesTrajets] = useState<TrajetAvecPassagers[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Charge les trajets de l'agence, puis la liste des passagers de
  // chacun. La recherche globale portant sur toutes les dates, on
  // récupère l'ensemble une seule fois.
  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const rep = await apiFetch('/api/trajets');
      const bruts = (rep.trajets || []) as Record<string, unknown>[];

      const complets = await Promise.all(
        bruts.map(async (t) => {
          const id = String(t.id);
          let passagers: Passager[] = [];
          let capacite = 0;
          try {
            const detail = await apiFetch(`/api/trajets/${id}/passagers`);
            capacite = Number(detail.trajet?.capacite) || 0;
            passagers = ((detail.passagers || []) as Record<string, unknown>[]).map((p) => {
              const options: Passager['optionsSupp'] = [];
                            const nbBagages = Number(p.quantite_bagages) || 0;
              if (Number(p.supplement_bagage) > 0) {
                options.push(nbBagages > 0 ? `Bagage supplementaire x${nbBagages}` : 'Bagage supplementaire');
              }
              const segment = `${p.ville_embarquement ?? ''} → ${p.ville_debarquement ?? ''}`;
              return {
                id: String(p.numero ?? p.id),
                nom: `${p.prenom ?? ''} ${p.nom ?? ''}`.trim(),
                telephone: String(p.telephone ?? ''),
                email: String(p.email ?? ''),
                siege: String(p.siege ?? ''),
                // Net perçu par l'agence, hors commission JEGO.
                montantAgence: Number(p.prix_agence ?? p.prix_total_client ?? 0),
                statut: p.statut === 'annule' ? 'annule' : (p.qr_scanne ? 'embarque' : 'confirme'),
                optionsSupp: options,
                trajetAssocie: segment.trim() === '→' ? '' : segment,
              } as Passager;
            });
          } catch {
            // Un trajet dont les passagers sont inaccessibles reste
            // affiché, avec une liste vide plutôt qu'une page en erreur.
          }

          const heure = String(t.heure_depart ?? '').slice(0, 5);
          const heureArrivee = String(t.heure_arrivee_estimee ?? '').slice(0, 5);
          const date = String(t.date_depart ?? '').split('T')[0];
          return {
            id,
            // Numéro attribué en base à la création du trajet. Il était
            // recalculé ici depuis la date et l'heure : il changeait à
            // chaque modification d'horaire et différait de celui
            // affiché ailleurs.
            numeroVoyage: String(t.numero ?? ''),
            date,
            heure,
            heureArrivee,
            trajet: `${t.ville_depart ?? ''} → ${t.ville_arrivee ?? ''}`,
            capacite,
            demarre: t.statut === 'en_cours',
            passagers,
            pointsDetail: (t.points_detail || []) as { ville: string; lieu: string | null; heure: string | null }[],
          } as TrajetAvecPassagers;
        }),
      );

      setTousLesTrajets(complets);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const trajetsDuJour = useMemo(
    () => tousLesTrajets.filter((t) => t.date === dateChoisie),
    [tousLesTrajets, dateChoisie],
  );

  const resultatsRecherche = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return [] as { trajet: TrajetAvecPassagers; passager: Passager }[];
    return tousLesTrajets.flatMap((trajet) =>
      trajet.passagers
        .filter((p) => [trajet.date, trajet.heure, trajet.trajet, p.nom, p.email, p.telephone, p.siege, p.id, p.trajetAssocie, ...(p.optionsSupp || []), libellesStatut[p.statut]].join(' ').toLowerCase().includes(terme))
        .map((passager) => ({ trajet, passager })),
    );
  }, [recherche, tousLesTrajets]);

  function toggle(id: string) {
    setOuverts((prev) => { const copie = new Set(prev); copie.has(id) ? copie.delete(id) : copie.add(id); return copie; });
  }

  function stats(t: TrajetAvecPassagers) {
    const actifs = t.passagers.filter((p) => p.statut !== 'annule');
    return { reservations: actifs.length, embarques: t.passagers.filter((p) => p.statut === 'embarque').length, argent: actifs.reduce((s, p) => s + p.montantAgence, 0), remplissage: Math.round((actifs.length / t.capacite) * 100) };
  }

  return (
    <LayoutAgence>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-[28px] font-extrabold text-ink mb-1">Reservations</h1>
        <p className="text-[13px] text-ink-soft mb-4">Par trajet — montants nets perçus par ton agence, options supplémentaires te concernant.</p>

        {erreur && (
          <div className="rounded-2xl p-3 mb-6 bg-red/6 border border-red/20">
            <p className="text-[11px] text-red">{erreur}</p>
            <button onClick={charger} className="text-[11px] font-bold text-green-700 mt-1">Réessayer</button>
          </div>
        )}

        <div className="bg-paper rounded-2xl border border-line p-4 mb-5">
          <label className="block text-[11px] font-semibold text-ink-soft mb-2">Recherche globale sur toutes les reservations</label>
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom client, telephone, trajet, siege, ID, option..." className="w-full rounded-xl px-4 py-3 text-[13px]" />
          <p className="text-[10px] text-ink-soft mt-2">La recherche parcourt toute la page sur toutes les dates.</p>
        </div>

        {recherche.trim() && (
          <div className="bg-paper rounded-2xl border border-line overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-line"><h2 className="text-sm font-bold text-ink">Resultats de recherche ({resultatsRecherche.length})</h2></div>
            {resultatsRecherche.length === 0 ? (
              <div className="p-6 text-[12px] text-ink-soft">Aucune reservation ne correspond a cette recherche.</div>
            ) : (
              <div className="divide-y divide-line">
                {resultatsRecherche.map(({ trajet, passager }) => (
                  <div key={`${trajet.id}-${passager.id}`} className="px-5 py-4 flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{passager.nom.split(' ').map((n) => n[0]).join('')}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-ink">{passager.nom}</p>
                        <span className="text-[10px] font-mono text-ink-soft">#{passager.id}</span>
                      </div>
                      <p className="text-[12px] text-ink-soft">{trajet.trajet} <span className="font-mono">{trajet.numeroVoyage}</span> · {trajet.date.split('-').reverse().join('/')} · départ {trajet.heure} · arrivée estimée {trajet.heureArrivee}</p>
                      <p className="text-[11px] text-ink-soft">{formatTelephone(passager.telephone)}{passager.email ? ` · ${passager.email}` : ''} · Siege {passager.siege}</p>
                      <p className="text-[11px] text-ink-soft mt-1">Options : {passager.optionsSupp && passager.optionsSupp.length ? passager.optionsSupp.join(', ') : 'Aucune'}</p>
                      <p className="text-[10.5px] text-purple font-semibold mt-0.5">Trajet associé : {passager.trajetAssocie}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${stylesStatut[passager.statut]}`}>{libellesStatut[passager.statut]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DateNavigator date={dateChoisie} onChange={setDateChoisie} className="mb-6" />

        {chargement ? (
          <div className="bg-paper rounded-2xl border border-line p-10 text-center"><p className="text-[13px] text-ink-soft">Chargement des réservations...</p></div>
        ) : trajetsDuJour.length === 0 ? (
          <div className="bg-paper rounded-2xl border border-line p-10 text-center"><p className="text-[13px] text-ink-soft">Aucun trajet ce jour-la.</p></div>
        ) : (
          <div className="space-y-4">
            {trajetsDuJour.map((t) => {
              const s = stats(t);
              const ouvert = ouverts.has(t.id);
              return (
                <div key={t.id} className="bg-paper rounded-2xl border border-line overflow-hidden">
                  <button onClick={() => toggle(t.id)} className="w-full text-left px-5 py-4 hover:bg-off-white transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-extrabold text-ink">{t.trajet}</p>
                          <span className="text-[10px] font-mono text-ink-soft">{t.numeroVoyage}</span>
                        </div>
                                                <p className="text-[12px] text-ink-soft">
                                                                            <span className="font-semibold text-ink mr-10">{chaineHoraires(t)}</span>
                          {t.pointsDetail.length > 0
                            ? t.pointsDetail.map((p, i, arr) => (
                                <span key={i}>
                                  <span className="font-bold text-ink">{p.ville}</span>
                                  {p.lieu && <span className="text-ink-soft"> ({p.lieu})</span>}
                                  {i < arr.length - 1 && <span className="text-ink-soft"> → </span>}
                                </span>
                              ))
                            : <span className="font-bold text-ink">{t.trajet}</span>}
                          {t.demarre && <span className="text-green-700 font-bold"> · En cours</span>}
                        </p>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--c-ink-soft))" strokeWidth="2" className={`transition-transform shrink-0 ${ouvert ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                      <div><p className="text-[10px] text-ink-soft">Places</p><p className="text-[13px] font-bold text-ink">{t.capacite}</p></div>
                      <div><p className="text-[10px] text-ink-soft">Reservations</p><p className="text-[13px] font-bold text-ink">{s.reservations}</p></div>
                      {t.demarre && <div><p className="text-[10px] text-ink-soft">Embarques</p><p className="text-[13px] font-bold text-ink">{s.embarques}</p></div>}
                      <div><p className="text-[10px] text-ink-soft">Net perçu (agence)</p><p className="text-[13px] font-bold text-green-700">{s.argent.toLocaleString('fr-FR')} F</p></div>
                      <div><p className="text-[10px] text-ink-soft">Remplissage</p><p className="text-[13px] font-bold text-ink">{s.remplissage}%</p></div>
                    </div>
                  </button>

                  {ouvert && (
                    <div className="border-t border-line divide-y divide-line">
                      {t.passagers.map((p) => (
                        <div key={p.id} className="px-5 py-3 flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{p.nom.split(' ').map((n) => n[0]).join('')}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-semibold text-ink">{p.nom}</p>
                              <span className="text-[10px] font-mono text-ink-soft">#{p.id}</span>
                            </div>
                            <p className="text-[12px] text-ink-soft">{formatTelephone(p.telephone)} · Siege {p.siege}</p>
                            <p className="text-[11px] text-ink-soft truncate">{p.email}</p>
                            <p className="text-[11px] text-ink-soft mt-1">Options : <strong className="text-ink">{p.optionsSupp && p.optionsSupp.length ? p.optionsSupp.join(', ') : 'Aucune'}</strong></p>
                            <p className="text-[10.5px] text-purple font-semibold mt-0.5">Trajet associé : {p.trajetAssocie}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${stylesStatut[p.statut]}`}>{libellesStatut[p.statut]}</span>
                          <p className="w-20 text-right text-[12px] font-bold text-ink">{p.montantAgence.toLocaleString('fr-FR')} F</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LayoutAgence>
  );
}
