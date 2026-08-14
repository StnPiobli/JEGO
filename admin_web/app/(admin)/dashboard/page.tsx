"use client";
// BRANCHÉ SUR LE VRAI BACKEND.
// Routes utilisées :
//   GET /api/admin/dashboard/journal
//   GET /api/admin/dashboard/a-traiter
//   GET /api/admin/agences-en-attente
//   GET /api/admin/finances/derniere-transaction

import Link from "next/link";
import { useEffect, useState } from "react";
import { Panel, Badge } from "@/components/ui";
import HistoriqueButton from "@/components/HistoriqueButton";
import { apiFetch } from "@/lib/api";

type Journal = {
  billetsVendus: string; nouveauxClients: string; litigesTraites: string;
  remboursements: string; revenuNet: string; genereLe: string | null;
};

type Tache = {
  id: string; reference: string; titre: string;
  sousTitre: string; delai: string; lien: string;
};

type AgenceEnAttente = {
  id: string; nom: string; ville: string; inscriteLe: string;
  statut: string; statutColor: "amber" | "red" | "green" | "grey";
};

type Transaction = {
  client: string; agence: string; paye: string; verse: string; marge: string;
};

const journalVide: Journal = {
  billetsVendus: "-", nouveauxClients: "-", litigesTraites: "-",
  remboursements: "-", revenuNet: "-", genereLe: null,
};

