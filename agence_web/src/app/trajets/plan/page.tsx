'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import LayoutAgence from '../../components/LayoutAgence';
import TelephoneInput from '../../components/TelephoneInput';
import { apiFetch } from '../../lib/api';

/**
 * Plan des sièges réel d'un trajet, alimenté par le serveur.
 *
 * Vente au guichet : UN SEUL billet à la fois. Le tronçon souhaité par
 * le client est choisi EN AMONT (avant d'afficher le plan) -- un siège
 * vendu sur un tronçon reste vendable pour un autre tronçon non
 * chevauchant du même trajet (ex: vendu Douala->Bafoussam, encore
 * disponible pour Bafoussam->Yaoundé). Le calcul de chevauchement est
 * fait côté serveur (GET .../plan?ordre_depart=X&ordre_arrivee=Y).
 * Le siège est réellement réservé côté serveur, le billet est créé
 * avec son QR signé, et le client reçoit sa confirmation. Le montant
 * encaissé est calculé par le serveur — jamais par cette page.
 */

type StatutVente = 'disponible' | 'vendu_en_ligne' | 'vendu_physique' | 'reserve' | 'indisponible';

type Siege = {
  id: string;
  numero: string;
  rangee: number;
  position: number;
  type_position: string;
  est_premium: boolean;
  statutVente: StatutVente;
  sourceVente?: string | null;
};

type Troncon = { valeur: string; libelle: string; ordreDepart: number; ordreArrivee: number; prix: number };

const couleurs: Record<StatutVente, { bg: string; text: string; label: string }> = {
  disponible: { bg: 'bg-green-700', text: 'text-white', label: 'Disponible' },
  vendu_en_ligne: { bg: 'bg-red', text: 'text-white', label: 'Vendu en ligne' },
  vendu_physique: { bg: 'bg-amber', text: 'text-ink', label: 'Vendu en physique' },
  reserve: { bg: 'bg-ink-soft', text: 'text-white', label: 'Reserve (verrou 5 min)' },
  indisponible: { bg: 'bg-line', text: 'text-ink-soft', label: 'Indisponible' },
};

