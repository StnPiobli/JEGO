'use client';

import { useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import DateNavigator from '../components/DateNavigator';
import { addDaysToInput, todayInputDate } from '../lib/date';
import { useLangue } from '../lib/langue';

type StatutLitige = 'en_cours' | 'resolu';
type Verdict = 'agence' | 'opposition' | null;
type PieceJointe = { id: string; nom: string; type: 'image' | 'document'; url: string };

type Litige = {
  id: string;
  reference: string;
  numeroVoyage: string;
  dateOuverture: string;
  heureOuverture: string;
  dateResolution: string | null;
  heureResolution: string | null;
  type: 'remboursement' | 'bagage' | 'retard' | 'fraude';
  statut: StatutLitige;
  client: string;
  trajet: string;
  montant: number;
  motif: string;
  verdict: Verdict;
  commentaireDecision: string;
};

const AUJOURDHUI = todayInputDate();
const J_MOINS_2 = addDaysToInput(AUJOURDHUI, -2);
const J_MOINS_4 = addDaysToInput(AUJOURDHUI, -4);
const J_MOINS_8 = addDaysToInput(AUJOURDHUI, -8);
const J_MOINS_12 = addDaysToInput(AUJOURDHUI, -12);
const J_MOINS_18 = addDaysToInput(AUJOURDHUI, -18);
const J_MOINS_33 = addDaysToInput(AUJOURDHUI, -33);

const LITIGES_DEMO: Litige[] = [
  {
    id: 'L1', reference: 'LIT-1001', numeroVoyage: 'JG-260715-0700-DLA-YDE', dateOuverture: J_MOINS_12, heureOuverture: '16:28', dateResolution: null, heureResolution: null, type: 'remboursement', statut: 'en_cours',
    client: 'Jean Mvondo', trajet: 'Douala → Yaounde', montant: 4000,
    motif: 'Voyageur demande un remboursement apres une annulation tardive.', verdict: null, commentaireDecision: 'Le dossier est encore analyse par JEGO.',
  },
  {
    id: 'L2', reference: 'LIT-1002', numeroVoyage: 'JG-260719-1400-YDE-DLA', dateOuverture: J_MOINS_8, heureOuverture: '19:05', dateResolution: null, heureResolution: null, type: 'bagage', statut: 'en_cours',
    client: 'Nadine Essomba', trajet: 'Yaounde → Douala', montant: 0,
    motif: "Bagage declare manquant a l'arrivee, verification en cours.", verdict: null, commentaireDecision: 'Le dossier est encore analyse par JEGO.',
  },
  {
    id: 'L5', reference: 'LIT-1004', numeroVoyage: 'JG-260725-0630-DLA-BFM', dateOuverture: J_MOINS_2, heureOuverture: '11:42', dateResolution: null, heureResolution: null, type: 'retard', statut: 'en_cours',
    client: 'Estelle Kengne', trajet: 'Douala → Bafoussam', montant: 2000,
    motif: 'Demande de compensation liee a un retard non annonce.', verdict: null, commentaireDecision: 'Le dossier est encore analyse par JEGO.',
  },
  {
    id: 'L3', reference: 'LIT-0994', numeroVoyage: 'JG-260709-0800-DLA-KBI', dateOuverture: J_MOINS_18, heureOuverture: '14:10', dateResolution: J_MOINS_4, heureResolution: '10:32', type: 'retard', statut: 'resolu',
    client: 'Pauline Nana', trajet: 'Douala → Kribi', montant: 1500,
    motif: 'Demande de compensation suite a un fort retard.', verdict: 'agence', commentaireDecision: "Les preuves de depart et d'arrivee montrent que l'agence a informe les voyageurs dans les delais prevus.",
  },
  {
    id: 'L4', reference: 'LIT-0998', numeroVoyage: 'JG-260714-0900-DLA-BFM', dateOuverture: J_MOINS_12, heureOuverture: '18:44', dateResolution: J_MOINS_2, heureResolution: '15:08', type: 'fraude', statut: 'resolu',
    client: 'Kevin Talla', trajet: 'Douala → Bafoussam', montant: 3500,
    motif: "Contestations sur l'usage d'un billet deja marque comme utilise.", verdict: 'opposition', commentaireDecision: "Le controle du billet n'etait pas suffisamment documente. JEGO a retenu la reclamation du voyageur.",
  },
  {
    id: 'L0', reference: 'LIT-0961', numeroVoyage: 'JG-260620-0700-DLA-YDE', dateOuverture: J_MOINS_33, heureOuverture: '09:15', dateResolution: J_MOINS_33, heureResolution: '17:45', type: 'remboursement', statut: 'resolu',
    client: 'Alice Manga', trajet: 'Douala → Yaounde', montant: 4000,
    motif: 'Ancien dossier hors de la fenetre des trente derniers jours.', verdict: 'agence', commentaireDecision: 'Dossier clos et archive.',
  },
];

const libellesType = { remboursement: 'Remboursement', bagage: 'Bagage', retard: 'Retard', fraude: 'Fraude' };
const stylesType = {
  remboursement: 'bg-[#0B9E63]/10 text-[#0B9E63]', bagage: 'bg-[#14201A]/8 text-[#14201A]', retard: 'bg-[#E6B84C]/15 text-[#8A6A1E]', fraude: 'bg-[#7C3AED]/10 text-[#7C3AED]',
};

function horodatage(date: string, heure: string) {
  return new Date(`${date}T${heure}:00`).getTime();
}

function dateFr(date: string) {
  return date.split('-').reverse().join('/');
}

export default function LitigesPage() {
  const langue = useLangue();
  const t = langue === 'en' ? {
    title: 'Disputes', subtitle: 'Open disputes are sorted from oldest to newest. Recently resolved disputes are shown separately, from newest to oldest.',
    openHistory: 'Unresolved disputes', resolvedHistory: 'Recently resolved disputes', openOlder: 'oldest first', resolvedRecent: 'newest first',
    count: 'case(s)', todayView: 'Day-J disputes', filters: 'Filters', status: 'Status', type: 'Type', all: 'All', inProgress: 'In progress', resolved30: 'Resolved (30 days)', noneOpen: 'No unresolved disputes for these filters.', noneResolved: 'No resolved disputes in this period.', noneToday: 'No dispute opened or resolved on this date.', openSpace: 'Open history', closeSpace: 'Close history', recentWindow: 'Resolved during the last 30 days'
  } : {
    title: 'Litiges', subtitle: 'Les dossiers non resolus sont classes du plus ancien au plus recent. Les dossiers resolus affichent les trente derniers jours, du plus recent au plus ancien.',
    openHistory: 'Litiges non resolus', resolvedHistory: "Litiges qui viennent d'etre resolus", openOlder: 'du plus ancien au plus recent', resolvedRecent: 'du plus recent au plus ancien',
    count: 'dossier(s)', todayView: 'Litiges du jour J', filters: 'Filtres', status: 'Statut', type: 'Type', all: 'Tous', inProgress: 'En cours de traitement', resolved30: 'Resolus (30 jours)', noneOpen: 'Aucun litige non resolu pour ces filtres.', noneResolved: 'Aucun litige resolu dans cette periode.', noneToday: 'Aucun litige ouvert ou resolu a cette date.', openSpace: "Ouvrir l'historique", closeSpace: "Fermer l'historique", recentWindow: 'Resolus durant les 30 derniers jours'
  };
  const [dateChoisie, setDateChoisie] = useState(AUJOURDHUI);
  const [filtreStatut, setFiltreStatut] = useState<'tous' | StatutLitige>('tous');
  const [filtreType, setFiltreType] = useState<'tous' | Litige['type']>('tous');
  const [piecesParLitige, setPiecesParLitige] = useState<Record<string, PieceJointe[]>>({});
  const [messageParLitige, setMessageParLitige] = useState<Record<string, string>>({});
  const [contestationOuverte, setContestationOuverte] = useState<string | null>(null);
  const [piecesContestation, setPiecesContestation] = useState<Record<string, PieceJointe[]>>({});
  const [messageContestation, setMessageContestation] = useState<Record<string, string>>({});
  const [contestationEnvoyeeParLitige, setContestationEnvoyeeParLitige] = useState<Record<string, boolean>>({});
  const [confirmation, setConfirmation] = useState('');
  const [historiqueOuvert, setHistoriqueOuvert] = useState<'non_resolus' | 'resolus' | null>(null);
  const [recherche, setRecherche] = useState('');

  const { litigesDuJour, nonResolusHistorique, resolusRecentsHistorique, resultatsRecherche } = useMemo(() => {
    const debutFenetre = addDaysToInput(dateChoisie, -29);
    const typeOk = (litige: Litige) => filtreType === 'tous' || litige.type === filtreType;
    const statutOk = (litige: Litige) => filtreStatut === 'tous' || litige.statut === filtreStatut;

    const duJour = LITIGES_DEMO
      .filter((litige) => (litige.dateOuverture === dateChoisie || litige.dateResolution === dateChoisie) && typeOk(litige) && statutOk(litige))
      .sort((a, b) => {
        const heureA = a.dateResolution === dateChoisie ? (a.heureResolution || '00:00') : a.heureOuverture;
        const heureB = b.dateResolution === dateChoisie ? (b.heureResolution || '00:00') : b.heureOuverture;
        return horodatage(dateChoisie, heureB) - horodatage(dateChoisie, heureA);
      });

    const ouverts = LITIGES_DEMO
      .filter((litige) => litige.statut === 'en_cours' && litige.dateOuverture <= dateChoisie && typeOk(litige))
      .sort((a, b) => horodatage(a.dateOuverture, a.heureOuverture) - horodatage(b.dateOuverture, b.heureOuverture));

    const resolus = LITIGES_DEMO
      .filter((litige) => litige.statut === 'resolu' && !!litige.dateResolution && litige.dateResolution >= debutFenetre && litige.dateResolution <= dateChoisie && typeOk(litige))
      .sort((a, b) => horodatage(b.dateResolution!, b.heureResolution || '00:00') - horodatage(a.dateResolution!, a.heureResolution || '00:00'));

    const terme = recherche.trim().toLowerCase();
    const recherches = !terme ? [] : LITIGES_DEMO.filter((litige) => [
      litige.reference, litige.numeroVoyage, litige.dateOuverture, litige.heureOuverture, litige.dateResolution || '', litige.heureResolution || '', litige.client, litige.trajet, litige.motif, litige.commentaireDecision, String(litige.montant), libellesType[litige.type], litige.statut, litige.verdict || '',
    ].join(' ').toLowerCase().includes(terme));

    return { litigesDuJour: duJour, nonResolusHistorique: ouverts, resolusRecentsHistorique: resolus, resultatsRecherche: recherches };
  }, [dateChoisie, filtreStatut, filtreType, recherche]);

  function transformerFichiers(fichiers: File[]) {
    return fichiers.map((fichier) => ({
      id: `${fichier.name}-${Date.now()}-${Math.random()}`,
      nom: fichier.name,
      type: fichier.type.startsWith('image/') ? 'image' as const : 'document' as const,
      url: URL.createObjectURL(fichier),
    }));
  }

  function choisirPieces(litigeId: string, e: React.ChangeEvent<HTMLInputElement>, contexte: 'dossier' | 'contestation') {
    const fichiers = Array.from(e.target.files || []) as File[];
    if (!fichiers.length) return;
    const nouvelles = transformerFichiers(fichiers);
    if (contexte === 'dossier') setPiecesParLitige((etat) => ({ ...etat, [litigeId]: [...(etat[litigeId] || []), ...nouvelles] }));
    else setPiecesContestation((etat) => ({ ...etat, [litigeId]: [...(etat[litigeId] || []), ...nouvelles] }));
    e.target.value = '';
  }

  function envoyerDocuments(litige: Litige) {
    const pieces = piecesParLitige[litige.id] || [];
    const message = messageParLitige[litige.id] || '';
    if (pieces.length === 0 && !message.trim()) return;
    setConfirmation(`Documents supplementaires envoyes pour ${litige.reference} (facade).`);
    setPiecesParLitige((etat) => ({ ...etat, [litige.id]: [] }));
    setMessageParLitige((etat) => ({ ...etat, [litige.id]: '' }));
    window.setTimeout(() => setConfirmation(''), 2600);
  }

  function envoyerContestation(litige: Litige) {
    if (litige.statut !== 'resolu' || litige.verdict !== 'opposition' || contestationEnvoyeeParLitige[litige.id]) return;
    setConfirmation(`Contestation envoyee pour ${litige.reference} (une seule contestation autorisee).`);
    setContestationEnvoyeeParLitige((etat) => ({ ...etat, [litige.id]: true }));
    setPiecesContestation((etat) => ({ ...etat, [litige.id]: [] }));
    setMessageContestation((etat) => ({ ...etat, [litige.id]: '' }));
    setContestationOuverte(null);
    window.setTimeout(() => setConfirmation(''), 2600);
  }

  function apercuPieces(pieces: PieceJointe[]) {
    if (pieces.length === 0) return null;
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {pieces.map((piece) => (
          <div key={piece.id} className="w-20 h-20 shrink-0 rounded-xl border border-[#E7ECE8] bg-white overflow-hidden p-1.5">
            {piece.type === 'image' ? <img src={piece.url} alt={piece.nom} className="w-full h-full object-cover rounded-lg" /> : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center text-[9px] text-[#64746C]"><span className="text-base">📄</span><span className="break-all line-clamp-2">{piece.nom}</span></div>
            )}
          </div>
        ))}
      </div>
    );
  }

  function carteLitige(litige: Litige) {
    const pieces = piecesParLitige[litige.id] || [];
    const piecesRecours = piecesContestation[litige.id] || [];
    const contestationAffichee = contestationOuverte === litige.id;
    const contestationDejaEnvoyee = !!contestationEnvoyeeParLitige[litige.id];
    return (
      <div key={litige.id} className="bg-white rounded-2xl border border-[#E7ECE8] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[15px] font-extrabold text-[#14201A]">{litige.reference} · {litige.client}</p>
            <p className="text-[11px] text-[#64746C] mt-0.5">{litige.trajet}</p>
            <p className="text-[10px] font-semibold text-[#8B9890] mt-1">Ouvert le {dateFr(litige.dateOuverture)} a {litige.heureOuverture} · voyage {litige.numeroVoyage}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${stylesType[litige.type]}`}>{libellesType[litige.type]}</span>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${litige.statut === 'en_cours' ? 'bg-[#E6B84C]/15 text-[#8A6A1E]' : 'bg-[#0B9E63]/10 text-[#0B9E63]'}`}>{litige.statut === 'en_cours' ? 'En cours de traitement par JEGO' : 'Resolu'}</span>
          </div>
        </div>

        <p className="text-[12px] text-[#64746C] mb-3">{litige.motif}</p>
        <p className="text-[11px] text-[#64746C] mb-4">Montant concerne : <strong className="text-[#14201A]">{litige.montant.toLocaleString('fr-FR')} F</strong></p>

        {litige.statut === 'en_cours' ? (
          <div className="rounded-2xl bg-[#F8FAF8] border border-[#E7ECE8] p-4">
            <p className="text-[12px] font-extrabold text-[#14201A] mb-1">Ajouter des documents supplementaires</p>
            <p className="text-[10px] text-[#64746C] mb-3">Images, PDF, DOC, DOCX ou TXT.</p>
            {apercuPieces(pieces)}
            <textarea rows={3} value={messageParLitige[litige.id] || ''} onChange={(e) => setMessageParLitige((etat) => ({ ...etat, [litige.id]: e.target.value }))} placeholder="Commentaire pour JEGO..." className="w-full rounded-xl px-4 py-3 text-[11px] resize-none mb-3" />
            <div className="flex flex-wrap gap-2">
              <label className="rounded-xl bg-[#14201A]/7 text-[#14201A] font-bold text-[11px] px-4 py-2.5 cursor-pointer">Ajouter des fichiers<input type="file" accept="image/*,.pdf,.doc,.docx,.txt" multiple onChange={(e) => choisirPieces(litige.id, e, 'dossier')} className="hidden" /></label>
              <button onClick={() => envoyerDocuments(litige)} disabled={pieces.length === 0 && !(messageParLitige[litige.id] || '').trim()} className="rounded-xl bg-[#0B9E63] disabled:opacity-40 text-white font-bold text-[11px] px-4 py-2.5">Envoyer a JEGO</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className={`rounded-2xl border p-4 ${litige.verdict === 'agence' ? 'bg-[#0B9E63]/7 border-[#0B9E63]/20' : 'bg-[#D9534F]/7 border-[#D9534F]/20'}`}>
              <p className="text-[9px] uppercase tracking-[0.16em] text-[#8A968F] mb-1">Verdict JEGO</p>
              <p className={`text-[13px] font-extrabold ${litige.verdict === 'agence' ? 'text-[#0B9E63]' : 'text-[#D9534F]'}`}>{litige.verdict === 'agence' ? 'En votre faveur' : "En faveur de l'opposition"}</p>
              {litige.dateResolution && <p className="text-[10px] font-semibold text-[#8B9890] mt-1">Decision du {dateFr(litige.dateResolution)} a {litige.heureResolution} · voyage {litige.numeroVoyage}</p>}
              <p className="text-[11px] text-[#64746C] mt-2">{litige.commentaireDecision}</p>
            </div>

            {litige.verdict === 'opposition' ? (
              <>
                {contestationDejaEnvoyee ? (
                  <div className="rounded-2xl border border-[#0B9E63]/18 bg-[#0B9E63]/7 p-4">
                    <p className="text-[12px] font-extrabold text-[#14201A] mb-1">Contestation deja envoyee</p>
                    <p className="text-[10px] text-[#64746C]">Une seule contestation est autorisee pour une decision defavorable. Aucun nouvel envoi n'est possible.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-end"><button onClick={() => setContestationOuverte(contestationAffichee ? null : litige.id)} className="rounded-xl bg-[#14201A] text-white font-bold text-[11px] px-4 py-2.5">{contestationAffichee ? 'Fermer' : 'Contester la decision'}</button></div>
                    {contestationAffichee && (
                      <div className="rounded-2xl bg-[#F8FAF8] border border-[#E7ECE8] p-4">
                        <p className="text-[12px] font-extrabold text-[#14201A] mb-1">Contestation</p>
                        <p className="text-[10px] text-[#64746C] mb-3">Le message et les documents sont facultatifs. Tu peux envoyer la contestation sans piece jointe. Une seule contestation est autorisee.</p>
                        {apercuPieces(piecesRecours)}
                        <textarea rows={3} value={messageContestation[litige.id] || ''} onChange={(e) => setMessageContestation((etat) => ({ ...etat, [litige.id]: e.target.value }))} placeholder="Motif facultatif de la contestation..." className="w-full rounded-xl px-4 py-3 text-[11px] resize-none mb-3" />
                        <div className="flex flex-wrap gap-2">
                          <label className="rounded-xl bg-[#14201A]/7 text-[#14201A] font-bold text-[11px] px-4 py-2.5 cursor-pointer">Ajouter des fichiers (facultatif)<input type="file" accept="image/*,.pdf,.doc,.docx,.txt" multiple onChange={(e) => choisirPieces(litige.id, e, 'contestation')} className="hidden" /></label>
                          <button onClick={() => envoyerContestation(litige)} className="rounded-xl bg-[#D9534F] text-white font-bold text-[11px] px-4 py-2.5">Envoyer la contestation</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-right text-[10px] font-semibold text-[#0B9E63]">Decision favorable : aucune contestation necessaire.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <LayoutAgence>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-[28px] font-extrabold text-[#14201A] mb-1">{t.title}</h1>
        <p className="text-[13px] text-[#64746C] mb-5">{t.subtitle}</p>

        {confirmation && <div className="rounded-2xl p-3 mb-5 bg-[#0B9E63]/10 border border-[#0B9E63]/20 text-[11px] font-semibold text-[#0B9E63]">{confirmation}</div>}

        <div className="bg-white rounded-2xl border border-[#E7ECE8] p-4 mb-5">
          <label className="block text-[11px] font-semibold text-[#64746C] mb-2">Recherche globale sur tous les litiges</label>
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Reference, client, numero de voyage, motif, date..." className="w-full rounded-xl px-4 py-3 text-[13px]" />
          <p className="text-[10px] text-[#8B9890] mt-2">La recherche parcourt toute la page sur toutes les dates.</p>
        </div>

        {recherche.trim() && (
          <div className="bg-white rounded-2xl border border-[#E7ECE8] overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-[#E7ECE8]">
              <h2 className="text-sm font-bold text-[#14201A]">Resultats de recherche ({resultatsRecherche.length})</h2>
            </div>
            <div className="divide-y divide-[#E7ECE8]">
              {resultatsRecherche.map(carteLitige)}
              {resultatsRecherche.length === 0 && <div className="p-6 text-[12px] text-[#64746C]">Aucun litige ne correspond a cette recherche.</div>}
            </div>
          </div>
        )}

        <DateNavigator date={dateChoisie} onChange={setDateChoisie} className="mb-5" />

        <div className="grid md:grid-cols-2 gap-4 mb-5">
          <button
            type="button"
            onClick={() => setHistoriqueOuvert((etat) => etat === 'non_resolus' ? null : 'non_resolus')}
            className={`text-left rounded-2xl border p-4 transition-colors ${historiqueOuvert === 'non_resolus' ? 'bg-[#14201A] border-[#14201A] text-white' : 'bg-white border-[#E7ECE8]'}`}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className={`text-[12px] font-extrabold ${historiqueOuvert === 'non_resolus' ? 'text-white' : 'text-[#14201A]'}`}>{t.openHistory}</p>
              <span className={`min-w-7 h-7 px-2 rounded-full flex items-center justify-center text-[10px] font-bold ${historiqueOuvert === 'non_resolus' ? 'bg-white/15 text-white' : 'bg-[#F1F4F1] text-[#14201A]'}`}>{nonResolusHistorique.length}</span>
            </div>
            <p className={`text-[10px] ${historiqueOuvert === 'non_resolus' ? 'text-white/70' : 'text-[#64746C]'}`}>{t.openOlder} · {historiqueOuvert === 'non_resolus' ? t.closeSpace : t.openSpace}</p>
          </button>

          <button
            type="button"
            onClick={() => setHistoriqueOuvert((etat) => etat === 'resolus' ? null : 'resolus')}
            className={`text-left rounded-2xl border p-4 transition-colors ${historiqueOuvert === 'resolus' ? 'bg-[#0B9E63] border-[#0B9E63] text-white' : 'bg-white border-[#E7ECE8]'}`}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className={`text-[12px] font-extrabold ${historiqueOuvert === 'resolus' ? 'text-white' : 'text-[#14201A]'}`}>{t.resolvedHistory}</p>
              <span className={`min-w-7 h-7 px-2 rounded-full flex items-center justify-center text-[10px] font-bold ${historiqueOuvert === 'resolus' ? 'bg-white/15 text-white' : 'bg-[#F1F4F1] text-[#14201A]'}`}>{resolusRecentsHistorique.length}</span>
            </div>
            <p className={`text-[10px] ${historiqueOuvert === 'resolus' ? 'text-white/70' : 'text-[#64746C]'}`}>{t.resolvedRecent} · {historiqueOuvert === 'resolus' ? t.closeSpace : t.openSpace}</p>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7ECE8] p-4 mb-5 flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#8B9890]">{t.status}</span>
            {([{ valeur: 'tous', label: t.all }, { valeur: 'en_cours', label: t.inProgress }, { valeur: 'resolu', label: t.resolved30 }] as const).map((item) => (
              <button key={item.valeur} onClick={() => setFiltreStatut(item.valeur)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${filtreStatut === item.valeur ? 'bg-[#0B9E63] text-white' : 'bg-[#F5F7F5] border border-[#E7ECE8] text-[#64746C]'}`}>{item.label}</button>
            ))}
          </div>
          <div className="h-6 w-px bg-[#E7ECE8] hidden md:block" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#8B9890]">{t.type}</span>
            {(['tous', 'remboursement', 'bagage', 'retard', 'fraude'] as const).map((type) => (
              <button key={type} onClick={() => setFiltreType(type)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${filtreType === type ? 'bg-[#14201A] text-white' : 'bg-[#F5F7F5] border border-[#E7ECE8] text-[#64746C]'}`}>{type === 'tous' ? t.all : libellesType[type]}</button>
            ))}
          </div>
        </div>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-extrabold text-[#14201A]">{t.todayView} · {dateFr(dateChoisie)}</h2>
            <span className="text-[10px] font-bold text-[#8B9890]">{litigesDuJour.length} {t.count}</span>
          </div>
          <div className="space-y-4">
            {litigesDuJour.map(carteLitige)}
            {litigesDuJour.length === 0 && <div className="bg-white rounded-2xl border border-[#E7ECE8] p-8 text-center text-[12px] text-[#64746C]">{t.noneToday}</div>}
          </div>
        </section>

        {historiqueOuvert === 'non_resolus' && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-extrabold text-[#14201A]">{t.openHistory} · {t.openOlder}</h2>
              <span className="text-[10px] font-bold text-[#8B9890]">{nonResolusHistorique.length} {t.count}</span>
            </div>
            <div className="space-y-4">
              {nonResolusHistorique.map(carteLitige)}
              {nonResolusHistorique.length === 0 && <div className="bg-white rounded-2xl border border-[#E7ECE8] p-8 text-center text-[12px] text-[#64746C]">{t.noneOpen}</div>}
            </div>
          </section>
        )}

        {historiqueOuvert === 'resolus' && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-[13px] font-extrabold text-[#14201A]">{t.resolvedHistory} · {t.resolvedRecent}</h2>
                <p className="text-[10px] text-[#8B9890] mt-1">{t.recentWindow}</p>
              </div>
              <span className="text-[10px] font-bold text-[#8B9890]">{resolusRecentsHistorique.length} {t.count}</span>
            </div>
            <div className="space-y-4">
              {resolusRecentsHistorique.map(carteLitige)}
              {resolusRecentsHistorique.length === 0 && <div className="bg-white rounded-2xl border border-[#E7ECE8] p-8 text-center text-[12px] text-[#64746C]">{t.noneResolved}</div>}
            </div>
          </section>
        )}
      </div>
    </LayoutAgence>
  );
}
