'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import LayoutAgence from '../../components/LayoutAgence';
import { VILLES } from '../../villes';
import { todayInputDate } from '../../lib/date';

/**
 * Formulaire d'ajout d'un trajet. La ligne (ville depart/arrivee) est
 * creee A LA VOLEE ici, pas choisie parmi des lignes prefaites -- une
 * fois creee, POST /api/lignes puis POST /api/trajets avec le ligne_id
 * obtenu (2 appels enchaines, voir TODO). Villes reelles verifiees en
 * base (50 codes, table villes) -- pas de texte libre.
 *
 * DEUX PARTIES EN FACADE, sans aucune colonne/route backend derriere :
 * 1. Heure par arret + sous-trajets auto (ex: Douala-Loum-Yaounde devrait
 *    aussi apparaitre comme "Loum -> Yaounde" cote recherche voyageur).
 *    La table lignes n'a qu'un arrets TEXT[] simple (noms), aucune heure,
 *    aucune logique de sous-trajet, aucun partage de sieges/prix par
 *    segment. Decision assumee ce soir : construire quand meme la
 *    facade, sans logique reelle.
 * 2. Prix bagage supplementaire / supplement siege premium par trajet :
 *    aucun champ n'existe encore en base pour ca (bug backend deja
 *    connu : suppBagage credite margeJego au lieu de l'agence, et les
 *    champs de config bagages n'existent nulle part).
 */

const categories = [
  { valeur: 'standard', libelle: 'Standard' },
  { valeur: 'vip', libelle: 'VIP' },
  { valeur: 'express', libelle: 'Express' },
  { valeur: 'nuit', libelle: 'Nuit' },
] as const;

const busDemo = [
  { id: 'b1', libelle: 'Confort Express 01 (2+2, 40 places)' },
  { id: 'b2', libelle: 'Confort 02 (2+2, 32 places)' },
  { id: 'b3', libelle: 'Express 03 (2+2, 29 places)' },
];

// Meme liste que Chauffeurs -- a terme, un vrai appel API partage.
const chauffeursDemo = [
  { id: 'c1', nom: "Paul Eto'o" },
  { id: 'c2', nom: 'Andre Nkeng' },
];

type Arret = { ville: string; heure: string };

