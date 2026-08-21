"use client";

// BRANCHÉ SUR LE VRAI BACKEND — GET /api/messages/admin/conversations,
// GET/POST /api/messages/admin/conversations/:agenceId. Chaque message
// envoyé ici arrive réellement dans l'espace agence (page Discussion).

import { useCallback, useEffect, useRef, useState } from "react";
import { Panel } from "@/components/ui";
import { apiFetch, getToken } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Conversation = {
  agence_id: string;
  agence_nom: string;
  dernier_texte: string;
  dernier_auteur: "agence" | "admin";
  dernier_le: string;
  non_lus: number;
};

type AgenceOption = { id: string; nom: string };

type Message = {
  id: string;
  auteur_type: "agence" | "admin";
  texte: string;
  piece_jointe_nom: string | null;
  piece_jointe_url: string | null;
  piece_jointe_type: string | null;
  cree_le: string;
};

function formatHeure(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function memeJour(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}
function formatSeparateurDate(iso: string): string {
  const date = new Date(iso);
  const aujourdhui = new Date();
  const hier = new Date(); hier.setDate(hier.getDate() - 1);
  if (date.toDateString() === aujourdhui.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === hier.toDateString()) return "Hier";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function formatDateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function BullePieceJointe({ nom, url, type }: { nom: string; url: string; type: string | null }) {
  const estImage = type?.startsWith("image/");
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

export default function MessagesAdmin() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chargementListe, setChargementListe] = useState(true);
  const [erreurListe, setErreurListe] = useState<string | null>(null);

  const [agenceOuverte, setAgenceOuverte] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chargementFil, setChargementFil] = useState(false);
  const [erreurFil, setErreurFil] = useState<string | null>(null);
  const [texte, setTexte] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const zoneScrollRef = useRef<HTMLDivElement>(null);

  const [toutesLesAgences, setToutesLesAgences] = useState<AgenceOption[]>([]);
  const [dialogueNouveauMessage, setDialogueNouveauMessage] = useState(false);
  const [rechercheAgence, setRechercheAgence] = useState("");

  // Auto-scroll : ne descendre automatiquement que si un VRAI nouveau
  // message arrive et que l'admin était déjà proche du bas -- sinon le
  // polling en tâche de fond ramènerait la vue en bas même en train de
  // relire l'historique plus haut. Réinitialisé à chaque changement de
  // conversation (toujours scroller en bas à l'ouverture d'un fil).
  const nombreMessagesPrecedent = useRef(0);
  const premierChargementFil = useRef(true);
  const procheDuBas = useRef(true);
  const conversationCourante = useRef<string | null>(null);

  useEffect(() => {
    apiFetch("/api/admin/agences")
      .then((data) => setToutesLesAgences((data.agences || []).map((a: { id: string; nom: string }) => ({ id: a.id, nom: a.nom }))))
      .catch(() => setToutesLesAgences([]));
  }, []);

  const chargerConversations = useCallback(async (silencieux = false) => {
    if (!silencieux) setChargementListe(true);
    try {
      const data = await apiFetch("/api/messages/admin/conversations");
      setConversations(data.conversations || []);
      setErreurListe(null);
    } catch (err) {
      if (!silencieux) setErreurListe(err instanceof Error ? err.message : "Impossible de charger les conversations.");
    } finally {
      if (!silencieux) setChargementListe(false);
    }
  }, []);

  useEffect(() => { chargerConversations(); }, [chargerConversations]);

  useEffect(() => {
    const intervalle = window.setInterval(() => chargerConversations(true), 10000);
    return () => window.clearInterval(intervalle);
  }, [chargerConversations]);

  const ouvrirConversation = useCallback(async (conv: Conversation, silencieux = false) => {
    if (conversationCourante.current !== conv.agence_id) {
      conversationCourante.current = conv.agence_id;
      premierChargementFil.current = true;
      nombreMessagesPrecedent.current = 0;
      procheDuBas.current = true;
    }
    setAgenceOuverte(conv);
    if (!silencieux) setChargementFil(true);
    setErreurFil(null);
    try {
      const data = await apiFetch(`/api/messages/admin/conversations/${conv.agence_id}`);
      setMessages(data.messages || []);
      chargerConversations(true);
      window.dispatchEvent(new Event('jego-messages-lus'));
    } catch (err) {
      if (!silencieux) setErreurFil(err instanceof Error ? err.message : "Impossible de charger cette discussion.");
    } finally {
      if (!silencieux) setChargementFil(false);
    }
  }, [chargerConversations]);

  useEffect(() => {
    if (!agenceOuverte) return;
    const intervalle = window.setInterval(() => ouvrirConversation(agenceOuverte, true), 6000);
    return () => window.clearInterval(intervalle);
  }, [agenceOuverte, ouvrirConversation]);

  useEffect(() => {
    const aAugmente = messages.length > nombreMessagesPrecedent.current;
    nombreMessagesPrecedent.current = messages.length;
    if (premierChargementFil.current && messages.length > 0) {
      premierChargementFil.current = false;
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

  // Démarre un fil avec une agence qui n'a encore aucun message -- le
  // backend accepte déjà ce cas (renvoie simplement une liste vide).
  function demarrerConversation(agence: AgenceOption) {
    setDialogueNouveauMessage(false);
    setRechercheAgence("");
    ouvrirConversation({
      agence_id: agence.id, agence_nom: agence.nom,
      dernier_texte: "", dernier_auteur: "admin", dernier_le: "", non_lus: 0
    });
  }

  const agencesFiltrees = toutesLesAgences.filter((a) =>
    a.nom.toLowerCase().includes(rechercheAgence.trim().toLowerCase())
  );

  function choisirFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFichier(f);
    e.target.value = "";
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if ((!texte.trim() && !fichier) || !agenceOuverte || envoiEnCours) return;
    setEnvoiEnCours(true);
    setErreurFil(null);
    try {
      if (fichier) {
        const formulaire = new FormData();
        formulaire.append("texte", texte.trim());
        formulaire.append("fichier", fichier);
        const res = await fetch(`${API_BASE}/api/messages/admin/conversations/${agenceOuverte.agence_id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken() || ""}` },
          body: formulaire,
        });
        const corps = await res.json().catch(() => ({ error: `Erreur HTTP ${res.status}` }));
        if (!res.ok) throw new Error(corps.error || `Erreur HTTP ${res.status}`);
      } else {
        await apiFetch(`/api/messages/admin/conversations/${agenceOuverte.agence_id}`, {
          method: "POST",
          body: JSON.stringify({ texte: texte.trim() }),
        });
      }
      setTexte("");
      setFichier(null);
      procheDuBas.current = true;
      await ouvrirConversation(agenceOuverte, true);
    } catch (err) {
      setErreurFil(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Messages</h1>
        <p className="text-sm text-ink-soft mt-1">Discussions avec les agences partenaires.</p>
      </div>

      <div className="grid grid-cols-[320px_1fr] gap-5 h-[calc(100vh-150px)] min-h-0">
        <div className="min-h-0 h-full">
        <Panel
          title={`Conversations (${conversations.length})`}
          action={
            <button
              onClick={() => setDialogueNouveauMessage(true)}
              className="text-[11.5px] font-bold text-green-700 hover:underline"
            >
              + Nouveau message
            </button>
          }
        >
          <div className="h-full overflow-y-auto">
            {chargementListe ? (
              <p className="p-5 text-sm text-ink-soft">Chargement...</p>
            ) : erreurListe ? (
              <p className="p-5 text-sm text-red">{erreurListe}</p>
            ) : conversations.length === 0 ? (
              <p className="p-5 text-sm text-ink-soft">Aucune conversation pour l&apos;instant.</p>
            ) : (
              <div className="divide-y divide-line">
                {conversations.map((conv) => (
                  <button
                    key={conv.agence_id}
                    onClick={() => ouvrirConversation(conv)}
                    className={`w-full text-left px-4 py-3.5 transition-colors ${
                      agenceOuverte?.agence_id === conv.agence_id ? "bg-green-700/10 border-l-[3px] border-l-green-700" : "hover:bg-off-white border-l-[3px] border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-ink truncate">{conv.agence_nom}</span>
                      <span className="text-[10px] text-ink-soft shrink-0">{formatDateCourte(conv.dernier_le)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-[11.5px] text-ink-soft truncate">
                        {conv.dernier_auteur === "admin" ? "Vous : " : ""}{conv.dernier_texte}
                      </span>
                      {conv.non_lus > 0 && (
                        <span className="text-[10px] font-bold bg-red text-white rounded-full px-1.5 shrink-0">{conv.non_lus}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Panel>
        </div>

        <div className="bg-paper rounded-3xl border border-line shadow-sm flex flex-col min-h-0">
          {!agenceOuverte ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-ink-soft">Choisis une conversation à gauche.</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-line">
                <p className="text-[15px] font-bold text-ink">{agenceOuverte.agence_nom}</p>
              </div>

              <div ref={zoneScrollRef} onScroll={gererScroll} className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-4">
                {chargementFil ? (
                  <p className="text-[13px] text-ink-soft text-center mt-10">Chargement...</p>
                ) : erreurFil ? (
                  <p className="text-[13px] text-red text-center mt-10">{erreurFil}</p>
                ) : messages.length === 0 ? (
                  <p className="text-[13px] text-ink-soft text-center mt-10">Aucun message pour l&apos;instant.</p>
                ) : (
                  messages.map((m, i) => (
                    <div key={m.id}>
                      {(i === 0 || !memeJour(m.cree_le, messages[i - 1].cree_le)) && (
                                                <div className="sticky top-0 z-10 flex justify-center py-2 -mt-2 mb-1">
                          <span className="text-[10.5px] font-semibold text-ink-soft bg-off-white rounded-full px-3 py-1">{formatSeparateurDate(m.cree_le)}</span>
                        </div>
                      )}
                      <div className={`flex ${m.auteur_type === "admin" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${m.auteur_type === "admin" ? "bg-green-700 text-white rounded-br-sm" : "bg-off-white text-ink rounded-bl-sm"}`}>
                        {m.texte && <p className="text-[13px] whitespace-pre-wrap">{m.texte}</p>}
                        {m.piece_jointe_url && m.piece_jointe_nom && (
                          <BullePieceJointe nom={m.piece_jointe_nom} url={m.piece_jointe_url} type={m.piece_jointe_type} />
                        )}
                        <p className={`text-[10px] mt-2 ${m.auteur_type === "admin" ? "text-white/70" : "text-ink-soft"}`}>{formatHeure(m.cree_le)}</p>
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
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(e); } }}
                      placeholder="Réponds à l'agence..."
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
            </>
          )}
        </div>
      </div>

      {dialogueNouveauMessage && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-50" onClick={() => setDialogueNouveauMessage(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper rounded-2xl p-6 max-w-sm w-full border border-line max-h-[70vh] flex flex-col">
            <p className="text-[15px] font-bold text-ink mb-3">Écrire à une agence</p>
            <input
              value={rechercheAgence}
              onChange={(e) => setRechercheAgence(e.target.value)}
              placeholder="Rechercher une agence..."
              autoFocus
              className="w-full rounded-lg border border-line bg-off-white px-3 py-2.5 text-[13px] mb-3"
            />
            <div className="flex-1 overflow-y-auto -mx-2">
              {agencesFiltrees.length === 0 ? (
                <p className="px-2 text-[12px] text-ink-soft">Aucune agence trouvée.</p>
              ) : (
                agencesFiltrees.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => demarrerConversation(a)}
                    className="w-full text-left px-2 py-2.5 rounded-lg hover:bg-off-white text-[13px] font-semibold text-ink"
                  >
                    {a.nom}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
