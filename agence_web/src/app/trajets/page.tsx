'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '../components/Navigation';

/**
 * Liste de bord des trajets programmes. Interface seule pour l'instant --
 * les appels reels (GET /api/programmation/mon-horizon et GET /api/trajets)
 * ne sont pas encore branches, voir TODO. Donnees affichees = donnees de
 * demonstration, clairement identifiables comme telles.
 *
 * Contrat backend confirme :
 *   GET /api/programmation/mon-horizon
 *     -> { horizon_jours, seuil_alerte, conforme, message, derniere_date_programmee }
 *   GET /api/trajets
 *     -> { trajets: [{ id, date_depart, heure_depart, heure_arrivee_estimee,
 *          prix_base, categorie, statut, ville_depart, ville_arrivee,
 *          nom_bus, disposition }] }
 *
 * point_depart / point_arrivee (lieu de prise en charge/depose) : FACADE,
 * aucune colonne backend n'existe pour ca (ni lignes, ni trajets).
 */

type Trajet = {
  id: string;
  date_depart: string;
  heure_depart: string;
  heure_arrivee_estimee: string | null;
  prix_base: number;
  categorie: 'standard' | 'vip' | 'express' | 'nuit';
  statut: 'programme' | 'en_cours' | 'retard' | 'termine' | 'annule';
  ville_depart: string;
  ville_arrivee: string;
  nom_bus: string;
  point_depart: string;
  point_arrivee: string;
  bus_id: string;
};

type Horizon = {
  horizon_jours: number;
  seuil_alerte: number;
  conforme: boolean;
  message: string;
};

const horizonDemo: Horizon = {
  horizon_jours: 9,
  seuil_alerte: 14,
  conforme: false,
  message: 'Alerte : horizon de programmation sous le seuil (9 jours restants, minimum 14 requis)',
};

const trajetsDemo: Trajet[] = [
  {
    id: '1', date_depart: '2026-07-25', heure_depart: '07:00', heure_arrivee_estimee: '11:30',
    prix_base: 4000, categorie: 'vip', statut: 'programme',
    ville_depart: 'Douala', ville_arrivee: 'Yaounde', nom_bus: 'Confort Express 01',
    point_depart: 'Bonaberi, apres le bar Chez Paul', point_arrivee: 'Mvan, face a la pharmacie',
    bus_id: 'b1',
  },
  {
    id: '2', date_depart: '2026-07-25', heure_depart: '14:00', heure_arrivee_estimee: '18:15',
    prix_base: 3500, categorie: 'standard', statut: 'programme',
    ville_depart: 'Douala', ville_arrivee: 'Yaounde', nom_bus: 'Confort 02',
    point_depart: 'Akwa, gare routiere centrale', point_arrivee: 'Nlongkak, agence principale',
    bus_id: 'b2',
  },
  {
    id: '3', date_depart: '2026-07-26', heure_depart: '06:30', heure_arrivee_estimee: '10:30',
    prix_base: 4200, categorie: 'express', statut: 'programme',
    ville_depart: 'Yaounde', ville_arrivee: 'Douala', nom_bus: 'Express 03',
    point_depart: 'Mvan, face a la pharmacie', point_arrivee: 'Bonaberi, apres le bar Chez Paul',
    bus_id: 'b3',
  },
];

const libellesCategorie: Record<Trajet['categorie'], string> = {
  standard: 'Standard', vip: 'VIP', express: 'Express', nuit: 'Nuit',
};

const stylesCategorie: Record<Trajet['categorie'], string> = {
  standard: 'bg-[#F1F4F1] text-[#64746C]',
  vip: 'bg-[#E6B84C]/15 text-[#8A6A1E]',
  express: 'bg-[#0B9E63]/10 text-[#0B9E63]',
  nuit: 'bg-[#14201A]/10 text-[#14201A]',
};

const stylesStatut: Record<Trajet['statut'], string> = {
  programme: 'bg-[#0B9E63]/10 text-[#0B9E63]',
  en_cours: 'bg-[#E6B84C]/15 text-[#8A6A1E]',
  retard: 'bg-[#D9534F]/10 text-[#D9534F]',
  termine: 'bg-[#F1F4F1] text-[#64746C]',
  annule: 'bg-[#D9534F]/10 text-[#D9534F]',
};

const libellesStatut: Record<Trajet['statut'], string> = {
  programme: 'Programme', en_cours: 'En cours', retard: 'Retard',
  termine: 'Termine', annule: 'Annule',
};