function ColonneTaches({
  titre, couleurFond, couleurTexte, taches, chargement,
}: {
  titre: string; couleurFond: string; couleurTexte: string;
  taches: Tache[]; chargement: boolean;
}) {
  return (
    <div className="bg-paper border border-line rounded-2xl shadow-card overflow-hidden">
      <div className={`px-4 py-3 ${couleurFond} ${couleurTexte} flex justify-between items-center font-bold text-xs uppercase`}>
        {titre} <span className="font-mono bg-black/5 rounded-full px-2 py-0.5">{taches.length}</span>
      </div>
      {taches.map((t) => (
        <Link key={t.id} href={t.lien} className="block px-4 py-3.5 border-t border-dashed border-line hover:bg-green-500/5">
          <div className="flex justify-between text-[11px] text-ink-soft font-mono"><span>{t.reference}</span><span>{t.delai}</span></div>
          <div className="text-[13.5px] font-semibold mt-0.5">{t.titre}</div>
          <div className="text-xs text-ink-soft">{t.sousTitre}</div>
        </Link>
      ))}
      {!chargement && taches.length === 0 && (
        <div className="px-4 py-6 text-center text-ink-soft text-[12.5px] border-t border-dashed border-line">Rien à traiter</div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [journal, setJournal] = useState<Journal>(journalVide);
  const [urgent, setUrgent] = useState<Tache[]>([]);
  const [important, setImportant] = useState<Tache[]>([]);
  const [enAttente, setEnAttente] = useState<Tache[]>([]);
  const [agences, setAgences] = useState<AgenceEnAttente[]>([]);
  const [derniereTransaction, setDerniereTransaction] = useState<Transaction | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    async function charger() {
      try {
        const j = await apiFetch("/api/admin/dashboard/journal");
        if (!annule) setJournal(j);

        const t = await apiFetch("/api/admin/dashboard/a-traiter");
        if (!annule) {
          setUrgent(t.urgent || []);
          setImportant(t.important || []);
          setEnAttente(t.enAttente || []);
        }

        const a = await apiFetch("/api/admin/agences-en-attente");
        if (!annule) {
          const liste: AgenceEnAttente[] = (a.agences || []).map((ag: { id: string; nom: string; ville: string; cree_le: string }) => ({
            id: ag.id,
            nom: ag.nom,
            ville: ag.ville,
            inscriteLe: new Date(ag.cree_le).toLocaleDateString("fr-FR"),
            statut: "En attente",
            statutColor: "amber" as const,
          }));
          setAgences(liste);
        }

        const tr = await apiFetch("/api/admin/finances/derniere-transaction");
        if (!annule) setDerniereTransaction(tr.transaction || null);

        if (!annule) setErreur(null);
      } catch (e) {
        if (!annule) setErreur(e instanceof Error ? e.message : "Impossible de charger le tableau de bord.");
      } finally {
        if (!annule) setChargement(false);
      }
    }
    charger();
    return () => { annule = true; };
  }, []);

  const aujourdhui = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Tableau de bord</h1>
          <div className="text-ink-soft text-[13px] mt-0.5 first-letter:uppercase">{aujourdhui}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] font-semibold text-green-700 bg-ok-bg border border-green-300 px-2.5 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Session Super Admin - connexion loggée
          </div>
          <HistoriqueButton entrees={[]} />
        </div>
      </div>

      {erreur && <p className="mb-4 text-[13px] text-red font-medium">{erreur}</p>}

      <div className="bg-paper border border-line rounded-2xl shadow-card mb-6 overflow-hidden">
        <div className="flex justify-between items-center px-[22px] pt-4 pb-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-soft">Journal de bord</div>
            <div className="font-display font-semibold text-[15px]">Aujourd'hui, en direct</div>
          </div>
          <div className="text-[11px] text-ink-soft">{journal.genereLe ?? "-"}</div>
        </div>
        <div className="ticket-cut mx-[22px]" />
        <div className="grid grid-cols-5">
          {[
            [journal.billetsVendus, "Billets vendus"],
            [journal.nouveauxClients, "Nouveaux clients"],
            [journal.litigesTraites, "Litiges traités"],
            [journal.remboursements, "Remboursements"],
            [journal.revenuNet, "Revenu net JEGO"],
          ].map(([num, lbl], i) => (
            <div key={lbl} className={`px-[22px] py-4 ${i > 0 ? "border-l border-dashed border-line" : ""}`}>
              <div className={`font-display font-bold ${lbl === "Revenu net JEGO" ? "font-mono text-[19px]" : "text-[26px]"}`}>
                {num}
              </div>
              <div className="text-[11.5px] text-ink-soft mt-1">{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="font-display text-[13.5px] font-semibold uppercase tracking-wide text-ink-soft mt-6 mb-3">
        À traiter aujourd'hui
      </div>
      <div className="grid grid-cols-3 gap-4">
        <ColonneTaches titre="🔴 Urgent" couleurFond="bg-red-bg" couleurTexte="text-red" taches={urgent} chargement={chargement} />
        <ColonneTaches titre="🟡 Important" couleurFond="bg-amber-bg" couleurTexte="text-amber" taches={important} chargement={chargement} />
        <ColonneTaches titre="🟢 En attente" couleurFond="bg-ok-bg" couleurTexte="text-green-700" taches={enAttente} chargement={chargement} />
      </div>

      <div className="grid grid-cols-[1.3fr_1fr] gap-4 mt-6">
        <Panel title="Agences en attente de validation" action={<Link href="/agences" className="text-xs font-semibold text-green-700">Voir tout →</Link>}>
          <table className="w-full">
            <thead>
              <tr className="text-left">
                {["Agence", "Ville", "Inscrite le", "Statut"].map((h) => (
                  <th key={h} className="text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agences.map((a) => (
                <tr key={a.id} className="border-t border-line">
                  <td className="px-[18px] py-2.5 text-[13px]"><b>{a.nom}</b></td>
                  <td className="px-[18px] py-2.5 text-[13px]">{a.ville}</td>
                  <td className="px-[18px] py-2.5 text-[13px] font-mono">{a.inscriteLe}</td>
                  <td className="px-[18px] py-2.5"><Badge color={a.statutColor}>{a.statut}</Badge></td>
                </tr>
              ))}
              {!chargement && agences.length === 0 && (
                <tr><td colSpan={4} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Aucune agence en attente</td></tr>
              )}
            </tbody>
          </table>
        </Panel>

        <Panel title="Dernière transaction" action={<Link href="/finances" className="text-xs font-semibold text-green-700">Voir tout →</Link>}>
          <div className="px-[18px] py-4">
            {derniereTransaction ? (
              <>
                <div className="kv"><span>Client</span><span className="font-semibold">{derniereTransaction.client}</span></div>
                <div className="kv"><span>Agence</span><span className="font-semibold">{derniereTransaction.agence}</span></div>
                <div className="kv"><span>Payé</span><span className="font-mono font-semibold">{derniereTransaction.paye}</span></div>
                <div className="kv"><span>Versé agence</span><span className="font-mono font-semibold">{derniereTransaction.verse}</span></div>
                <div className="kv"><span>Marge JEGO</span><span className="font-mono font-semibold">{derniereTransaction.marge}</span></div>
              </>
            ) : (
              <div className="text-center text-ink-soft text-[12.5px] py-4">Aucune transaction enregistrée</div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
