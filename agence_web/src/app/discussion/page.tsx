'use client';

import { useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';

type PieceJointe = { id: string; nom: string; url: string; type: 'image' | 'document' };
type Message = {
  id: string;
  auteur: 'agence' | 'jego';
  texte: string;
  heure: string;
  pieces?: PieceJointe[];
};

const messagesInitiaux: Message[] = [
  {
    id: '1',
    auteur: 'jego',
    texte: "Bonjour ! Comment pouvons-nous t'aider aujourd'hui ? Tu peux aussi nous envoyer des images et des documents si besoin.",
    heure: '09:12',
  },
];

export default function Discussion() {
  const [messages, setMessages] = useState<Message[]>(messagesInitiaux);
  const [texte, setTexte] = useState('');
  const [pieces, setPieces] = useState<PieceJointe[]>([]);
  const [enAttente, setEnAttente] = useState(false);

  function choisirFichiers(e: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(e.target.files || []);
    if (!fichiers.length) return;

    const nouvelles = fichiers.map((fichier) => ({
      id: `${fichier.name}-${Date.now()}-${Math.random()}`,
      nom: fichier.name,
      url: URL.createObjectURL(fichier),
      type: fichier.type.startsWith('image/') ? 'image' as const : 'document' as const,
    }));

    setPieces((p) => [...p, ...nouvelles]);
    e.target.value = '';
  }

  function retirerPiece(id: string) {
    setPieces((p) => p.filter((piece) => piece.id !== id));
  }

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!texte.trim() && pieces.length === 0) return;

    const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const jointes = pieces;

    setMessages((m) => [
      ...m,
      {
        id: `${Date.now()}`,
        auteur: 'agence',
        texte: texte.trim() || 'Pieces jointes envoyees.',
        heure,
        pieces: jointes.length ? jointes : undefined,
      },
    ]);

    setTexte('');
    setPieces([]);
    setEnAttente(true);

    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: `${Date.now()}-r`,
          auteur: 'jego',
          texte:
            jointes.length > 0
              ? `Merci, nous avons bien recu ${jointes.length} piece(s) jointe(s). Un conseiller JEGO les examinera bientot.`
              : 'Merci pour ton message, un conseiller JEGO te repondra bientot.',
          heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setEnAttente(false);
    }, 1200);
  }

  return (
    <LayoutAgence>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-[28px] font-extrabold text-[#14201A] mb-1">Discussion avec JEGO</h1>
        <p className="text-[13px] text-[#64746C] mb-2">
          Une question, un souci ? Ecris-nous directement et joins des images ou des documents.
        </p>

        <div className="rounded-2xl p-3 mb-4 bg-[#D9534F]/6 border border-[#D9534F]/20">
          <p className="text-[11px] text-[#64746C]">
            Facade complete -- aucun chat/support reel branche. Reponse simulee ci-dessous.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-[#E7ECE8] shadow-sm flex flex-col h-[620px]">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.auteur === 'agence' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${m.auteur === 'agence' ? 'bg-[#0B9E63] text-white rounded-br-sm' : 'bg-[#F1F4F1] text-[#14201A] rounded-bl-sm'}`}>
                  <p className="text-[13px] whitespace-pre-wrap">{m.texte}</p>

                  {m.pieces && m.pieces.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {m.pieces.map((piece) => (
                        <div key={piece.id} className="rounded-xl overflow-hidden border border-black/5 bg-white/20 p-2">
                          {piece.type === 'image' ? (
                            <img src={piece.url} alt={piece.nom} className="w-full h-24 object-cover rounded-lg" />
                          ) : (
                            <div className="h-24 rounded-lg bg-white/30 flex flex-col items-center justify-center text-center px-2">
                              <span className="text-lg">📄</span>
                              <span className="text-[11px] font-semibold break-all">{piece.nom}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <p className={`text-[10px] mt-2 ${m.auteur === 'agence' ? 'text-white/70' : 'text-[#9AA69F]'}`}>{m.heure}</p>
                </div>
              </div>
            ))}

            {enAttente && (
              <div className="flex justify-start">
                <div className="bg-[#F1F4F1] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9AA69F] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9AA69F] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9AA69F] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={envoyer} className="border-t border-[#E7ECE8] p-4 space-y-3">
            {pieces.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pieces.map((piece) => (
                  <div key={piece.id} className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-[#E7ECE8] bg-[#F6F8F6]">
                    {piece.type === 'image' ? (
                      <img src={piece.url} alt={piece.nom} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-center p-2 text-[11px] text-[#14201A]">
                        <span className="text-lg">📄</span>
                        <span className="break-all">{piece.nom}</span>
                      </div>
                    )}
                    <button type="button" onClick={() => retirerPiece(piece.id)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/65 text-white text-xs">×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-3">
              <label className="w-11 h-11 rounded-xl bg-[#F1F4F1] hover:bg-[#E7ECE8] flex items-center justify-center cursor-pointer shrink-0 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14201A" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <input type="file" accept="image/*,.pdf,.doc,.docx,.txt" multiple onChange={choisirFichiers} className="hidden" />
              </label>

              <div className="flex-1 rounded-2xl bg-[#F1F4F1] border border-transparent focus-within:border-[#0B9E63] transition-colors px-4 py-3">
                <textarea value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Ecris ton message..." rows={2} className="w-full bg-transparent outline-none resize-none text-[13px]" />
                <p className="text-[11px] text-[#9AA69F] mt-1">Tu peux joindre des captures, photos, PDF ou autres documents pour JEGO.</p>
              </div>

              <button type="submit" className="w-11 h-11 rounded-xl bg-[#0B9E63] hover:bg-[#0A8D58] text-white flex items-center justify-center shrink-0 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </LayoutAgence>
  );
}
