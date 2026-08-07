'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import LayoutAgence from '../../components/LayoutAgence';
import { VILLES } from '../../villes';
import { todayInputDate } from '../../lib/date';
import { apiFetch } from '../../lib/api';

/**
 * Formulaire d'ajout d'un trajet. La ligne (ville depart/arrivee, points
 * intermediaires, prix par tronçon) est creee A LA VOLEE ici via
 * POST /api/lignes, puis le trajet via POST /api/trajets avec le
 * ligne_id obtenu (2 appels enchaines). Branche sur le vrai backend --
 * plus de simulation.
 *
 * Bus et chauffeurs viennent maintenant de GET /api/bus et
 * GET /api/chauffeurs (listes reelles de l'agence), plus de demo.
 *
 * Reste en facade, sans colonne backend derriere : le prix bagage
 * supplementaire et le supplement siege premium par defaut de ce
 * formulaire (ces valeurs se configurent aujourd'hui au moment de
 * l'achat du billet, pas au niveau du trajet).
 */

const categories = [
  { valeur: 'standard', libelle: 'Standard' },
  { valeur: 'vip', libelle: 'VIP' },
  { valeur: 'express', libelle: 'Express' },
  { valeur: 'nuit', libelle: 'Nuit' },
] as const;

type Bus = { id: string; nom: string; type_bus: string; disposition: string; nombre_sieges: string | number };
type Chauffeur = { id: string; nom: string; prenom: string; statut: string };

type Arret = { ville: string; heure: string; lieuPriseEnCharge: string };