function lienDuplication(t: Trajet): string {
  const params = new URLSearchParams({
    dupliquer: '1',
    ville_depart: t.ville_depart.toLowerCase(),
    ville_arrivee: t.ville_arrivee.toLowerCase(),
    bus_id: t.bus_id,
    categorie: t.categorie,
    prix: String(t.prix_base),
    point_depart: t.point_depart,
    point_arrivee: t.point_arrivee,
  });
  return `/trajets/nouveau?${params.toString()}`;
}

export default function ProgrammationTrajets() {
  const [horizon] = useState<Horizon>(horizonDemo);
  const [trajets] = useState<Trajet[]>(trajetsDemo);

  // TODO (branchement backend) : remplacer horizonDemo/trajetsDemo par un
  // vrai useEffect appelant :
  //   GET http://localhost:5000/api/programmation/mon-horizon (avec token)
  //   GET http://localhost:5000/api/trajets (avec token)

  return (
    <div className="min-h-screen bg-[#EEF1EE] p-6 md:p-10">
      <Navigation />
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#14201A]">Programmation des trajets</h1>
            <p className="text-sm text-[#64746C] mt-1">
              Gere tes trajets programmes et maintiens ton horizon a jour.
            </p>
          </div>
          <Link
            href="/trajets/nouveau"
            className="rounded-xl bg-[#0B9E63] hover:bg-[#0A8D58] text-white font-bold text-sm px-5 py-3 transition-colors shadow-lg shadow-[#0B9E63]/25 whitespace-nowrap"
          >
            + Nouveau trajet
          </Link>
        </div>

        <div
          className={`rounded-2xl p-5 mb-6 border ${
            horizon.conforme ? 'bg-[#0B9E63]/6 border-[#0B9E63]/20' : 'bg-[#E6B84C]/10 border-[#E6B84C]/30'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                horizon.conforme ? 'bg-[#0B9E63]/15' : 'bg-[#E6B84C]/20'
              }`}
            >
              <span className="text-base">{horizon.conforme ? '✓' : '⚠'}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#14201A]">
                {horizon.conforme ? 'Programme a jour' : 'Programme incomplet'}
              </p>
              <p className="text-sm text-[#64746C] mt-0.5">{horizon.message}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-extrabold text-[#14201A]">{horizon.horizon_jours}j</p>
              <p className="text-xs text-[#9AA69F]">seuil : {horizon.seuil_alerte}j</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7ECE8] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E7ECE8]">
            <h2 className="text-sm font-bold text-[#14201A]">Trajets programmes ({trajets.length})</h2>
          </div>

          {trajets.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-[#64746C]">Aucun trajet programme pour l&apos;instant.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E7ECE8]">
              {trajets.map((t) => (
                <div key={t.id} className="px-5 py-4 hover:bg-[#F6F8F6] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-20 shrink-0">
                      <p className="text-sm font-bold text-[#14201A]">
                        {new Date(t.date_depart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </p>
                      <p className="text-xs text-[#64746C]">{t.heure_depart}</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#14201A] truncate">
                        {t.ville_depart} → {t.ville_arrivee}
                      </p>
                      <p className="text-xs text-[#64746C] truncate">
                        {t.nom_bus} {t.heure_arrivee_estimee ? `· arrivee ${t.heure_arrivee_estimee}` : ''}
                      </p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${stylesCategorie[t.categorie]}`}>
                      {libellesCategorie[t.categorie]}
                    </span>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${stylesStatut[t.statut]}`}>
                      {libellesStatut[t.statut]}
                    </span>

                    <p className="w-24 text-right text-sm font-extrabold text-[#14201A] shrink-0">
                      {t.prix_base.toLocaleString('fr-FR')} F
                    </p>

                    <Link
                      href={lienDuplication(t)}
                      title="Dupliquer ce trajet"
                      className="w-8 h-8 rounded-lg bg-[#F1F4F1] hover:bg-[#E7ECE8] flex items-center justify-center shrink-0 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64746C" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </Link>
                  </div>

                  {/* Points de prise en charge -- facade */}
                  <div className="flex items-center gap-4 mt-2 pl-1 text-[11px] text-[#9AA69F]">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0B9E63] shrink-0" />
                      {t.point_depart}
                    </span>
                    <span>→</span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F] shrink-0" />
                      {t.point_arrivee}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}