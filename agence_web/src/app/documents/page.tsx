'use client';

// BRANCHÉ SUR LE VRAI BACKEND.
//   GET    /api/agences/documents       → mes documents + demandes ouvertes
//   POST   /api/agences/documents       → téléversement (multipart)
//   DELETE /api/agences/documents/:id   → retrait (impossible si déjà vérifié)
//
// Le téléversement n'utilise PAS apiFetch : ce helper impose
// Content-Type: application/json, ce qui casserait un envoi de fichier.

import { useEffect, useRef, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import { apiFetch, getToken } from '../lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const TYPES_SUGGERES = [
  'Registre de commerce',
  'Assurance flotte',
  'Autorisation de transport',
  'Pièce d\'identité du dirigeant',
  'Autre document',
];

const TAILLE_MAX_MO = 8;

type DocumentAgence = {
  id: string;
  type_document: string;
  nom_fichier: string;
  taille_octets: number;
  statut: 'en_attente' | 'verifie' | 'refuse';
  televerse_le: string;
};

type Demande = { id: string; pieces: string; statut: string; cree_le: string };

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentAgence[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  const [typeDocument, setTypeDocument] = useState(TYPES_SUGGERES[0]);
  const [typeLibre, setTypeLibre] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const champFichier = useRef<HTMLInputElement>(null);

  async function charger() {
    try {
      const res = await apiFetch('/api/agences/documents');
      setDocuments(res.documents || []);
      setDemandes(res.demandes_ouvertes || []);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Impossible de charger tes documents.');
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { charger(); }, []);

  function choisirFichier(e: React.ChangeEvent<HTMLInputElement>) {
    setErreur(null);
    const f = e.target.files?.[0] || null;
    if (f && f.size > TAILLE_MAX_MO * 1024 * 1024) {
      setErreur(`Ce fichier fait ${(f.size / 1024 / 1024).toFixed(1)} Mo — la limite est de ${TAILLE_MAX_MO} Mo.`);
      setFichier(null);
      if (champFichier.current) champFichier.current.value = '';
      return;
    }
    setFichier(f);
  }

  async function envoyer() {
    setErreur(null);
    setSucces(null);

    const type = typeDocument === 'Autre document' ? typeLibre.trim() : typeDocument;
    if (!type) { setErreur('Précise de quel document il s\'agit.'); return; }
    if (!fichier) { setErreur('Choisis un fichier à envoyer.'); return; }

    setEnvoi(true);
    try {
      const formulaire = new FormData();
      formulaire.append('type_document', type);
      formulaire.append('fichier', fichier);

      // fetch direct : on laisse le navigateur poser le Content-Type
      // multipart avec son délimiteur, ce qu'apiFetch écraserait.
      const res = await fetch(`${API_BASE}/api/agences/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken() || ''}` },
        body: formulaire,
      });
      const corps = await res.json().catch(() => ({ error: `Erreur HTTP ${res.status}` }));
      if (!res.ok) throw new Error(corps.error || `Erreur HTTP ${res.status}`);

      setSucces('Document envoyé. JEGO le vérifiera prochainement.');
      setFichier(null);
      setTypeLibre('');
      if (champFichier.current) champFichier.current.value = '';
      await charger();

    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur lors de l\'envoi.');
    } finally {
      setEnvoi(false);
    }
  }

  async function retirer(doc: DocumentAgence) {
    setErreur(null);
    try {
      await apiFetch(`/api/agences/documents/${doc.id}`, { method: 'DELETE' });
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      setSucces('Document retiré.');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur lors du retrait.');
    }
  }

  const libelleStatut = {
    en_attente: { texte: 'En attente de vérification', classe: 'bg-amber/15 text-amber' },
    verifie: { texte: 'Vérifié par JEGO', classe: 'bg-green-700/10 text-green-700' },
    refuse: { texte: 'Refusé', classe: 'bg-red/10 text-red' },
  };

  return (
    <LayoutAgence>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[28px] font-extrabold text-ink">Mes documents</h1>
          <p className="text-[13px] text-ink-soft mt-1">
            Envoie ici les pièces demandées par JEGO. Formats acceptés : PDF, JPEG, PNG, WebP — {TAILLE_MAX_MO} Mo maximum.
          </p>
        </div>

        {demandes.length > 0 && (
          <div className="rounded-2xl bg-amber/8 border border-amber/25 p-4 mb-5">
            <p className="text-[13px] font-semibold text-ink mb-1.5">JEGO attend des documents de ta part</p>
            {demandes.map((d) => (
              <div key={d.id} className="text-[12.5px] text-ink-soft">
                • {d.pieces}
                <span className="text-[11px] ml-1">(demandé le {new Date(d.cree_le).toLocaleDateString('fr-FR')})</span>
              </div>
            ))}
          </div>
        )}

        {erreur && <p className="text-[13px] text-red font-medium mb-3">{erreur}</p>}
        {succes && <p className="text-[13px] text-green-700 font-medium mb-3">{succes}</p>}

        <div className="bg-paper rounded-2xl border border-line p-5 mb-5">
          <p className="text-[14px] font-extrabold text-ink mb-3">Envoyer un document</p>

          <label className="block text-xs font-semibold text-ink-soft mb-1.5">Type de document</label>
          <select
            value={typeDocument}
            onChange={(e) => setTypeDocument(e.target.value)}
            className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm text-ink mb-3"
          >
            {TYPES_SUGGERES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          {typeDocument === 'Autre document' && (
            <input
              value={typeLibre}
              onChange={(e) => setTypeLibre(e.target.value)}
              placeholder="Précise le type de document"
              className="w-full rounded-xl bg-off-white border border-transparent focus:border-green-700 focus:bg-paper outline-none px-4 py-3 text-sm text-ink mb-3"
            />
          )}

          <label className="block text-xs font-semibold text-ink-soft mb-1.5">Fichier</label>
          <input
            ref={champFichier}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={choisirFichier}
            className="w-full text-sm text-ink-soft mb-3 file:mr-3 file:rounded-lg file:border-0 file:bg-off-white file:px-3 file:py-2 file:text-[13px] file:font-semibold file:text-ink"
          />
          {fichier && (
            <p className="text-[11.5px] text-ink-soft mb-3">
              {fichier.name} · {(fichier.size / 1024).toFixed(0)} Ko
            </p>
          )}

          <button
            onClick={envoyer}
            disabled={envoi || !fichier}
            className="rounded-xl bg-green-700 hover:bg-green-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[13px] px-5 py-3 transition-colors"
          >
            {envoi ? 'Envoi en cours…' : 'Envoyer le document'}
          </button>
        </div>

        <div className="bg-paper rounded-2xl border border-line p-5">
          <p className="text-[14px] font-extrabold text-ink mb-3">Documents envoyés</p>

          {chargement && <p className="text-[13px] text-ink-soft">Chargement…</p>}
          {!chargement && documents.length === 0 && (
            <p className="text-[13px] text-ink-soft">Aucun document envoyé pour l&apos;instant.</p>
          )}

          {documents.map((d) => (
            <div key={d.id} className="border border-line rounded-xl px-4 py-3 mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink">{d.type_document}</p>
                <p className="text-[11.5px] text-ink-soft truncate">
                  {d.nom_fichier} · {Math.round(d.taille_octets / 1024)} Ko · envoyé le {new Date(d.televerse_le).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${libelleStatut[d.statut].classe}`}>
                  {libelleStatut[d.statut].texte}
                </span>
                {d.statut !== 'verifie' && (
                  <button onClick={() => retirer(d)} className="text-[11.5px] font-semibold text-red">
                    Retirer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </LayoutAgence>
  );
}
