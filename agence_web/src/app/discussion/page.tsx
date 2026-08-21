'use client';

// BRANCHÉ SUR LE VRAI BACKEND — GET/POST /api/messages. Chaque message
// est réellement stocké et lu par l'équipe JEGO côté admin_web (page
// Messages). La pièce jointe (une par message, PDF ou image, 8 Mo max)
// est réellement téléversée et servie depuis /uploads/messages.

import { useCallback, useEffect, useRef, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import { apiFetch, getToken } from '../lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Message = {
  id: string;
  auteur_type: 'agence' | 'admin';
  texte: string;
  piece_jointe_nom: string | null;
  piece_jointe_url: string | null;
  piece_jointe_type: string | null;
  cree_le: string;
};

function formatHeure(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function memeJour(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}
function formatSeparateurDate(iso: string): string {
  const date = new Date(iso);
  const aujourdhui = new Date();
  const hier = new Date(); hier.setDate(hier.getDate() - 1);
  if (date.toDateString() === aujourdhui.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === hier.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function BullePieceJointe({ nom, url, type }: { nom: string; url: string; type: string | null }) {
  const estImage = type?.startsWith('image/');
  return (
    <a href={`${API_BASE}${url}`} target="_blank" rel="noopener noreferrer" className="block mt-2 rounded-xl overflow-hidden border border-black/10 bg-white/20">
      {estImage ? (
        <img src={`${API_BASE}${url}`} alt={nom} className="w-full max-h-48 object-cover" />
      ) : (
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="text-lg">📄</span>
          <span className="text-[11.5px] font-semibold break-all">{nom}</span>
        </div>
      )}
    </a>
  );
}

export default function Discussion() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [texte, setTexte] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const zoneScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll : ne descendre automatiquement que si un VRAI nouveau
  // message arrive et que l'agent était déjà proche du bas -- sinon le
  // polling en tâche de fond ramènerait la vue en bas toutes les 8s
  // même quand l'agent est en train de relire l'historique plus haut.
  const nombreMessagesPrecedent = useRef(0);
  const premierChargement = useRef(true);
  const procheDuBas = useRef(true);

  const charger = useCallback(async (silencieux = false) => {
    if (!silencieux) setChargement(true);
    try {
      const data = await apiFetch('/api/messages');
      setMessages(data.messages || []);
      setErreur(null);
      window.dispatchEvent(new Event('jego-messages-lus'));
    } catch (err) {
      if (!silencieux) setErreur(err instanceof Error ? err.message : 'Impossible de charger la discussion.');
    } finally {
      if (!silencieux) setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  useEffect(() => {
    const intervalle = window.setInterval(() => charger(true), 8000);
    return () => window.clearInterval(intervalle);
  }, [charger]);

  useEffect(() => {
    const aAugmente = messages.length > nombreMessagesPrecedent.current;
    nombreMessagesPrecedent.current = messages.length;
    if (premierChargement.current && messages.length > 0) {
      premierChargement.current = false;
      zoneScrollRef.current?.scrollTo({ top: zoneScrollRef.current.scrollHeight });
      return;
    }
    if (aAugmente && procheDuBas.current) {
      zoneScrollRef.current?.scrollTo({ top: zoneScrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  function gererScroll() {
    const zone = zoneScrollRef.current;
    if (!zone) return;
    procheDuBas.current = zone.scrollHeight - zone.scrollTop - zone.clientHeight < 120;
  }

  function choisirFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFichier(f);
    e.target.value = '';
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if ((!texte.trim() && !fichier) || envoiEnCours) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      if (fichier) {
        const formulaire = new FormData();
        formulaire.append('texte', texte.trim());
        formulaire.append('fichier', fichier);
        const res = await fetch(`${API_BASE}/api/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken() || ''}` },
          body: formulaire,
        });
        const corps = await res.json().catch(() => ({ error: `Erreur HTTP ${res.status}` }));
        if (!res.ok) throw new Error(corps.error || `Erreur HTTP ${res.status}`);
      } else {
        await apiFetch('/api/messages', {
          method: 'POST',
          body: JSON.stringify({ texte: texte.trim() }),
        });
      }
      setTexte('');
      setFichier(null);
      procheDuBas.current = true;
      await charger(true);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Envoi impossible.');
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <LayoutAgence>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-[28px] font-extrabold text-ink mb-1">Discussion avec JEGO</h1>
        <p className="text-[13px] text-ink-soft mb-4">
          Une question, un souci ? Écris directement à l&apos;équipe JEGO, avec une pièce jointe si besoin.
        </p>

        {erreur && <div className="rounded-2xl p-3 mb-4 bg-red/6 border border-red/20 text-[11px] text-red">{erreur}</div>}

        <div className="bg-paper rounded-3xl border border-line shadow-sm flex flex-col h-[620px]">
          <div ref={zoneScrollRef} onScroll={gererScroll} className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-4">
            {chargement ? (
              <p className="text-[13px] text-ink-soft text-center mt-10">Chargement de la discussion...</p>
            ) : messages.length === 0 ? (
              <p className="text-[13px] text-ink-soft text-center mt-10">
                Aucun message pour l&apos;instant. Écris à l&apos;équipe JEGO ci-dessous.
              </p>
            ) : (
              messages.map((m, i) => (
                <div key={m.id}>
                  {(i === 0 || !memeJour(m.cree_le, messages[i - 1].cree_le)) && (
                                        <div className="sticky top-0 z-10 flex justify-center py-2 -mt-2 mb-1">
                      <span className="text-[10.5px] font-semibold text-ink-soft bg-off-white rounded-full px-3 py-1">{formatSeparateurDate(m.cree_le)}</span>
                    </div>
                  )}
                  <div className={`flex ${m.auteur_type === 'agence' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${m.auteur_type === 'agence' ? 'bg-green-700 text-white rounded-br-sm' : 'bg-off-white text-ink rounded-bl-sm'}`}>
                      {m.texte && <p className="text-[13px] whitespace-pre-wrap">{m.texte}</p>}
                      {m.piece_jointe_url && m.piece_jointe_nom && (
                        <BullePieceJointe nom={m.piece_jointe_nom} url={m.piece_jointe_url} type={m.piece_jointe_type} />
                      )}
                      <p className={`text-[10px] mt-2 ${m.auteur_type === 'agence' ? 'text-white/70' : 'text-ink-soft'}`}>{formatHeure(m.cree_le)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={envoyer} className="border-t border-line p-4 space-y-3">
            {fichier && (
              <div className="flex items-center gap-2 rounded-xl bg-off-white px-3 py-2 w-fit">
                <span className="text-sm">📎</span>
                <span className="text-[12px] text-ink font-semibold truncate max-w-[220px]">{fichier.name}</span>
                <button type="button" onClick={() => setFichier(null)} className="text-ink-soft hover:text-red text-sm ml-1">×</button>
              </div>
            )}
            <div className="flex items-end gap-3">
              <label className="w-11 h-11 rounded-xl bg-off-white hover:bg-line flex items-center justify-center cursor-pointer shrink-0 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--c-ink))" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={choisirFichier} className="hidden" />
              </label>

              <div className="flex-1 rounded-2xl bg-off-white border border-transparent focus-within:border-green-700 transition-colors px-4 py-3">
                <textarea
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer(e); } }}
                  placeholder="Écris ton message..."
                  rows={2}
                  className="w-full bg-transparent outline-none resize-none text-[13px]"
                />
              </div>
              <button
                type="submit"
                disabled={(!texte.trim() && !fichier) || envoiEnCours}
                className="w-11 h-11 rounded-xl bg-green-700 hover:bg-green-900 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </LayoutAgence>
  );
}
