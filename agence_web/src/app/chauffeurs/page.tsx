'use client';

import { useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';

/**
 * Gestion des chauffeurs. routes/chauffeurRoutes.js a des "Routes pour
 * l'AGENCE" confirmees, contenu exact jamais lu -- a verifier avant
 * branchement.
 *
 * ATTENTION SECURITE (jamais reproduire en production) : "voir le mot
 * de passe" n'est acceptable QUE parce que ce sont des donnees demo.
 */

type Chauffeur = {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  busAssigne: string | null;
  statut: 'actif' | 'desactive';
  identifiant: string;
  motDePasseDemo: string;
  noteMoyenne: number | null;
  derniereActivite: string;
  dateAdhesion: string;
  missions: { trajet: string; date: string; heure: string }[];
};

const chauffeursDemo: Chauffeur[] = [
  { id: '1', nom: "Eto'o", prenom: 'Paul', telephone: '+237 6 90 12 34 56', email: 'paul.etoo@gmail.com', busAssigne: 'Confort Express 01', statut: 'actif', identifiant: 'CHF-001', motDePasseDemo: 'chauffeur123', noteMoyenne: 4.8, derniereActivite: '2026-07-25', dateAdhesion: '2025-03-12', missions: [
    { trajet: 'Douala → Yaounde', date: '2026-07-27', heure: '07:00' },
    { trajet: 'Yaounde → Douala', date: '2026-07-26', heure: '14:00' },
    { trajet: 'Douala → Yaounde', date: '2026-07-28', heure: '07:00' },
  ]},
  { id: '2', nom: 'Nkeng', prenom: 'Andre', telephone: '+237 6 90 22 33 44', email: 'andre.nkeng@gmail.com', busAssigne: 'Confort 02', statut: 'actif', identifiant: 'CHF-002', motDePasseDemo: 'route456', noteMoyenne: 4.5, derniereActivite: '2026-07-23', dateAdhesion: '2025-08-04', missions: [
    { trajet: 'Douala → Bafoussam', date: '2026-07-27', heure: '09:00' },
  ]},
  { id: '3', nom: 'Biya', prenom: 'Robert', telephone: '+237 6 90 55 66 77', email: 'robert.biya@gmail.com', busAssigne: null, statut: 'desactive', identifiant: 'CHF-003', motDePasseDemo: 'trajet789', noteMoyenne: null, derniereActivite: '2026-06-14', dateAdhesion: '2024-11-20', missions: []},
];

type TriChauffeur = 'activite' | 'alpha' | 'plus_recent' | 'plus_ancien';

function dateLisible(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initiales(p: string, n: string) {
  return `${p[0]}${n[0]}`.toUpperCase();
}

export default function Chauffeurs() {
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>(chauffeursDemo);
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [chauffeurVu, setChauffeurVu] = useState<Chauffeur | null>(null);
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [emailEnvoye, setEmailEnvoye] = useState(false);
  const [tri, setTri] = useState<TriChauffeur>('activite');
  const [filtreStatut, setFiltreStatut] = useState<'tous' | 'actif' | 'desactive'>('tous');

  // Double securite pour activer/desactiver
  const [confirmationStatut, setConfirmationStatut] = useState<Chauffeur | null>(null);
  const [texteConfirmation, setTexteConfirmation] = useState('');

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const chauffeursAffiches = useMemo(() => {
    let copie = chauffeurs.filter((c) => filtreStatut === 'tous' || c.statut === filtreStatut);
    switch (tri) {
      case 'alpha':
        return copie.sort((a, b) => a.nom.localeCompare(b.nom));
      case 'plus_recent':
        return copie.sort((a, b) => b.derniereActivite.localeCompare(a.derniereActivite));
      case 'plus_ancien':
        return copie.sort((a, b) => a.derniereActivite.localeCompare(b.derniereActivite));
      case 'activite':
      default:
        return copie.sort((a, b) => {
          if (a.statut !== b.statut) return a.statut === 'actif' ? -1 : 1;
          return b.derniereActivite.localeCompare(a.derniereActivite);
        });
    }
  }, [chauffeurs, tri, filtreStatut]);

  function demanderBasculeStatut(c: Chauffeur) {
    setConfirmationStatut(c);
    setTexteConfirmation('');
  }

  function confirmerBasculeStatut() {
    if (!confirmationStatut) return;
    const motAttendu = confirmationStatut.statut === 'actif' ? 'DESACTIVER' : 'ACTIVER';
    if (texteConfirmation.trim().toUpperCase() !== motAttendu) return;
    const id = confirmationStatut.id;
    setChauffeurs((prev) => prev.map((c) => (c.id === id ? { ...c, statut: c.statut === 'actif' ? 'desactive' : 'actif' } : c)));
    setChauffeurVu((v) => (v && v.id === id ? { ...v, statut: v.statut === 'actif' ? 'desactive' : 'actif' } : v));
    setConfirmationStatut(null);
  }

  function renvoyerIdentifiants() {
    setEmailEnvoye(true);
    setTimeout(() => setEmailEnvoye(false), 2000);
  }

  async function creerChauffeur(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim() || !telephone.trim() || !email.trim()) return;
    setEnvoi(true);
    await new Promise((r) => setTimeout(r, 700));
    setEnvoi(false);
    setEnvoye(true);
  }

  function fermerModaleCreation() {
    setModaleOuverte(false);
    setEnvoye(false);
    setNom(''); setPrenom(''); setTelephone(''); setEmail('');
  }

  function fermerModaleAcces() {
    setChauffeurVu(null);
    setMotDePasseVisible(false);
  }

  return (
    <LayoutAgence>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-extrabold text-[#14201A]">Chauffeurs</h1>
            <p className="text-sm text-[#64746C] mt-1">Cree des comptes chauffeur et suis leurs acces.</p>
          </div>
          <button
            onClick={() => setModaleOuverte(true)}
            className="rounded-xl bg-[#0B9E63] hover:bg-[#0A8D58] text-white font-bold text-sm px-5 py-3 transition-colors shadow-lg shadow-[#0B9E63]/25 whitespace-nowrap"
          >
            + Nouveau chauffeur
          </button>
        </div>

        <div className="rounded-2xl p-3 mb-4 bg-[#E6B84C]/10 border border-[#E6B84C]/30">
          <p className="text-xs text-[#64746C]">
            Route agence chauffeurs existante (routes/chauffeurRoutes.js), contenu exact non verifie.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-[#9AA69F] font-semibold mr-1">Trier :</span>
          {([
            { valeur: 'activite', label: 'Par activite' },
            { valeur: 'alpha', label: 'Alphabetique' },
            { valeur: 'plus_recent', label: 'Plus recent' },
            { valeur: 'plus_ancien', label: 'Plus ancien' },
          ] as const).map((t) => (
            <button
              key={t.valeur}
              onClick={() => setTri(t.valeur)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                tri === t.valeur ? 'bg-[#14201A] text-white' : 'bg-white border border-[#E7ECE8] text-[#64746C]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-[#9AA69F] font-semibold mr-1">Filtrer :</span>
          {([
            { valeur: 'tous', label: 'Tous' },
            { valeur: 'actif', label: 'Actifs' },
            { valeur: 'desactive', label: 'Desactives' },
          ] as const).map((f) => (
            <button
              key={f.valeur}
              onClick={() => setFiltreStatut(f.valeur)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                filtreStatut === f.valeur ? 'bg-[#0B9E63] text-white' : 'bg-white border border-[#E7ECE8] text-[#64746C]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {chauffeursAffiches.map((c) => (
            <button
              key={c.id}
              onClick={() => setChauffeurVu(c)}
              className="text-left bg-white rounded-2xl border border-[#E7ECE8] p-5 hover:border-[#0B9E63]/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0B9E63] to-[#10C070] flex items-center justify-center text-white font-extrabold shrink-0">
                  {initiales(c.prenom, c.nom)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-[#14201A]">{c.prenom} {c.nom}</p>
                  <p className="text-xs text-[#64746C]">{c.telephone}</p>
                  <p className="text-xs text-[#64746C] truncate">{c.email}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                    c.statut === 'actif' ? 'bg-[#0B9E63]/10 text-[#0B9E63]' : 'bg-[#D9534F]/10 text-[#D9534F]'
                  }`}
                >
                  {c.statut === 'actif' ? 'Actif' : 'Desactive'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-[#64746C] mb-2">
                <span>Bus : {c.busAssigne || 'Aucun'}</span>
                {c.noteMoyenne && <span className="flex items-center gap-1 font-bold text-[#14201A]">⭐ {c.noteMoyenne}</span>}
              </div>
              <p className="text-[11px] text-[#9AA69F] mb-2">Membre depuis {dateLisible(c.dateAdhesion)}</p>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#9AA69F]">{c.missions.length} mission(s) a venir</span>
                <span className="text-xs font-bold text-[#0B9E63]">Voir les acces et missions →</span>
              </div>
            </button>
          ))}
          {chauffeursAffiches.length === 0 && (
            <div className="md:col-span-2 bg-white rounded-2xl border border-[#E7ECE8] p-10 text-center">
              <p className="text-sm text-[#64746C]">Aucun chauffeur pour ce filtre.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modale creation */}
      {modaleOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={fermerModaleCreation}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-8 max-w-md w-full">
            {envoye ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#0B9E63]/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✓</span>
                </div>
                <p className="text-lg font-extrabold text-[#14201A] mb-1">Chauffeur cree</p>
                <p className="text-sm text-[#64746C] mb-6">
                  Ses identifiants ont ete envoyes par email a {email} (facade -- non branche).
                </p>
                <button onClick={fermerModaleCreation} className="w-full rounded-xl bg-[#0B9E63] text-white font-bold text-sm py-3.5">Fermer</button>
              </div>
            ) : (
              <form onSubmit={creerChauffeur} className="space-y-4">
                <h2 className="text-lg font-extrabold text-[#14201A]">Nouveau chauffeur</h2>
                <p className="text-xs text-[#64746C]">Il recevra ses identifiants par email automatiquement.</p>
                <div className="grid grid-cols-2 gap-3">
                  <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prenom" className="rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm" />
                  <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" className="rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm" />
                </div>
                <input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="Telephone" className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm" />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={fermerModaleCreation} className="flex-1 rounded-xl bg-[#F1F4F1] text-[#14201A] font-bold text-sm py-3.5">Annuler</button>
                  <button type="submit" disabled={envoi} className="flex-1 rounded-xl bg-[#0B9E63] disabled:opacity-60 text-white font-bold text-sm py-3.5">
                    {envoi ? 'Creation...' : 'Creer et envoyer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modale acces + missions */}
      {chauffeurVu && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={fermerModaleAcces}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0B9E63] to-[#10C070] flex items-center justify-center text-white font-extrabold shrink-0">
                {initiales(chauffeurVu.prenom, chauffeurVu.nom)}
              </div>
              <div>
                <p className="text-lg font-extrabold text-[#14201A]">{chauffeurVu.prenom} {chauffeurVu.nom}</p>
                <p className="text-xs text-[#64746C]">{chauffeurVu.identifiant}</p>
              </div>
            </div>
            <p className="text-[11px] text-[#9AA69F] mb-5">Membre depuis le {dateLisible(chauffeurVu.dateAdhesion)}</p>

            <div className="bg-[#F1F4F1] rounded-xl p-4 space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-[#64746C]">Identifiant</span>
                <span className="font-bold text-[#14201A]">{chauffeurVu.identifiant}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#64746C]">Mot de passe</span>
                <button onClick={() => setMotDePasseVisible((v) => !v)} className="font-bold text-[#14201A] flex items-center gap-1.5">
                  {motDePasseVisible ? chauffeurVu.motDePasseDemo : '••••••••'}
                  <span className="text-[#0B9E63] text-xs">{motDePasseVisible ? 'cacher' : 'voir'}</span>
                </button>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#64746C]">Email d&apos;envoi</span>
                <span className="font-bold text-[#14201A] truncate ml-2">{chauffeurVu.email}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <span className="text-[#64746C]">Statut</span>
                  <p className={`text-[11px] font-bold mt-0.5 ${chauffeurVu.statut === 'actif' ? 'text-[#0B9E63]' : 'text-[#D9534F]'}`}>
                    {chauffeurVu.statut === 'actif' ? 'Actif' : 'Desactive'}
                  </p>
                </div>
                <button
                  onClick={() => demanderBasculeStatut(chauffeurVu)}
                  className={`rounded-xl px-3 py-2 text-[11px] font-bold ${chauffeurVu.statut === 'actif' ? 'bg-[#D9534F]/10 text-[#D9534F]' : 'bg-[#0B9E63]/10 text-[#0B9E63]'}`}
                >
                  {chauffeurVu.statut === 'actif' ? 'Desactiver le chauffeur' : 'Activer le chauffeur'}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-[#D9534F] mb-4">
              ⚠ En production, un mot de passe ne doit JAMAIS etre stocke ni affiche en clair.
            </p>

            <button
              onClick={renvoyerIdentifiants}
              className="w-full rounded-xl bg-[#0B9E63]/10 hover:bg-[#0B9E63]/20 text-[#0B9E63] font-bold text-sm py-3 mb-4 transition-colors"
            >
              {emailEnvoye ? 'Identifiants renvoyes ✓' : 'Renvoyer les identifiants par email'}
            </button>

            <p className="text-xs font-bold text-[#64746C] mb-2">Missions assignees</p>
            {chauffeurVu.missions.length === 0 ? (
              <p className="text-xs text-[#9AA69F] mb-4">Aucune mission a venir.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {chauffeurVu.missions.map((m, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F6F8F6] rounded-lg px-3 py-2">
                    <span className="text-xs font-semibold text-[#14201A]">{m.trajet}</span>
                    <span className="text-[11px] text-[#64746C]">
                      {new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · {m.heure}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={fermerModaleAcces} className="w-full rounded-xl bg-[#F1F4F1] text-[#14201A] font-bold text-sm py-3.5">Fermer</button>
          </div>
        </div>
      )}

      {/* Double securite activer/desactiver */}
      {confirmationStatut && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-[60]" onClick={() => setConfirmationStatut(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-8 max-w-sm w-full">
            <div className="w-14 h-14 rounded-full bg-[#D9534F]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠</span>
            </div>
            <p className="text-center text-sm font-bold text-[#14201A] mb-1">
              {confirmationStatut.statut === 'actif' ? 'Desactiver' : 'Activer'} {confirmationStatut.prenom} {confirmationStatut.nom} ?
            </p>
            <p className="text-center text-xs text-[#64746C] mb-4">
              Pour confirmer, ecris <strong>{confirmationStatut.statut === 'actif' ? 'DESACTIVER' : 'ACTIVER'}</strong> ci-dessous.
            </p>
            <input
              value={texteConfirmation}
              onChange={(e) => setTexteConfirmation(e.target.value)}
              placeholder={confirmationStatut.statut === 'actif' ? 'DESACTIVER' : 'ACTIVER'}
              className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#D9534F] focus:bg-white outline-none px-4 py-3 text-sm text-center font-bold mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setConfirmationStatut(null)} className="flex-1 rounded-xl bg-[#F1F4F1] text-[#14201A] font-bold text-sm py-3">Annuler</button>
              <button
                onClick={confirmerBasculeStatut}
                disabled={texteConfirmation.trim().toUpperCase() !== (confirmationStatut.statut === 'actif' ? 'DESACTIVER' : 'ACTIVER')}
                className="flex-1 rounded-xl bg-[#D9534F] disabled:opacity-40 text-white font-bold text-sm py-3"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutAgence>
  );
}