export default function NouveauTrajet() {
  const params = useSearchParams();
  const router = useRouter();
  const dupliquer = params.get('dupliquer') === '1';

  // Ligne (creee a la volee)
  const [villeDepart, setVilleDepart] = useState('');
  const [villeArrivee, setVilleArrivee] = useState('');
  const [avecArrets, setAvecArrets] = useState(false);
  const [arrets, setArrets] = useState<Arret[]>([{ ville: '', heure: '', lieuPriseEnCharge: '' }]);
  const [prixCombinaisons, setPrixCombinaisons] = useState<Record<string, string>>({});

  // Bus et chauffeurs reels de l'agence
  const [busListe, setBusListe] = useState<Bus[]>([]);
  const [chauffeursListe, setChauffeursListe] = useState<Chauffeur[]>([]);
  const [chargementListes, setChargementListes] = useState(true);

  useEffect(() => {
    async function charger() {
      try {
        const [resBus, resChauffeurs] = await Promise.all([
          apiFetch('/api/bus'),
          apiFetch('/api/chauffeurs'),
        ]);
        setBusListe(resBus.bus || []);
        setChauffeursListe((resChauffeurs.chauffeurs || []).filter((c: Chauffeur) => c.statut === 'actif'));
      } catch {
        setErreur('Impossible de charger tes bus et chauffeurs. Recharge la page.');
      } finally {
        setChargementListes(false);
      }
    }
    charger();
  }, []);

  function nomVille(code: string) {
    return VILLES.find((v) => v.code === code)?.nom || code || '...';
  }

  /** Villes déjà choisies ailleurs dans ce trajet (départ, arrêts, arrivée),
   * en excluant l'emplacement qu'on est en train d'éditer -- pour empêcher
   * qu'une même ville soit sélectionnée deux fois et casse les combinaisons. */
  function villesDejaUtilisees(emplacementActuel: 'depart' | 'arrivee' | number): Set<string> {
    const utilisees = new Set<string>();
    if (emplacementActuel !== 'depart' && villeDepart) utilisees.add(villeDepart);
    if (emplacementActuel !== 'arrivee' && villeArrivee) utilisees.add(villeArrivee);
    arrets.forEach((a, i) => {
      if (emplacementActuel !== i && a.ville) utilisees.add(a.ville);
    });
    return utilisees;
  }
  function optionsVilles(emplacementActuel: 'depart' | 'arrivee' | number) {
    const exclues = villesDejaUtilisees(emplacementActuel);
    return VILLES.filter((v) => !exclues.has(v.code));
  }

  const pointsOrdonnes = useMemo(() => {
    const points = [villeDepart];
    if (avecArrets) points.push(...arrets.map((a) => a.ville));
    points.push(villeArrivee);
    return points;
  }, [villeDepart, villeArrivee, avecArrets, arrets]);

  const combinaisons = useMemo(() => {
    const resultats: { cle: string; depart: string; arrivee: string; ordreDepart: number; ordreArrivee: number }[] = [];
    for (let i = 0; i < pointsOrdonnes.length; i++) {
      for (let j = i + 1; j < pointsOrdonnes.length; j++) {
        resultats.push({ cle: `${i}-${j}`, depart: pointsOrdonnes[i], arrivee: pointsOrdonnes[j], ordreDepart: i, ordreArrivee: j });
      }
    }
    return resultats;
  }, [pointsOrdonnes]);

  function prixCombinaison(cle: string) {
    return prixCombinaisons[cle] ?? '';
  }
  function setPrixCombinaisonAt(cle: string, valeur: string) {
    setPrixCombinaisons((prev) => ({ ...prev, [cle]: valeur }));
  }
  const [pointDepart, setPointDepart] = useState('');
  const [pointArrivee, setPointArrivee] = useState('');

  // Trajet
  const [busId, setBusId] = useState('');
  const [chauffeurId, setChauffeurId] = useState('');
  const [dateDepart, setDateDepart] = useState(todayInputDate());
  const [heureDepart, setHeureDepart] = useState('');
  const [heureArrivee, setHeureArrivee] = useState('');
  const [categorie, setCategorie] = useState<typeof categories[number]['valeur']>('standard');
  const [distributionNourriture, setDistributionNourriture] = useState(false);

  // Tarifs additionnels (facade -- aucun champ backend sur trajets pour ça)
  const [prixBagage, setPrixBagage] = useState('1000');
  const [supplementPremium, setSupplementPremium] = useState('1500');

  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);

  // Prefill si on arrive depuis "Dupliquer" (voir /trajets, bouton Dupliquer).
  // Date et heure restent VIDES volontairement -- c'est ce qui doit changer.
  useEffect(() => {
    if (!dupliquer) return;
    setVilleDepart(params.get('ville_depart') || '');
    setVilleArrivee(params.get('ville_arrivee') || '');
    setBusId(params.get('bus_id') || '');
    setChauffeurId(params.get('chauffeur_id') || '');
    setCategorie((params.get('categorie') as typeof categorie) || 'standard');
    setPointDepart(params.get('point_depart') || '');
    setPointArrivee(params.get('point_arrivee') || '');
  }, [dupliquer, params]);

  function ajouterArret() {
    setArrets((a) => [...a, { ville: '', heure: '', lieuPriseEnCharge: '' }]);
  }
  function retirerArret(index: number) {
    setArrets((a) => a.filter((_, i) => i !== index));
  }
  function modifierArret(index: number, champ: keyof Arret, valeur: string) {
    setArrets((a) => a.map((ar, i) => (i === index ? { ...ar, [champ]: valeur } : ar)));
  }

  async function creerTrajet(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (!villeDepart || !villeArrivee || !busId || !dateDepart || !heureDepart || !heureArrivee) {
      setErreur('Ville de depart, ville d\'arrivee, bus, date, heure de depart et heure d\'arrivee sont obligatoires.');
      return;
    }
    if (villeDepart === villeArrivee) {
      setErreur('La ville de depart et d\'arrivee ne peuvent pas etre identiques.');
      return;
    }
    if (avecArrets && arrets.some((a) => !a.ville)) {
      setErreur('Choisis une ville pour chaque arret ajoute (ou retire les arrets vides).');
      return;
    }
    if (new Set(pointsOrdonnes).size !== pointsOrdonnes.length) {
      setErreur('Une meme ville apparait plusieurs fois dans ce trajet -- chaque point doit etre unique.');
      return;
    }

    // Le prix du segment complet (premier point -> dernier point) est
    // obligatoire côté backend -- sans lui, aucun trajet sur cette ligne
    // ne pourra être recherché ni réservé.
    const dernierOrdre = pointsOrdonnes.length - 1;
    const prixSegmentComplet = prixCombinaison(`0-${dernierOrdre}`);
    if (!prixSegmentComplet || Number(prixSegmentComplet) <= 0) {
      setErreur(`Le prix du trajet complet (${nomVille(villeDepart)} → ${nomVille(villeArrivee)}) est obligatoire.`);
      return;
    }

    setEnregistrement(true);

    try {
      // 1. Créer la ligne, avec ses points et ses prix par tronçon.
      const points = pointsOrdonnes.map((ville, i) => {
        let lieu = '';
        if (i === 0) lieu = pointDepart;
        else if (i === dernierOrdre) lieu = pointArrivee;
        else lieu = arrets[i - 1]?.lieuPriseEnCharge || '';
        return { ville, lieu_prise_en_charge: lieu || null };
      });

      const troncons_prix = Object.entries(prixCombinaisons)
        .filter(([, valeur]) => valeur && Number(valeur) > 0)
        .map(([cle, valeur]) => {
          const [ordreDepart, ordreArrivee] = cle.split('-').map(Number);
          return { ordre_depart: ordreDepart, ordre_arrivee: ordreArrivee, prix: Number(valeur) };
        });

      const resultatLigne = await apiFetch('/api/lignes', {
        method: 'POST',
        body: JSON.stringify({
          ville_depart: villeDepart,
          ville_arrivee: villeArrivee,
          est_direct: !avecArrets,
          points,
          troncons_prix,
        }),
      });
      const ligneId = resultatLigne.ligne.id;

      // 2. Créer le trajet sur cette ligne. prix_base = prix du segment
      // complet (fallback historique, notamment lu par escrow/rapports).
      const resultatTrajet = await apiFetch('/api/trajets', {
        method: 'POST',
        body: JSON.stringify({
          ligne_id: ligneId,
          bus_id: busId,
          date_depart: dateDepart,
          heure_depart: heureDepart,
          heure_arrivee_estimee: heureArrivee,
          prix_base: Number(prixSegmentComplet),
          categorie,
        }),
      });

      // L'assignation du chauffeur est une route séparée (PUT /:id/chauffeur),
      // pas un champ accepté à la création -- deuxième appel si renseigné.
      if (chauffeurId) {
        await apiFetch(`/api/trajets/${resultatTrajet.trajet.id}/chauffeur`, {
          method: 'PUT',
          body: JSON.stringify({ chauffeur_id: chauffeurId }),
        });
      }

      router.push('/trajets');

    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur lors de la création du trajet.');
      setEnregistrement(false);
    }
  }

  return (
    <LayoutAgence>

      <div className="max-w-2xl mx-auto">
        <Link
          href="/trajets"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink transition-colors mb-6"
        >
          ← Retour a la liste
        </Link>

        <h1 className="text-2xl font-extrabold text-ink mb-1">Nouveau trajet</h1>
        <p className="text-sm text-ink-soft mb-6">
          La ligne (villes + arrets) est creee automatiquement avec ce trajet.
        </p>

        <form onSubmit={creerTrajet} className="bg-paper rounded-3xl border border-line shadow-sm p-8 space-y-5">
          {/* Villes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">Ville de depart</label>
              <select
                value={villeDepart}
                onChange={(e) => { setVilleDepart(e.target.value); setErreur(null); }}
                className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm text-ink transition-colors"
              >
                <option value="">Choisir...</option>
                {optionsVilles('depart').map((v) => <option key={v.code} value={v.code}>{v.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">Ville d&apos;arrivee</label>
              <select
                value={villeArrivee}
                onChange={(e) => { setVilleArrivee(e.target.value); setErreur(null); }}
                className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm text-ink transition-colors"
              >
                <option value="">Choisir...</option>
                {optionsVilles('arrivee').map((v) => <option key={v.code} value={v.code}>{v.nom}</option>)}
              </select>
            </div>
          </div>

          {/* Points de prise en charge */}
          <div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                  Lieu de prise en charge
                </label>
                <input
                  type="text"
                  value={pointDepart}
                  onChange={(e) => setPointDepart(e.target.value)}
                  placeholder="Bonaberi, apres le bar Chez Paul"
                  className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm text-ink transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                  Lieu de depose
                </label>
                <input
                  type="text"
                  value={pointArrivee}
                  onChange={(e) => setPointArrivee(e.target.value)}
                  placeholder="Mvan, face a la pharmacie"
                  className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm text-ink transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Arrets */}
          <div>
            <button
              type="button"
              onClick={() => setAvecArrets((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-ink"
            >
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] ${avecArrets ? 'bg-green-700 text-white' : 'bg-off-white'}`}>
                {avecArrets ? '✓' : ''}
              </span>
              Ce trajet a des arrets
            </button>

            {avecArrets && (
              <div className="mt-3 space-y-3">
                <div className="rounded-xl bg-purple/8 border border-purple/20 p-3">
                  <p className="text-[11px] text-ink-soft">
                    L&apos;heure indiquée par arrêt est purement indicative pour toi -- elle n&apos;est
                    pas encore affichée au voyageur. La ville et le lieu de prise en charge de
                    chaque arrêt sont eux bien enregistrés et utilisés en recherche.
                  </p>
                </div>

                {arrets.map((arret, i) => (
                  <div key={i} className="flex gap-2 items-start flex-wrap">
                    <select
                      value={arret.ville}
                      onChange={(e) => modifierArret(i, 'ville', e.target.value)}
                      className="flex-1 min-w-[140px] rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-3 py-2.5 text-sm text-ink"
                    >
                      <option value="">Ville de l&apos;arret...</option>
                      {optionsVilles(i).map((v) => <option key={v.code} value={v.code}>{v.nom}</option>)}
                    </select>
                    <input
                      type="time"
                      value={arret.heure}
                      onChange={(e) => modifierArret(i, 'heure', e.target.value)}
                      className="w-32 rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-3 py-2.5 text-sm text-ink"
                    />
                    <input
                      type="text"
                      value={arret.lieuPriseEnCharge}
                      onChange={(e) => modifierArret(i, 'lieuPriseEnCharge', e.target.value)}
                      placeholder="Lieu precis de prise en charge a cet arret"
                      className="flex-1 min-w-[220px] rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-3 py-2.5 text-sm text-ink"
                    />
                    {arrets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => retirerArret(i)}
                        className="w-9 h-9 rounded-xl bg-off-white text-red shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={ajouterArret}
                  className="text-xs font-bold text-green-700 hover:underline"
                >
                  + Ajouter un arret
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">Prix par combinaison (FCFA)</label>
            <div className="rounded-xl bg-purple/8 border border-purple/20 p-3 mb-3">
              <p className="text-[11px] text-ink-soft">
                Chaque combinaison a son propre prix, fixé librement (pas une somme automatique
                des tronçons). N&apos;importe quel arrêt peut être point de départ ou d&apos;arrivée
                pour un client, avec disponibilité calculée par chevauchement de sièges. Le prix du
                trajet complet ({villeDepart && villeArrivee ? `${nomVille(villeDepart)} → ${nomVille(villeArrivee)}` : 'départ → arrivée'})
                est <span className="font-semibold text-ink">obligatoire</span> ; les autres combinaisons sont optionnelles
                (laisse vide si tu ne veux pas vendre ce segment séparément).
              </p>
            </div>
            {combinaisons.length === 0 || !villeDepart || !villeArrivee ? (
              <p className="text-[12px] text-ink-soft">Choisis la ville de départ et d&apos;arrivée pour voir les combinaisons.</p>
            ) : (
              <div className="space-y-2">
                {combinaisons.map((c) => (
                  <div key={c.cle} className="flex items-center gap-3">
                    <span className="flex-1 text-[13px] text-ink">{nomVille(c.depart)} → {nomVille(c.arrivee)}</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={prixCombinaison(c.cle)}
                      onChange={(e) => setPrixCombinaisonAt(c.cle, e.target.value)}
                      placeholder="Ex : 2000"
                      className="w-32 rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-3 py-2.5 text-sm text-ink"
                    />
                  </div>
                ))}
                <p className="text-[11px] text-ink-soft pt-1">
                  {combinaisons.length} combinaison(s) au total pour {pointsOrdonnes.length} point(s) sur cette ligne.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-line pt-5">
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">Bus</label>
            <select
              value={busId}
              onChange={(e) => { setBusId(e.target.value); setErreur(null); }}
              disabled={chargementListes}
              className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm text-ink transition-colors disabled:opacity-60"
            >
              <option value="">{chargementListes ? 'Chargement...' : 'Choisir un bus...'}</option>
              {busListe.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nom} ({b.disposition}, {b.nombre_sieges} places)
                </option>
              ))}
            </select>
            {!chargementListes && busListe.length === 0 && (
              <p className="text-[11px] text-ink-soft mt-1.5">
                Aucun bus dans ta flotte. <Link href="/flotte/nouveau" className="text-green-700 font-semibold hover:underline">Ajoute-en un</Link> d&apos;abord.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">Chauffeur</label>
            <select
              value={chauffeurId}
              onChange={(e) => { setChauffeurId(e.target.value); setErreur(null); }}
              disabled={chargementListes}
              className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm text-ink transition-colors disabled:opacity-60"
            >
              <option value="">{chargementListes ? 'Chargement...' : 'Choisir un chauffeur...'}</option>
              {chauffeursListe.map((c) => (
                <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
              ))}
            </select>
            {!chargementListes && chauffeursListe.length === 0 && (
              <p className="text-[11px] text-ink-soft mt-1.5">
                Aucun chauffeur actif. <Link href="/chauffeurs" className="text-green-700 font-semibold hover:underline">Ajoute-en un</Link> ou laisse ce champ vide pour l&apos;assigner plus tard.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">Date de depart</label>
              <input
                type="date"
                value={dateDepart}
                onChange={(e) => { setDateDepart(e.target.value); setErreur(null); }}
                className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm text-ink transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">Categorie</label>
              <select
                value={categorie}
                onChange={(e) => setCategorie(e.target.value as typeof categorie)}
                className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm text-ink transition-colors"
              >
                {categories.map((c) => <option key={c.valeur} value={c.valeur}>{c.libelle}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">Heure de depart</label>
              <input
                type="time"
                value={heureDepart}
                onChange={(e) => { setHeureDepart(e.target.value); setErreur(null); }}
                className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm text-ink transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                Heure d&apos;arrivee estimee <span className="text-red font-normal">*</span>
              </label>
              <input
                type="time"
                value={heureArrivee}
                onChange={(e) => setHeureArrivee(e.target.value)}
                className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm text-ink transition-colors"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 rounded-xl bg-off-white px-4 py-3 cursor-pointer">
            <input type="checkbox" checked={distributionNourriture} onChange={(e) => setDistributionNourriture(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-ink">Distribution de nourriture prévue durant ce trajet</span>
          </label>

          {/* Tarifs additionnels -- facade totale */}
          <div className="border-t border-line pt-5">
            <p className="text-xs font-semibold text-ink-soft mb-1">Tarifs additionnels</p>
            <p className="text-[11px] text-ink-soft mb-3">
              Aucun champ backend n&apos;existe encore pour ces deux valeurs -- facade uniquement.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                  Bagage supplementaire (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={prixBagage}
                  onChange={(e) => setPrixBagage(e.target.value)}
                  className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm text-ink transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                  Supplement siege premium (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={supplementPremium}
                  onChange={(e) => setSupplementPremium(e.target.value)}
                  className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm text-ink transition-colors"
                />
              </div>
            </div>
          </div>

          {erreur && <p className="text-xs text-red font-medium">{erreur}</p>}

          <div className="flex gap-3 pt-2">
            <Link
              href="/trajets"
              className="flex-1 rounded-xl bg-off-white hover:bg-line text-ink font-bold text-sm py-3.5 text-center transition-colors"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={enregistrement}
              className="flex-1 rounded-xl bg-green-700 hover:bg-green-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 transition-colors shadow-lg shadow--green-700/25"
            >
              {enregistrement ? 'Enregistrement...' : 'Creer le trajet'}
            </button>
          </div>
        </form>
      </div>
    </LayoutAgence>
  );
}