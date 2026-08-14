'use client';

// BRANCHÉ SUR LE VRAI BACKEND, sans repli démo.
// GET /api/litiges/mes-litiges, PUT /:id/reponse { reponse } (texte
// uniquement — la route n'accepte pas encore l'upload de fichiers).
// L'agence répond, seul l'admin décide, à n'importe quel moment (pas
// d'attente obligatoire de 48h côté agence).

import { useEffect, useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import DateNavigator from '../components/DateNavigator';
import { Panel, Badge, BtnMini, ToastDemo } from '../components/ui';
import { todayInputDate } from '../lib/date';
import { apiFetch } from '../lib/api';

type Litige = {
  id: string;
  numero: string;
  motif: string;
  description: string;
  statut: string;
  niveau: number;
  reponse_agence: string | null;
  decision: string | null;
  cree_le: string;
  client?: string;
  trajet?: string;
  montant?: number;
};

const AUJOURDHUI = todayInputDate();

export default function LitigesPage() {
  const [litiges, setLitiges] = useState<Litige[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dateChoisie, setDateChoisie] = useState(AUJOURDHUI);
  const [recherche, setRecherche] = useState('');

  const [reponseOuverte, setReponseOuverte] = useState<string | null>(null);
  const [texteReponse, setTexteReponse] = useState('');
  const [fichiersReponse, setFichiersReponse] = useState<File[]>([]);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  function notifier(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  async function charger() {
    setChargement(true);
    setErreur(null);
    try {
      const data = await apiFetch('/api/litiges/mes-litiges');
      setLitiges(data.litiges || []);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Impossible de charger les litiges.');
      setLitiges([]);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { charger(); }, []);

  const enCours = useMemo(() => litiges.filter((l) => l.statut !== 'resolu' && l.statut !== 'cloture'), [litiges]);
  const resolus = useMemo(() => litiges.filter((l) => l.statut === 'resolu' || l.statut === 'cloture'), [litiges]);

  const resultatsRecherche = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return [];
    return litiges.filter((l) => [l.numero, l.motif, l.description, l.client, l.trajet].join(' ').toLowerCase().includes(terme));
  }, [recherche, litiges]);

  async function envoyerReponse(litige: Litige) {
    if (!texteReponse.trim()) return;
    setEnvoiEnCours(true);
    try {
      await apiFetch(`/api/litiges/${litige.id}/reponse`, {
        method: 'PUT',
        body: JSON.stringify({ reponse: texteReponse }),
      });
      await charger();
      if (fichiersReponse.length > 0) {
        notifier(`Réponse envoyée — ${fichiersReponse.length} pièce(s) jointe(s) non transmise(s) (l'envoi de fichiers n'est pas encore pris en charge).`);
      } else {
        notifier('Réponse envoyée à JEGO');
      }
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setEnvoiEnCours(false);
      setReponseOuverte(null);
      setTexteReponse('');
      setFichiersReponse([]);
    }
  }

  function CarteLitige({ litige }: { litige: Litige }) {
    const estResolu = litige.statut === 'resolu' || litige.statut === 'cloture';
    const agenceGagnante = !!litige.decision && litige.decision.toLowerCase().includes("faveur de l'agence");
    return (
      <Panel>
        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <b className="font-mono text-xs text-ink-soft">{litige.numero}</b>
            {estResolu ? <Badge color="grey">Résolu</Badge> : litige.reponse_agence ? <Badge color="amber">Réponse envoyée — en attente de décision JEGO</Badge> : <Badge color="red">En attente de ta réponse</Badge>}
          </div>
          {(litige.client || litige.trajet) && (
            <p className="text-[12px] text-ink-soft mb-1">
              {litige.client}{litige.client && litige.trajet ? ' · ' : ''}{litige.trajet}{litige.montant ? ` · ${litige.montant} F` : ''}
            </p>
          )}
          <p className="text-[13px] font-semibold text-ink mb-1">{litige.motif}</p>
          <p className="text-[13px] text-ink-soft mb-2">{litige.description}</p>

          {litige.reponse_agence && (
            <div className="bg-off-white rounded-lg px-3 py-2 mb-2 text-[12.5px]"><b>Ta réponse :</b> {litige.reponse_agence}</div>
          )}
          {litige.decision && (
            <div className="bg-ok-bg rounded-lg px-3 py-2 mb-2 text-[12.5px]">
              <b>Décision JEGO :</b> {agenceGagnante ? 'en faveur de vous' : litige.decision}
            </div>
          )}

          {!estResolu && !litige.reponse_agence && (
            reponseOuverte === litige.id ? (
              <div className="mt-3 pt-3 border-t border-dashed border-line">
                <textarea value={texteReponse} onChange={(e) => setTexteReponse(e.target.value)} rows={3} placeholder="Ta version des faits…" className="w-full rounded-lg border border-line bg-off-white px-3 py-2 text-[13px] mb-2" />
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="rounded-lg bg-off-white border border-line text-ink font-bold text-[11px] px-3 py-2 cursor-pointer inline-flex items-center gap-1.5">
                    📎 Joindre des fichiers
                    <input type="file" multiple className="hidden" onChange={(e) => setFichiersReponse(Array.from(e.target.files ?? []))} />
                  </label>
                  {fichiersReponse.length > 0 && <span className="text-[11px] text-amber">(non transmis pour l&apos;instant, texte uniquement)</span>}
                </div>
                {fichiersReponse.length > 0 && (
                  <ul className="mb-3 space-y-0.5">
                    {fichiersReponse.map((f, i) => (
                      <li key={i} className="text-[11px] text-ink-soft flex items-center justify-between">
                        <span>{f.name}</span>
                        <button onClick={() => setFichiersReponse((prev) => prev.filter((_, idx) => idx !== i))} className="text-red text-[10px] font-bold ml-2">retirer</button>
                      </li>
                    ))}
                  </ul>
                )}
                <BtnMini variant="primary" onClick={() => !envoiEnCours && envoyerReponse(litige)}>{envoiEnCours ? '…' : 'Envoyer la réponse'}</BtnMini>
                <BtnMini onClick={() => { setReponseOuverte(null); setTexteReponse(''); setFichiersReponse([]); }}>Annuler</BtnMini>
              </div>
            ) : (
              <BtnMini onClick={() => setReponseOuverte(litige.id)}>Répondre (message et/ou fichier)</BtnMini>
            )
          )}
        </div>
      </Panel>
    );
  }

  return (
    <LayoutAgence>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Litiges</h1>
            <p className="text-sm text-ink-soft mt-1">Consultation et réponse facultative — la décision finale appartient uniquement à JEGO.</p>
          </div>
        </div>

        {erreur && <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>}

        <Panel>
          <div className="p-4">
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un litige (numéro, motif, client, trajet)…" className="w-full rounded-lg border border-line bg-off-white px-4 py-2.5 text-[13px]" />
          </div>
        </Panel>

        {recherche.trim() ? (
          <div className="mt-4 space-y-3">
            {resultatsRecherche.length === 0 ? (
              <Panel><div className="p-6 text-[12px] text-ink-soft">Aucun résultat.</div></Panel>
            ) : resultatsRecherche.map((l) => <CarteLitige key={l.id} litige={l} />)}
          </div>
        ) : (
          <>
            <div className="mt-6 mb-4"><DateNavigator date={dateChoisie} onChange={setDateChoisie} /></div>

            {chargement ? (
              <div className="text-sm text-ink-soft">Chargement…</div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="font-display text-[13px] font-semibold uppercase tracking-wide text-ink-soft mb-3">En attente ({enCours.length})</div>
                  {enCours.length === 0 ? (
                    <Panel><div className="p-8 text-center text-[13px] text-ink-soft">Aucun litige en attente</div></Panel>
                  ) : (
                    <div className="space-y-3">{enCours.map((l) => <CarteLitige key={l.id} litige={l} />)}</div>
                  )}
                </div>
                <div>
                  <div className="font-display text-[13px] font-semibold uppercase tracking-wide text-ink-soft mb-3">Résolus récemment ({resolus.length})</div>
                  {resolus.length === 0 ? (
                    <Panel><div className="p-8 text-center text-[13px] text-ink-soft">Aucun litige résolu récemment</div></Panel>
                  ) : (
                    <div className="space-y-3">{resolus.map((l) => <CarteLitige key={l.id} litige={l} />)}</div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
      <ToastDemo message={toast} />
    </LayoutAgence>
  );
}