export default function PlanSieges() {
  const params = useSearchParams();
  const trajetId = params.get('id');

  const [sieges, setSieges] = useState<Siege[]>([]);
  const [sousTrajetsPossibles, setSousTrajetsPossibles] = useState<Troncon[]>([]);
  const [siegeAVendre, setSiegeAVendre] = useState<Siege | null>(null);
  const [chargement, setChargement] = useState(true);
  const [chargementSieges, setChargementSieges] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [infoTrajet, setInfoTrajet] = useState('');
  const [nomBus, setNomBus] = useState('');
  const [typeBus, setTypeBus] = useState('');
  const [supplementPremium, setSupplementPremium] = useState(0);
  const [departPasse, setDepartPasse] = useState(false);

  // Tronçon verrouillé EN AMONT -- tant qu'il n'est pas choisi, le plan
  // des sièges n'est pas affiché.
  const [tronconVerrouille, setTronconVerrouille] = useState<Troncon | null>(null);

  const [nomClient, setNomClient] = useState('');
  const [telClient, setTelClient] = useState('');
  const [indicatifClient, setIndicatifClient] = useState('+237');
  const [emailClient, setEmailClient] = useState('');
  const [dialoguePreferenceAuto, setDialoguePreferenceAuto] = useState(false);
  const [quantiteBagages, setQuantiteBagages] = useState(0);
  const [prixBagageConfigure, setPrixBagageConfigure] = useState(0);
  const [etapeVente, setEtapeVente] = useState<'formulaire' | 'confirmation'>('formulaire');
  // Le serveur dit si l'email est REELLEMENT parti. L'echec etait
  // auparavant avale en silence, et le guichetier annoncait au client un
  // billet envoye qui n'arrivait jamais.
  const [emailEnvoye, setEmailEnvoye] = useState(true);

  // Charge les infos du trajet + la liste des tronçons vendables --
  // sans encore charger les sièges (inutiles tant que le tronçon n'est
  // pas choisi).
  const chargerInfos = useCallback(async () => {
    if (!trajetId) {
      setErreur('Aucun trajet indiqué.');
      setChargement(false);
      return;
    }
    setChargement(true);
    setErreur(null);
    try {
      const plan = await apiFetch(`/api/reservations/trajets/${trajetId}/plan`);
      const t = plan.trajet || {};
      const date = String(t.date_depart ?? '').split('T')[0];
      setInfoTrajet(`${t.depart ?? ''} → ${t.arrivee ?? ''} · ${date} · ${String(t.heure_depart ?? '').slice(0, 5)}`);
      setNomBus(String(t.nom_bus ?? ''));
      setTypeBus(String(t.type_bus ?? ''));
      setSupplementPremium(Number(t.supplement_premium) || 0);
      setPrixBagageConfigure(Number(t.prix_bagage_supplementaire) || 0);
      if (date && t.heure_depart) {
        setDepartPasse(new Date() > new Date(`${date}T${t.heure_depart}`));
      }

      const rep = await apiFetch('/api/lignes');
      const lignes = (rep.lignes || []) as Record<string, unknown>[];
      const ligne = lignes.find((l) => String(l.id) === String(t.ligne_id)) || lignes[0];
      if (ligne) {
        const points = (ligne.points || []) as Record<string, unknown>[];
        const nomParOrdre = new Map<number, string>();
        points.forEach((pt) => nomParOrdre.set(Number(pt.ordre), String(pt.ville)));
        setSousTrajetsPossibles(
          ((ligne.troncons_prix || []) as Record<string, unknown>[]).map((tr) => {
            const od = Number(tr.ordre_depart);
            const oa = Number(tr.ordre_arrivee);
            const libelle = `${nomParOrdre.get(od) ?? od} → ${nomParOrdre.get(oa) ?? oa}`;
            return { valeur: `${od}-${oa}`, libelle, ordreDepart: od, ordreArrivee: oa, prix: Number(tr.prix) || 0 };
          }),
        );
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setChargement(false);
    }
  }, [trajetId]);

  useEffect(() => { chargerInfos(); }, [chargerInfos]);

  // Charge le plan des sièges filtré pour le tronçon choisi -- un
  // siège n'apparaît "pris" que s'il chevauche réellement ce tronçon.
  const chargerSieges = useCallback(async (troncon: Troncon) => {
    if (!trajetId) return;
    setChargementSieges(true);
    setErreur(null);
    try {
      const plan = await apiFetch(`/api/reservations/trajets/${trajetId}/plan?ordre_depart=${troncon.ordreDepart}&ordre_arrivee=${troncon.ordreArrivee}`);
      setSieges(
        ((plan.sieges || []) as Record<string, unknown>[]).map((x) => {
          const dispo = String(x.disponibilite);
          let statutVente: StatutVente;
          if (dispo === 'disponible') statutVente = 'disponible';
          else if (dispo === 'pris') statutVente = x.source_vente === 'physique' ? 'vendu_physique' : 'vendu_en_ligne';
          else statutVente = 'indisponible';
          return {
            id: String(x.id),
            numero: String(x.numero),
            rangee: Number(x.rangee) || 0,
            position: Number(x.position) || 0,
            type_position: String(x.type_position ?? ''),
            est_premium: x.est_premium === true,
            statutVente,
            sourceVente: x.source_vente ? String(x.source_vente) : null,
          } as Siege;
        }),
      );
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement du plan impossible');
    } finally {
      setChargementSieges(false);
    }
  }, [trajetId]);

  function choisirTroncon(troncon: Troncon) {
    setTronconVerrouille(troncon);
    chargerSieges(troncon);
  }

  function changerDeTroncon() {
    setTronconVerrouille(null);
    setSieges([]);
  }

  const rangees = Array.from(new Set(sieges.map((s) => s.rangee))).sort((a, b) => a - b);
  const nbVendus = sieges.filter((s) => s.statutVente === 'vendu_en_ligne' || s.statutVente === 'vendu_physique').length;
  const nbTotal = sieges.filter((s) => s.statutVente !== 'indisponible').length;

  function ouvrirVente(siege: Siege) {
    if (departPasse) {
      setErreur('L\'heure de départ de ce trajet est déjà passée — la vente au guichet est fermée.');
      return;
    }
    setSiegeAVendre(siege);
    setEtapeVente('formulaire');
    setNomClient(''); setTelClient(''); setEmailClient('');
    setQuantiteBagages(0);
    setErreur(null);
  }

  function tirerEtOuvrir(pool: Siege[]) {
    if (pool.length === 0) return;
    const choisi = pool[Math.floor(Math.random() * pool.length)];
    ouvrirVente(choisi);
  }

  function selectionAleatoire() {
    if (typeBus === 'mixte') {
      setDialoguePreferenceAuto(true);
      return;
    }
    tirerEtOuvrir(sieges.filter((s) => s.statutVente === 'disponible'));
  }

  function confirmerPreferenceAuto(veutPremium: boolean) {
    setDialoguePreferenceAuto(false);
    const filtres = sieges.filter((s) => s.statutVente === 'disponible' && s.est_premium === veutPremium);
    if (filtres.length === 0) {
      setErreur(`Aucun siège ${veutPremium ? 'premium' : 'standard'} disponible pour l'instant.`);
      return;
    }
    tirerEtOuvrir(filtres);
  }

  const prixEstime = (() => {
    if (!tronconVerrouille) return null;
    const supplementSiegePhysique = siegeAVendre?.est_premium ? supplementPremium : 0;
    return tronconVerrouille.prix + supplementSiegePhysique + (quantiteBagages * prixBagageConfigure);
  })();

  async function confirmerVente() {
    if (!siegeAVendre || !nomClient.trim() || !telClient.trim() || !tronconVerrouille || enCours) return;

    setEnCours(true);
    setErreur(null);
    try {
      // Le prix exact (agence + suppléments) est calculé et facturé
      // par le serveur -- pas de ressaisie manuelle du montant côté
      // agence. Ce qui est affiché ici n'est qu'une estimation à
      // titre indicatif pour l'agent.
      const vente = await apiFetch(`/api/reservations/trajets/${trajetId}/vente-guichet`, {
        method: 'POST',
        body: JSON.stringify({
          siege_id: siegeAVendre.id,
          nom_client: nomClient.trim(),
          telephone_client: `${indicatifClient}${telClient.trim()}`,
          email_client: emailClient.trim() || undefined,
          point_embarquement_ordre: tronconVerrouille.ordreDepart,
          point_debarquement_ordre: tronconVerrouille.ordreArrivee,
          supplement_bagage: quantiteBagages > 0 ? quantiteBagages * prixBagageConfigure : undefined,
          quantite_bagages: quantiteBagages > 0 ? quantiteBagages : undefined,
        }),
      });
      setEmailEnvoye(vente?.email_envoye !== false);
      setSieges((prev) => prev.map((s) => (s.id === siegeAVendre.id ? { ...s, statutVente: 'vendu_physique', sourceVente: 'physique' } : s)));
      setEtapeVente('confirmation');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'La vente a échoué');
    } finally {
      setEnCours(false);
    }
  }

  function fermerVente() {
    setSiegeAVendre(null);
  }

  return (
    <LayoutAgence>
      <div className="max-w-3xl mx-auto">
        <Link href="/trajets" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink transition-colors mb-6">
          ← Retour a la liste
        </Link>

        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-extrabold text-ink">Plan des sieges</h1>
            <p className="text-[12px] text-ink-soft mt-0.5">{infoTrajet}</p>
          </div>
          {tronconVerrouille && (
            <button
              onClick={selectionAleatoire}
              disabled={departPasse}
              className="flex items-center gap-2 rounded-xl bg-purple hover:bg-purple/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-3.5 shadow-lg shadow-purple/25 transition-colors"
            >
              🎲 Choix auto du siège
            </button>
          )}
        </div>
        <p className="text-sm text-ink-soft mb-6">{nomBus}</p>

        {departPasse && (
          <div className="rounded-2xl p-4 mb-6 bg-red-bg border border-red/20">
            <p className="text-sm font-bold text-red">Vente fermée</p>
            <p className="text-sm text-red">L&apos;heure de départ de ce trajet est déjà passée — la vente au guichet n&apos;est plus possible.</p>
          </div>
        )}

        {chargement && (
          <div className="rounded-2xl p-4 mb-6 bg-paper border border-line">
            <p className="text-sm text-ink-soft">Chargement du trajet...</p>
          </div>
        )}

        {erreur && (
          <div className="rounded-2xl p-4 mb-6 bg-red/6 border border-red/20">
            <p className="text-sm text-red">{erreur}</p>
            <button onClick={chargerInfos} className="text-sm font-bold text-green-700 mt-1">Réessayer</button>
          </div>
        )}

        {!chargement && !tronconVerrouille && !departPasse && (
          <div className="bg-paper rounded-3xl border border-line shadow-sm p-8">
            <p className="text-sm font-bold text-ink mb-1">Quel trajet le client souhaite-t-il ?</p>
            <p className="text-xs text-ink-soft mb-5">
              Un siège vendu sur un tronçon reste disponible pour un autre tronçon non
              chevauchant du même trajet -- précise d&apos;abord le tronçon pour voir les
              sièges réellement libres pour ce segment.
            </p>
            {sousTrajetsPossibles.length === 0 ? (
              <p className="text-sm text-ink-soft">Aucun tronçon vendable trouvé pour ce trajet.</p>
            ) : (
              <div className="space-y-2">
                {sousTrajetsPossibles.map((t) => (
                  <button
                    key={t.valeur}
                    onClick={() => choisirTroncon(t)}
                    className="w-full flex items-center justify-between rounded-xl border border-line hover:border-green-700 hover:bg-green-700/5 px-4 py-3 text-left transition-colors"
                  >
                    <span className="text-sm font-semibold text-ink">{t.libelle}</span>
                    <span className="text-sm font-bold text-green-700">{t.prix} FCFA</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tronconVerrouille && (
          <>
            <div className="flex items-center justify-between rounded-2xl bg-purple/8 border border-purple/20 px-4 py-3 mb-6">
              <p className="text-sm text-ink">
                Tronçon choisi : <span className="font-bold">{tronconVerrouille.libelle}</span> — {tronconVerrouille.prix} FCFA
              </p>
              <button onClick={changerDeTroncon} className="text-[11.5px] font-bold text-purple hover:underline shrink-0 ml-3">
                Changer de tronçon
              </button>
            </div>

            <div className="flex flex-wrap gap-4 mb-6">
              {(Object.keys(couleurs) as StatutVente[]).map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded ${couleurs[s].bg}`} />
                  <span className="text-xs text-ink-soft">{couleurs[s].label}</span>
                </div>
              ))}
            </div>

            {chargementSieges ? (
              <div className="rounded-2xl p-4 mb-6 bg-paper border border-line">
                <p className="text-sm text-ink-soft">Chargement du plan pour ce tronçon...</p>
              </div>
            ) : (
              <>
                <div className="bg-paper rounded-3xl border border-line shadow-sm p-8">
                  <div className="flex justify-end mb-6">
                    <div className="w-10 h-10 rounded-xl bg-off-white flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--c-ink-soft))" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                      </svg>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {rangees.map((rangee) => {
                      const siegesRangee = sieges.filter((s) => s.rangee === rangee).sort((a, b) => a.position - b.position);
                      let dernierIdxGauche = -1;
                      siegesRangee.forEach((s, idx) => { if (s.type_position.endsWith('_gauche')) dernierIdxGauche = idx; });
                      const idxCouloir = dernierIdxGauche + 1;

                      return (
                        <div key={rangee} className="flex items-center gap-2">
                          <span className="w-5 text-xs text-ink-soft font-semibold">{rangee}</span>
                          <div className="flex gap-2 flex-1">
                            {siegesRangee.map((siege, i) => (
                              <div key={siege.id} className="flex items-center">
                                {i === idxCouloir && <div className="w-5" />}
                                <button
                                  disabled={siege.statutVente !== 'disponible' || departPasse}
                                  onClick={() => ouvrirVente(siege)}
                                  className={`relative w-11 h-11 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors ${couleurs[siege.statutVente].bg} ${couleurs[siege.statutVente].text} ${
                                    siege.statutVente === 'disponible' && !departPasse ? 'hover:ring-2 hover:ring--ink/20 cursor-pointer' : 'cursor-default'
                                  }`}
                                >
                                  {siege.numero}
                                  {siege.est_premium && (
                                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-paper shadow flex items-center justify-center text-[8px]">⭐</span>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 bg-paper rounded-2xl border border-line px-5 py-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">Places vendues (ce tronçon) : {nbVendus}/{nbTotal}</span>
                  <span className="text-xs text-ink-soft">⭐ = siege premium</span>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {dialoguePreferenceAuto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={() => setDialoguePreferenceAuto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper rounded-3xl p-7 max-w-sm w-full">
            <p className="text-sm font-bold text-ink mb-1">Quel type de siège ?</p>
            <p className="text-xs text-ink-soft mb-5">Ce bus est mixte — précise le type souhaité, le tirage se fera parmi les sièges correspondants.</p>
            <div className="flex gap-3">
              <button onClick={() => confirmerPreferenceAuto(false)} className="flex-1 rounded-xl bg-off-white text-ink font-bold text-sm py-3">Standard</button>
              <button onClick={() => confirmerPreferenceAuto(true)} className="flex-1 rounded-xl bg-amber text-ink font-bold text-sm py-3">⭐ Premium</button>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire vente un billet (manuel ou aleatoire, meme flux) --
          le tronçon est déjà fixé en amont, plus besoin de le redemander. */}
      {siegeAVendre && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={fermerVente}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper rounded-3xl p-8 max-w-sm w-full">
            {etapeVente === 'formulaire' ? (
              <>
                <p className="text-sm font-bold text-ink mb-1">Vente du siege {siegeAVendre.numero}</p>
                {siegeAVendre.est_premium && (
                  <p className="text-[11.5px] font-bold text-amber mb-1">⭐ Siège premium (+{supplementPremium} FCFA)</p>
                )}
                <p className="text-[11.5px] text-purple font-semibold mb-1">{tronconVerrouille?.libelle}</p>
                <p className="text-xs text-ink-soft mb-5">Un seul billet a la fois. Renseigne les infos du client.</p>
                <div className="space-y-3 mb-5">
                  <input value={nomClient} onChange={(e) => setNomClient(e.target.value)} placeholder="Nom du client" className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm" />
                  <TelephoneInput indicatif={indicatifClient} numero={telClient} onChangeIndicatif={setIndicatifClient} onChangeNumero={setTelClient} />
                  <input type="email" value={emailClient} onChange={(e) => setEmailClient(e.target.value)} placeholder="Email (pour la confirmation)" className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm" />
                  <div className="bg-off-white rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-ink">Bagage supplémentaire ({prixBagageConfigure} FCFA/unité)</span>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setQuantiteBagages((q) => Math.max(0, q - 1))} className="w-7 h-7 rounded-lg bg-paper border border-line text-ink font-bold">−</button>
                      <span className="w-5 text-center text-sm font-bold text-ink">{quantiteBagages}</span>
                      <button type="button" onClick={() => setQuantiteBagages((q) => q + 1)} className="w-7 h-7 rounded-lg bg-paper border border-line text-ink font-bold">+</button>
                    </div>
                  </div>
                </div>
                {prixEstime !== null && (
                  <p className="text-[12px] text-ink-soft mb-4">Montant à payer : <span className="font-bold text-ink">{prixEstime} FCFA</span></p>
                )}
                {erreur && <p className="text-[11.5px] text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</p>}
                <div className="flex gap-3">
                  <button onClick={fermerVente} className="flex-1 rounded-xl bg-off-white text-ink font-bold text-sm py-3">Annuler</button>
                  <button
                    onClick={confirmerVente}
                    disabled={!nomClient.trim() || !telClient.trim() || enCours}
                    className="flex-1 rounded-xl bg-amber disabled:opacity-40 text-ink font-bold text-sm py-3"
                  >
                    {enCours ? '…' : 'Vendre'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-700/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✓</span>
                </div>
                <p className="text-sm font-bold text-ink mb-1">Siege {siegeAVendre.numero} vendu</p>
                <p className="text-[11.5px] text-purple font-semibold mb-2">{tronconVerrouille?.libelle}</p>
                {emailClient && !emailEnvoye ? (
                  <p className="text-xs text-red font-semibold mb-6">
                    Le billet est bien vendu, mais l&apos;email n&apos;a pas pu partir a {emailClient}.
                    Remettez le billet imprime au client.
                  </p>
                ) : (
                  <p className="text-xs text-ink-soft mb-6">
                    {emailClient
                      ? `Email de confirmation envoye a ${emailClient}.`
                      : 'Aucun email fourni -- confirmation non envoyee.'}
                  </p>
                )}
                <button onClick={fermerVente} className="w-full rounded-xl bg-green-700 text-white font-bold text-sm py-3.5">Fermer</button>
              </div>
            )}
          </div>
        </div>
      )}
    </LayoutAgence>
  );
}
