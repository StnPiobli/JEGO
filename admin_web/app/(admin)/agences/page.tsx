// ⚠️ DEMO — remplacer par les vraies données d'inscription/validation d'agence.
"use client";
import { useState } from "react";
import { Topbar, Panel, Badge, BtnMini } from "@/components/ui";

const tabs = ["En attente de validation (2)", "Toutes les agences (32)", "Suspendues (1)"];

export default function AgencesPage() {
  const [tab, setTab] = useState(0);
  return (
    <div>
      <Topbar title="Agences" subtitle="32 agences actives · 2 en attente · 1 suspendue" />
      <div className="flex gap-0 border-b border-line mb-4">
        {tabs.map((t, i) => (
          <div
            key={t}
            onClick={() => setTab(i)}
            className={`pb-2.5 mr-5 text-[13px] font-semibold cursor-pointer border-b-2 ${
              tab === i ? "text-green-700 border-green-700" : "text-ink-soft border-transparent"
            }`}
          >
            {t}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Panel title="Dossiers en attente">
          <table className="w-full">
            <tbody>
              <tr className="border-t border-line first:border-t-0 hover:bg-green-500/5 cursor-pointer">
                <td className="px-[18px] py-3 text-[13px]">
                  <b>Voyages Étoile du Sud</b>
                  <br />
                  <span className="text-ink-soft text-[11.5px]">Bafoussam · inscrite le 12 jan. 2026</span>
                </td>
                <td className="px-[18px] py-3"><Badge color="amber">Dossier complet</Badge></td>
              </tr>
              <tr className="border-t border-line hover:bg-green-500/5 cursor-pointer">
                <td className="px-[18px] py-3 text-[13px]">
                  <b>Rapid&apos;Bus Cameroun</b>
                  <br />
                  <span className="text-ink-soft text-[11.5px]">Bamenda · inscrite le 14 jan. 2026</span>
                </td>
                <td className="px-[18px] py-3"><Badge color="red">Pièces manquantes</Badge></td>
              </tr>
            </tbody>
          </table>
        </Panel>

        <Panel title="Dossier — Voyages Étoile du Sud">
          <div className="px-[18px] py-4">
            <div className="kv"><span>Représentant légal</span><span className="font-semibold">Marc Ateba</span></div>
            <div className="kv"><span>RCCM</span><span className="font-mono font-semibold">RC/BAF/2024/B/0451</span></div>
            <div className="kv"><span>Flotte déclarée</span><span className="font-semibold">7 bus</span></div>
            <div className="kv"><span>Lignes prévues</span><span className="font-semibold">Bafoussam ↔ Douala, Yaoundé</span></div>

            <div className="font-display text-[13.5px] font-semibold uppercase tracking-wide text-ink-soft mt-4 mb-2">
              Documents soumis
            </div>
            <div className="border border-line rounded-lg px-3.5 py-3 flex justify-between items-center mb-2 text-[12.5px]">
              📄 Registre de commerce <Badge color="green">Vérifié</Badge>
            </div>
            <div className="border border-line rounded-lg px-3.5 py-3 flex justify-between items-center mb-2 text-[12.5px]">
              📄 Assurance flotte <Badge color="green">Vérifié</Badge>
            </div>
            <div className="border border-line rounded-lg px-3.5 py-3 flex justify-between items-center mb-2 text-[12.5px]">
              📄 Autorisation de transport <Badge color="amber">À vérifier</Badge>
            </div>

            <div className="mt-4">
              <BtnMini variant="primary">✅ Valider l&apos;agence</BtnMini>
              <BtnMini>Demander un complément</BtnMini>
              <BtnMini variant="danger">Refuser</BtnMini>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
