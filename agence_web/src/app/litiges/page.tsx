'use client';

// ✅ BRANCHÉ (repli démo) — GET /api/litiges/mes-litiges, PUT /:id/reponse
// { reponse } (texte uniquement — le fichier reste démo, la route ne
// l'accepte pas). ⚠️ Modèle de données corrigé pour matcher le vrai
// backend : motif en texte libre (pas de catégories fixes), pas de
// "verdict agence/opposition" — l'agence répond, seul l'admin décide,
// à n'importe quel moment (pas d'attente obligatoire de 48h côté agence).

import { useEffect, useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import DateNavigator from '../components/DateNavigator';
import { Panel, Badge, BtnMini, ToastDemo } from '../components/ui';
import { addDaysToInput, todayInputDate } from '../lib/date';
import { apiFetch } from '../lib/api';

type Litige = {
  id: string | number;
  numero: string;
  motif: string;
  description: string;
  statut: string;
  niveau: number;
  reponse_agence: string | null;
  decision: string | null;
  cree_le: string;
  // Démo uniquement — absents de la vraie réponse API :
  client?: string;
  trajet?: string;
  trajet_id?: string;
  montant?: number;
  signalants?: string[]; // liste des voyageurs ayant signalé, cas de déclaration collective (fausse arrivée)
};

const AUJOURDHUI = todayInputDate();

const litigesDemo: Litige[] = [
  { id: 'demo-1', numero: 'LIT-1001', motif: 'Remboursement demandé après annulation tardive', description: 'Le voyageur demande un remboursement après une annulation tardive.', statut: 'ouvert', niveau: 1, reponse_agence: null, decision: null, cree_le: new Date().toISOString(), client: 'Jean Mvondo', trajet: 'Douala → Yaoundé', trajet_id: 'TRJ-4821', montant: 4000 },
  { id: 'demo-2', numero: 'LIT-1002', motif: 'Bagage manquant à l\u2019arrivée', description: "Bagage déclaré manquant à l'arrivée, vérification en cours.", statut: 'ouvert', niveau: 1, reponse_agence: null, decision: null, cree_le: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), client: 'Nadine Essomba', trajet: 'Yaoundé → Douala', trajet_id: 'TRJ-4796', montant: 0 },
  { id: 'demo-3', numero: 'LIT-0994', motif: 'Compensation pour fort retard', description: 'Demande de compensation suite à un fort retard.', statut: 'resolu', niveau: 3, reponse_agence: 'Les preuves de départ montrent un respect des horaires.', decision: "En faveur de l'agence. Raison communiquée au perdant : les preuves de départ et d'arrivée montrent que l'agence a informé les voyageurs dans les délais prévus.", cree_le: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(), client: 'Pauline Nana', trajet: 'Douala → Kribi', trajet_id: 'TRJ-4650', montant: 1500 },
  { id: 'demo-4', numero: 'LIT-1006', motif: 'Fausse déclaration d\u2019arrivée signalée par plusieurs passagers', description: 'Le seuil de signalements collectifs a été atteint pendant le trajet — litige ouvert automatiquement.', statut: 'ouvert', niveau: 1, reponse_agence: null, decision: null, cree_le: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), client: 'Signalement collectif', trajet: 'Bafoussam → Douala', trajet_id: 'TRJ-4901', montant: 0, signalants: ['Jean Mvondo', 'Nadine Essomba', 'Paul Nkeng', 'Sarah Mballa'] },
];

export default function LitigesPage() {
  const [litiges, setLitiges] = useState<Litige[]>([]);
  const [modeDemo, setModeDemo] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dateChoisie, setDateChoisie] = useState(AUJOURDHUI);
  const [recherche, setRecherche] = useState('');

  const [reponseOuverte, setReponseOuverte] = useState<string | number | null>(null);
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
      if (data.litiges && data.litiges.length > 0) {
        setLitiges(data.litiges);
        setModeDemo(false);
      } else {
        setLitiges(litigesDemo);
        setModeDemo(true);
      }
    } catch {
      setLitiges(litigesDemo);
      setModeDemo(true);
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
      if (modeDemo) {
        setLitiges((prev) => prev.map((l) => (l.id === litige.id ? { ...l, reponse_agence: texteReponse, niveau: 2 } : l)));
      } else {
        await apiFetch(`/api/litiges/${litige.id}/reponse`, {
          method: 'PUT',
          body: JSON.stringify({ reponse: texteReponse }),
        });
        await charger();
      }
      if (fichiersReponse.length > 0) {
        notifier(`Réponse envoyée — ${fichiersReponse.length} pièce(s) jointe(s) NON envoyée(s) (démo, route sans upload)`);
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
          {litige.client && (
            <p className="text-[12px] text-ink-soft mb-1">
              {litige.client} · {litige.trajet} {litige.trajet_id && <span className="font-mono">#{litige.trajet_id}</span>}{litige.montant ? ` · ${litige.montant} F` : ''}
            </p>
          )}
          <p className="text-[13px] font-semibold text-ink mb-1">{litige.motif}</p>
          <p className="text-[13px] text-ink-soft mb-2">{litige.description}</p>

          {litige.signalants && litige.signalants.length > 0 && (
            <div className="bg-red-bg rounded-lg px-3 py-2 mb-2 text-[12.5px]">
              <b>Voyageurs ayant signalé ({litige.signalants.length}) :</b> {litige.signalants.join(', ')}
            </div>
          )}

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
                  {fichiersReponse.length > 0 && <span className="text-[11px] text-amber">(démo — non envoyés réellement)</span>}
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

        <div className="flex items-center justify-between gap-3 mb-4">
          {modeDemo ? (
            <div className="text-xs font-semibold text-amber bg-amber-bg rounded-lg px-3 py-2">Mode démo — données factices</div>
          ) : <div />}
          <button onClick={() => { setLitiges(litigesDemo); setModeDemo(true); }} className="text-[11px] font-bold text-green-700 underline shrink-0">
            Voir des données de démonstration
          </button>
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
