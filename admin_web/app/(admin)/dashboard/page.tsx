// ⚠️ DONNÉES DE DEMO — à remplacer par des appels API réels (journal de bord,
// tableau priorisé, agences en attente, dernière transaction).

import Link from "next/link";
import { Panel, Badge } from "@/components/ui";

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Tableau de bord</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Mercredi 15 janvier 2026</div>
        </div>
        <div className="text-[11px] font-semibold text-green-700 bg-ok-bg border border-green-300 px-2.5 py-1.5 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Session Super Admin — connexion loggée · IP 41.202.xx.xx
        </div>
      </div>

      {/* Journal de bord */}
      <div className="bg-paper border border-line rounded-2xl shadow-card mb-6 overflow-hidden">
        <div className="flex justify-between items-center px-[22px] pt-4 pb-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-soft">Journal de bord</div>
            <div className="font-display font-semibold text-[15px]">Généré automatiquement à 00h00</div>
          </div>
          <div className="text-[11px] text-ink-soft">Actualisé il y a 6 min</div>
        </div>
        <div className="ticket-cut mx-[22px]" />
        <div className="grid grid-cols-5">
          {[
            ["127", "Billets vendus"],
            ["34", "Nouveaux clients"],
            ["8", "Litiges traités"],
            ["3", "Remboursements"],
            ["312 450 F", "Revenu net JEGO"],
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
        À traiter aujourd&apos;hui
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-paper border border-line rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-3 bg-red-bg text-red flex justify-between items-center font-bold text-xs uppercase">
            🔴 Urgent <span className="font-mono bg-black/5 rounded-full px-2 py-0.5">3</span>
          </div>
          <Link href="/litiges" className="block px-4 py-3.5 border-t border-dashed border-line hover:bg-green-500/5">
            <div className="flex justify-between text-[11px] text-ink-soft font-mono"><span>#JG-L-0072</span><span>+26h</span></div>
            <div className="text-[13.5px] font-semibold mt-0.5">Litige conduite dangereuse</div>
            <div className="text-xs text-ink-soft">Touristique Express · Douala → Yaoundé</div>
          </Link>
          <Link href="/finances" className="block px-4 py-3.5 border-t border-dashed border-line hover:bg-green-500/5">
            <div className="flex justify-between text-[11px] text-ink-soft font-mono"><span>#JG-R-1188</span><span>+51h</span></div>
            <div className="text-[13.5px] font-semibold mt-0.5">Remboursement en attente</div>
            <div className="text-xs text-ink-soft">Client Jean D. · 4 280 FCFA</div>
          </Link>
          <Link href="/securite" className="block px-4 py-3.5 border-t border-dashed border-line hover:bg-green-500/5">
            <div className="flex justify-between text-[11px] text-ink-soft font-mono"><span>#SEC-0009</span><span>il y a 40 min</span></div>
            <div className="text-[13.5px] font-semibold mt-0.5">Connexion suspecte détectée</div>
            <div className="text-xs text-ink-soft">Compte agence · Nuit Express</div>
          </Link>
        </div>

        <div className="bg-paper border border-line rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-3 bg-amber-bg text-amber flex justify-between items-center font-bold text-xs uppercase">
            🟡 Important <span className="font-mono bg-black/5 rounded-full px-2 py-0.5">2</span>
          </div>
          <Link href="/agences" className="block px-4 py-3.5 border-t border-dashed border-line hover:bg-green-500/5">
            <div className="flex justify-between text-[11px] text-ink-soft font-mono"><span>#AG-0031</span><span>cette semaine</span></div>
            <div className="text-[13.5px] font-semibold mt-0.5">Nouvelle agence à valider</div>
            <div className="text-xs text-ink-soft">Voyages Étoile du Sud — Bafoussam</div>
          </Link>
          <Link href="/agences" className="block px-4 py-3.5 border-t border-dashed border-line hover:bg-green-500/5">
            <div className="flex justify-between text-[11px] text-ink-soft font-mono"><span>#AG-0028</span><span>cette semaine</span></div>
            <div className="text-[13.5px] font-semibold mt-0.5">3 demandes modification agence</div>
            <div className="text-xs text-ink-soft">Changement de coordonnées bancaires</div>
          </Link>
        </div>

        <div className="bg-paper border border-line rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-3 bg-ok-bg text-green-700 flex justify-between items-center font-bold text-xs uppercase">
            🟢 En attente <span className="font-mono bg-black/5 rounded-full px-2 py-0.5">2</span>
          </div>
          <Link href="/rapports" className="block px-4 py-3.5 border-t border-dashed border-line hover:bg-green-500/5">
            <div className="text-[11px] text-ink-soft font-mono">#RP-0106</div>
            <div className="text-[13.5px] font-semibold mt-0.5">Rapport mensuel disponible</div>
            <div className="text-xs text-ink-soft">Décembre 2025 — toutes agences</div>
          </Link>
          <Link href="/agences" className="block px-4 py-3.5 border-t border-dashed border-line hover:bg-green-500/5">
            <div className="text-[11px] text-ink-soft font-mono">#AG-0028</div>
            <div className="text-[13.5px] font-semibold mt-0.5">Pièces manquantes — Rapid&apos;Bus</div>
            <div className="text-xs text-ink-soft">Relance envoyée il y a 2 jours</div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-[1.3fr_1fr] gap-4 mt-6">
        <Panel title="Agences en attente de validation" action={<Link href="/agences" className="text-xs font-semibold text-green-700">Voir tout →</Link>}>
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">Agence</th>
                <th className="text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">Ville</th>
                <th className="text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">Inscrite le</th>
                <th className="text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]"><b>Voyages Étoile du Sud</b></td>
                <td className="px-[18px] py-2.5 text-[13px]">Bafoussam</td>
                <td className="px-[18px] py-2.5 text-[13px] font-mono">12 jan.</td>
                <td className="px-[18px] py-2.5"><Badge color="amber">Dossier complet</Badge></td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]"><b>Rapid&apos;Bus Cameroun</b></td>
                <td className="px-[18px] py-2.5 text-[13px]">Bamenda</td>
                <td className="px-[18px] py-2.5 text-[13px] font-mono">14 jan.</td>
                <td className="px-[18px] py-2.5"><Badge color="red">Pièces manquantes</Badge></td>
              </tr>
            </tbody>
          </table>
        </Panel>

        <Panel title="Dernière transaction" action={<Link href="/finances" className="text-xs font-semibold text-green-700">Voir tout →</Link>}>
          <div className="px-[18px] py-4">
            <div className="kv"><span>Client</span><span className="font-semibold">Jean Dupont</span></div>
            <div className="kv"><span>Agence</span><span className="font-semibold">Touristique Express</span></div>
            <div className="kv"><span>Payé</span><span className="font-mono font-semibold">4 280 F</span></div>
            <div className="kv"><span>Versé agence</span><span className="font-mono font-semibold">4 000 F</span></div>
            <div className="kv"><span>Marge JEGO</span><span className="font-mono font-semibold">237 F</span></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