export default function NouveauTrajet() {
  const params = useSearchParams();
  const dupliquer = params.get('dupliquer') === '1';

  // Ligne (creee a la volee)
  const [villeDepart, setVilleDepart] = useState('');
  const [villeArrivee, setVilleArrivee] = useState('');
  const [avecArrets, setAvecArrets] = useState(false);
  const [arrets, setArrets] = useState<Arret[]>([{ ville: '', heure: '' }]);
  const [distanceKm, setDistanceKm] = useState('');
  const [pointDepart, setPointDepart] = useState('');
  const [pointArrivee, setPointArrivee] = useState('');

  // Trajet
  const [busId, setBusId] = useState('');
  const [chauffeurId, setChauffeurId] = useState('');
  const [dateDepart, setDateDepart] = useState(todayInputDate());
  const [heureDepart, setHeureDepart] = useState('');
  const [heureArrivee, setHeureArrivee] = useState('');
  const [prixBase, setPrixBase] = useState('');
  const [categorie, setCategorie] = useState<typeof categories[number]['valeur']>('standard');

  // Tarifs additionnels (facade totale)
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
    setPrixBase(params.get('prix') || '');
    setPointDepart(params.get('point_depart') || '');
    setPointArrivee(params.get('point_arrivee') || '');
  }, [dupliquer, params]);

  function ajouterArret() {
    setArrets((a) => [...a, { ville: '', heure: '' }]);
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

    if (!villeDepart || !villeArrivee || !busId || !dateDepart || !heureDepart || !heureArrivee || !prixBase) {
      setErreur('Ville de depart, ville d\'arrivee, bus, date, heure de depart, heure d\'arrivee et prix sont obligatoires.');
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

    setEnregistrement(true);

    // TODO (branchement backend) : deux appels enchaines :
    //
    // 1. POST /api/lignes
    //    { ville_depart, ville_arrivee, est_direct: !avecArrets,
    //      arrets: avecArrets ? arrets.map(a => a.ville) : null,
    //      distance_km: distanceKm ? Number(distanceKm) : null }
    //    -> recupere ligne.id
    //    (Note : les heures par arret et la generation de sous-trajets
    //    de recherche -- ex "Loum -> Yaounde" -- n'ont AUCUNE route/
    //    colonne backend. Rien a envoyer pour ca, purement visuel ici.)
    //
    // 2. POST /api/trajets
    //    { ligne_id, bus_id: busId, date_depart: dateDepart,
    //      heure_depart: heureDepart, heure_arrivee_estimee: heureArrivee,
    //      prix_base: Number(prixBase), categorie }
    //    (prixBagage / supplementPremium : aucun champ backend existant,
    //    rien a envoyer -- facade uniquement)

    await new Promise((r) => setTimeout(r, 700));
    setEnregistrement(false);
    setErreur('Creation non branchee pour l\'instant (interface uniquement).');
  }

  return (
    <LayoutAgence>

      <div className="max-w-2xl mx-auto">
        <Link
          href="/trajets"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#64746C] hover:text-[#14201A] transition-colors mb-6"
        >
          ← Retour a la liste
        </Link>

        <h1 className="text-2xl font-extrabold text-[#14201A] mb-1">Nouveau trajet</h1>
        <p className="text-sm text-[#64746C] mb-6">
          La ligne (villes + arrets) est creee automatiquement avec ce trajet.
        </p>

        <form onSubmit={creerTrajet} className="bg-white rounded-3xl border border-[#E7ECE8] shadow-sm p-8 space-y-5">
          {/* Villes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#64746C] mb-1.5">Ville de depart</label>
              <select
                value={villeDepart}
                onChange={(e) => { setVilleDepart(e.target.value); setErreur(null); }}
                className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
              >
                <option value="">Choisir...</option>
                {VILLES.map((v) => <option key={v.code} value={v.code}>{v.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#64746C] mb-1.5">Ville d&apos;arrivee</label>
              <select
                value={villeArrivee}
                onChange={(e) => { setVilleArrivee(e.target.value); setErreur(null); }}
                className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
              >
                <option value="">Choisir...</option>
                {VILLES.map((v) => <option key={v.code} value={v.code}>{v.nom}</option>)}
              </select>
            </div>
          </div>

          {/* Points de prise en charge -- facade */}
          <div>
            <div className="rounded-xl bg-[#7C5CBF]/8 border border-[#7C5CBF]/20 p-3 mb-3">
              <p className="text-[11px] text-[#64746C]">
                Facade : aucune colonne backend pour ces indications (ni sur lignes, ni sur trajets).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#64746C] mb-1.5">
                  Lieu de prise en charge
                </label>
                <input
                  type="text"
                  value={pointDepart}
                  onChange={(e) => setPointDepart(e.target.value)}
                  placeholder="Bonaberi, apres le bar Chez Paul"
                  className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#64746C] mb-1.5">
                  Lieu de depose
                </label>
                <input
                  type="text"
                  value={pointArrivee}
                  onChange={(e) => setPointArrivee(e.target.value)}
                  placeholder="Mvan, face a la pharmacie"
                  className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Arrets */}
          <div>
            <button
              type="button"
              onClick={() => setAvecArrets((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-[#14201A]"
            >
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] ${avecArrets ? 'bg-[#0B9E63] text-white' : 'bg-[#F1F4F1]'}`}>
                {avecArrets ? '✓' : ''}
              </span>
              Ce trajet a des arrets
            </button>

            {avecArrets && (
              <div className="mt-3 space-y-3">
                <div className="rounded-xl bg-[#7C5CBF]/8 border border-[#7C5CBF]/20 p-3">
                  <p className="text-xs text-[#14201A] font-semibold">Facade uniquement</p>
                  <p className="text-[11px] text-[#64746C] mt-1">
                    Aucune heure par arret ni sous-trajet de recherche (ex : &quot;Loum → Yaounde&quot;) n&apos;est
                    reellement gere cote backend. Visuel seulement ce soir.
                  </p>
                </div>

                {arrets.map((arret, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <select
                      value={arret.ville}
                      onChange={(e) => modifierArret(i, 'ville', e.target.value)}
                      className="flex-1 rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-3 py-2.5 text-sm text-[#14201A]"
                    >
                      <option value="">Ville de l&apos;arret...</option>
                      {VILLES.map((v) => <option key={v.code} value={v.code}>{v.nom}</option>)}
                    </select>
                    <input
                      type="time"
                      value={arret.heure}
                      onChange={(e) => modifierArret(i, 'heure', e.target.value)}
                      className="w-32 rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-3 py-2.5 text-sm text-[#14201A]"
                    />
                    {arrets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => retirerArret(i)}
                        className="w-9 h-9 rounded-xl bg-[#F1F4F1] text-[#D9534F] shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={ajouterArret}
                  className="text-xs font-bold text-[#0B9E63] hover:underline"
                >
                  + Ajouter un arret
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#64746C] mb-1.5">
              Distance (km) <span className="text-[#9AA69F] font-normal">(optionnel)</span>
            </label>
            <input
              type="number"
              min="0"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              placeholder="240"
              className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
            />
          </div>

          <div className="border-t border-[#E7ECE8] pt-5">
            <label className="block text-xs font-semibold text-[#64746C] mb-1.5">Bus</label>
            <select
              value={busId}
              onChange={(e) => { setBusId(e.target.value); setErreur(null); }}
              className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
            >
              <option value="">Choisir un bus...</option>
              {busDemo.map((b) => <option key={b.id} value={b.id}>{b.libelle}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#64746C] mb-1.5">Chauffeur</label>
            <select
              value={chauffeurId}
              onChange={(e) => { setChauffeurId(e.target.value); setErreur(null); }}
              className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
            >
              <option value="">Choisir un chauffeur...</option>
              {chauffeursDemo.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#64746C] mb-1.5">Date de depart</label>
              <input
                type="date"
                value={dateDepart}
                onChange={(e) => { setDateDepart(e.target.value); setErreur(null); }}
                className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#64746C] mb-1.5">Categorie</label>
              <select
                value={categorie}
                onChange={(e) => setCategorie(e.target.value as typeof categorie)}
                className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
              >
                {categories.map((c) => <option key={c.valeur} value={c.valeur}>{c.libelle}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#64746C] mb-1.5">Heure de depart</label>
              <input
                type="time"
                value={heureDepart}
                onChange={(e) => { setHeureDepart(e.target.value); setErreur(null); }}
                className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#64746C] mb-1.5">
                Heure d&apos;arrivee estimee <span className="text-[#D9534F] font-normal">*</span>
              </label>
              <input
                type="time"
                value={heureArrivee}
                onChange={(e) => setHeureArrivee(e.target.value)}
                className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#64746C] mb-1.5">Prix du billet (FCFA)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={prixBase}
              onChange={(e) => { setPrixBase(e.target.value); setErreur(null); }}
              placeholder="4000"
              className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
            />
          </div>

          {/* Tarifs additionnels -- facade totale */}
          <div className="border-t border-[#E7ECE8] pt-5">
            <p className="text-xs font-semibold text-[#64746C] mb-1">Tarifs additionnels</p>
            <p className="text-[11px] text-[#9AA69F] mb-3">
              Aucun champ backend n&apos;existe encore pour ces deux valeurs -- facade uniquement.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#64746C] mb-1.5">
                  Bagage supplementaire (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={prixBagage}
                  onChange={(e) => setPrixBagage(e.target.value)}
                  className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#64746C] mb-1.5">
                  Supplement siege premium (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={supplementPremium}
                  onChange={(e) => setSupplementPremium(e.target.value)}
                  className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
                />
              </div>
            </div>
          </div>

          {erreur && <p className="text-xs text-[#D9534F] font-medium">{erreur}</p>}

          <div className="flex gap-3 pt-2">
            <Link
              href="/trajets"
              className="flex-1 rounded-xl bg-[#F1F4F1] hover:bg-[#E7ECE8] text-[#14201A] font-bold text-sm py-3.5 text-center transition-colors"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={enregistrement}
              className="flex-1 rounded-xl bg-[#0B9E63] hover:bg-[#0A8D58] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 transition-colors shadow-lg shadow-[#0B9E63]/25"
            >
              {enregistrement ? 'Enregistrement...' : 'Creer le trajet'}
            </button>
          </div>
        </form>
      </div>
    </LayoutAgence>
  );
}