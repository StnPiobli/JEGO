'use client';

// Données réelles du backend.
//
// Champs volontairement limités à ce qui concerne l'agence :
// options supp. = uniquement bagage/premium (pas les options internes
// JEGO), montant = net perçu par l'agence (pas le prix payé par le
// client, qui inclut la commission JEGO et les frais annexes).

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LayoutAgence from '../components/LayoutAgence';
import DateNavigator from '../components/DateNavigator';
import { todayInputDate } from '../lib/date';
import { apiFetch } from '../lib/api';
import { formatTelephone } from '../lib/format';

type Passager = {
  id: string;
  billetId: string;
  guichet: boolean; // vendu au guichet : seule l'agence peut l'annuler
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
  // Trajet affiché en grand. On garde l'identifiant plutôt que l'objet :
  // un rechargement des données ne laisse pas une fiche périmée ouverte.
  const [trajetVuId, setTrajetVuId] = useState<string | null>(null);
  // Arrivee depuis la page Trajets : on ouvre la fiche du voyage vise et
  // on propose un retour vers Trajets, pas vers l'accueil des
  // reservations.
  const [voyageCible, setVoyageCible] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  const [rechercheFiche, setRechercheFiche] = useState('');
  const [tousLesTrajets, setTousLesTrajets] = useState<TrajetAvecPassagers[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [annulationGuichet, setAnnulationGuichet] = useState<Passager | null>(null);
  const [messageAnnulation, setMessageAnnulation] = useState<string | null>(null);

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
                billetId: String(p.id),
                guichet: p.source_vente === 'physique',
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

  // Le client du guichet renonce avant le départ : l'agence lui rend
  // ses espèces, le siège est remis en vente.
  async function annulerBilletGuichet() {
    if (!annulationGuichet) return;
    try {
      const rep = await apiFetch(`/api/annulations/billets/${annulationGuichet.billetId}/annuler-guichet`, {
        method: 'PUT',
        body: JSON.stringify({}),
      });
      setMessageAnnulation(rep.message || 'Billet annulé');
      await charger();
    } catch (e) {
      setMessageAnnulation(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setAnnulationGuichet(null);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get('date');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDateChoisie(d);
    const v = params.get('voyage');
    if (v) setVoyageCible(v);
  }, []);

  // Des que les trajets sont charges, on ouvre celui qui est vise.
  useEffect(() => {
    if (!voyageCible || tousLesTrajets.length === 0) return;
    const cible = tousLesTrajets.find((t) => t.numeroVoyage === voyageCible);
    if (cible) setTrajetVuId(cible.id);
  }, [voyageCible, tousLesTrajets]);

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

  const trajetVu = useMemo(
    () => tousLesTrajets.find((t) => t.id === trajetVuId) ?? null,
    [tousLesTrajets, trajetVuId],
  );

  // Fermeture au clavier, comme sur les autres fiches détaillées.
  useEffect(() => {
    if (!trajetVuId) return;
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') setTrajetVuId(null); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [trajetVuId]);

  // La recherche de la fiche ne porte que sur ses propres passagers : on
  // la vide en changeant de trajet pour ne pas ouvrir une liste filtree
  // par un terme saisi sur le trajet precedent.
  useEffect(() => { setRechercheFiche(''); }, [trajetVuId]);

  const passagersFiltres = useMemo(() => {
    if (!trajetVu) return [] as Passager[];
    const terme = rechercheFiche.trim().toLowerCase();
    if (!terme) return trajetVu.passagers;
    return trajetVu.passagers.filter((p) =>
      [p.nom, p.id, p.telephone, formatTelephone(p.telephone), p.email, p.siege, p.trajetAssocie, ...(p.optionsSupp || []), libellesStatut[p.statut]]
        .join(' ').toLowerCase().includes(terme),
    );
  }, [trajetVu, rechercheFiche]);

  function stats(t: TrajetAvecPassagers) {
    const actifs = t.passagers.filter((p) => p.statut !== 'annule');
    return { reservations: actifs.length, embarques: t.passagers.filter((p) => p.statut === 'embarque').length, argent: actifs.reduce((s, p) => s + p.montantAgence, 0), remplissage: Math.round((actifs.length / t.capacite) * 100) };
  }

  return (
    <LayoutAgence>
      <div className="max-w-5xl mx-auto">
        {voyageCible && (
          <Link href="/trajets" className="inline-flex items-center gap-1 text-[12px] font-semibold text-green-700 hover:underline mb-2">
            ← Retour aux trajets
          </Link>
        )}
        <h1 className="text-[28px] font-extrabold text-ink mb-1">Reservations</h1>
        <p className="text-[13px] text-ink-soft mb-4">Par trajet — montants nets perçus par ton agence, options supplémentaires te concernant.</p>

        {erreur && (
          <div className="rounded-2xl p-3 mb-3 bg-red/6 border border-red/20">
            <p className="text-[11px] text-red">{erreur}</p>
            <button onClick={charger} className="text-[11px] font-bold text-green-700 mt-1">Réessayer</button>
          </div>
        )}

        <div className="mb-3">
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="🔍 Rechercher une réservation sur toutes les dates (nom, téléphone, trajet, siège, ID…)" className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[13px]" />
        </div>

        {recherche.trim() && (
          <div className="bg-paper rounded-2xl border border-line overflow-hidden mb-3">
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

        <DateNavigator date={dateChoisie} onChange={setDateChoisie} className="mb-3" />

        {chargement ? (
          <div className="bg-paper rounded-2xl border border-line p-10 text-center"><p className="text-[13px] text-ink-soft">Chargement des réservations...</p></div>
        ) : trajetsDuJour.length === 0 ? (
          <div className="bg-paper rounded-2xl border border-line p-10 text-center"><p className="text-[13px] text-ink-soft">Aucun trajet ce jour-la.</p></div>
        ) : (
          <div className="space-y-4">
            {trajetsDuJour.map((t) => {
              const s = stats(t);
              return (
                <div key={t.id} className="bg-paper rounded-2xl border border-line overflow-hidden">
                  <button onClick={() => setTrajetVuId(t.id)} className="w-full text-left px-5 py-4 hover:bg-off-white transition-colors">
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
                      <span className="text-[11px] font-semibold text-green-700 shrink-0 whitespace-nowrap">Voir les reservations →</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                      <div><p className="text-[10px] text-ink-soft">Places</p><p className="text-[13px] font-bold text-ink">{t.capacite}</p></div>
                      <div><p className="text-[10px] text-ink-soft">Reservations</p><p className="text-[13px] font-bold text-ink">{s.reservations}</p></div>
                      {t.demarre && <div><p className="text-[10px] text-ink-soft">Embarques</p><p className="text-[13px] font-bold text-ink">{s.embarques}</p></div>}
                      <div><p className="text-[10px] text-ink-soft">Net perçu (agence)</p><p className="text-[13px] font-bold text-green-700">{s.argent.toLocaleString('fr-FR')} F</p></div>
                      <div><p className="text-[10px] text-ink-soft">Remplissage</p><p className="text-[13px] font-bold text-ink">{s.remplissage}%</p></div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {trajetVu && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={() => setTrajetVuId(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-line rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto scroll-mince shadow-xl">
            <div className="bg-gradient-to-br from-green-700 to-green-900 px-7 pt-7 pb-5 rounded-t-3xl sticky top-0 z-10">
              <div className="flex items-start gap-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[17px] font-display font-bold text-white truncate">{trajetVu.trajet}</p>
                    <span className="text-[10px] font-mono text-white/70">{trajetVu.numeroVoyage}</span>
                    {trajetVu.demarre && <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[10px] font-bold">En cours</span>}
                  </div>
                  <p className="text-[12px] text-white/80 mt-0.5">{trajetVu.date.split('-').reverse().join('/')} · {chaineHoraires(trajetVu)}</p>
                  <p className="text-[11.5px] text-white/70 mt-0.5">
                    {trajetVu.pointsDetail.length > 0
                      ? trajetVu.pointsDetail.map((p, i, arr) => (
                          <span key={i}>
                            <span className="font-bold text-white">{p.ville}</span>
                            {p.lieu && <span> ({p.lieu})</span>}
                            {i < arr.length - 1 && <span> → </span>}
                          </span>
                        ))
                      : <span className="font-bold text-white">{trajetVu.trajet}</span>}
                  </p>
                </div>
                <button onClick={() => setTrajetVuId(null)} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm shrink-0" aria-label="Fermer">✕</button>
              </div>
            </div>

            <div className="px-7 pt-5">
              {(() => {
                const s = stats(trajetVu);
                return (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="rounded-2xl bg-off-white p-4"><p className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-1">Places</p><p className="text-[20px] font-display font-bold text-ink">{trajetVu.capacite}</p></div>
                    <div className="rounded-2xl bg-off-white p-4"><p className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-1">Reservations</p><p className="text-[20px] font-display font-bold text-ink">{s.reservations}</p></div>
                    {trajetVu.demarre && <div className="rounded-2xl bg-off-white p-4"><p className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-1">Embarques</p><p className="text-[20px] font-display font-bold text-ink">{s.embarques}</p></div>}
                    <div className="rounded-2xl bg-off-white p-4"><p className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-1">Net perçu</p><p className="text-[20px] font-display font-bold text-green-700">{s.argent.toLocaleString('fr-FR')} F</p></div>
                    <div className="rounded-2xl bg-off-white p-4"><p className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-1">Remplissage</p><p className="text-[20px] font-display font-bold text-ink">{s.remplissage}%</p></div>
                  </div>
                );
              })()}
            </div>

            <div className="px-7 py-5">
              <div className="flex items-center justify-between gap-4 mb-2">
                <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wide">
                  Passagers ({rechercheFiche.trim() ? `${passagersFiltres.length}/${trajetVu.passagers.length}` : trajetVu.passagers.length})
                </p>
                {trajetVu.passagers.length > 0 && (
                  <div className="relative w-[280px] max-w-[55%]">
                    <input
                      value={rechercheFiche}
                      onChange={(e) => setRechercheFiche(e.target.value)}
                      placeholder="🔍 Rechercher un passager (nom, tel, siege, ID…)"
                      className="w-full rounded-xl border border-line bg-off-white pl-3 pr-8 py-2 text-[12px]"
                    />
                    {rechercheFiche && (
                      <button onClick={() => setRechercheFiche('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full text-ink-soft hover:bg-line flex items-center justify-center text-[11px]" aria-label="Effacer la recherche">✕</button>
                    )}
                  </div>
                )}
              </div>
              {trajetVu.passagers.length === 0 ? (
                <div className="rounded-2xl border border-line p-8 text-center"><p className="text-[13px] text-ink-soft">Aucune reservation sur ce trajet.</p></div>
              ) : passagersFiltres.length === 0 ? (
                <div className="rounded-2xl border border-line p-8 text-center"><p className="text-[13px] text-ink-soft">Aucun passager ne correspond a cette recherche.</p></div>
              ) : (
                <div className="rounded-2xl border border-line divide-y divide-line overflow-hidden">
                  {passagersFiltres.map((p) => (
                    <div key={p.id} className="px-5 py-3.5 flex items-start gap-4">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{p.nom.split(' ').map((n) => n[0]).join('')}</div>
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
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${stylesStatut[p.statut]}`}>{libellesStatut[p.statut]}</span>
                        {p.guichet && p.statut === 'confirme' && !trajetVu.demarre && (
                          <button onClick={() => setAnnulationGuichet(p)} className="text-[10px] font-semibold text-red underline">Annuler (guichet)</button>
                        )}
                      </div>
                      <p className="w-20 text-right text-[12px] font-bold text-ink shrink-0">{p.montantAgence.toLocaleString('fr-FR')} F</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {messageAnnulation && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-white text-[12px] rounded-xl px-4 py-2.5 z-[80] shadow-lg" onClick={() => setMessageAnnulation(null)}>
          {messageAnnulation}
        </div>
      )}

      {annulationGuichet && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-[70]" onClick={() => setAnnulationGuichet(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper rounded-2xl p-7 max-w-md w-full border border-line">
            <p className="text-[16px] font-display font-semibold text-ink mb-2">Annuler ce billet du guichet</p>
            <p className="text-[12px] text-ink-soft mb-4">
              {annulationGuichet.nom} · siège {annulationGuichet.siege} · #{annulationGuichet.id}. Le siège est remis en vente et le client est remboursé en espèces au guichet, par vous.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAnnulationGuichet(null)} className="flex-1 rounded-lg bg-off-white border border-line text-ink font-semibold text-[11px] py-2.5">Retour</button>
              <button onClick={annulerBilletGuichet} className="flex-1 rounded-lg bg-red text-white font-semibold text-[11px] py-2.5">Annuler le billet</button>
            </div>
          </div>
        </div>
      )}
    </LayoutAgence>
  );
}
