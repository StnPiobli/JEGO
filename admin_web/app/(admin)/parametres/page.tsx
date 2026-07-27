// ⚠️ DEMO — champs correspondant à la table parametres_systeme (valeurs clé/valeur globales).
import { Topbar, Panel, BtnMini } from "@/components/ui";

function EditableRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t border-line first:border-t-0">
      <td className="px-[18px] py-2.5 text-[13px]">{label}</td>
      <td className="px-[18px] py-2.5">
        <input defaultValue={value} className="w-[110px] px-1.5 py-1 border border-line rounded-md font-mono text-xs" />
      </td>
    </tr>
  );
}

export default function ParametresPage() {
  return (
    <div>
      <Topbar title="Paramètres système" subtitle="Table parametres_systeme — valeurs clé/valeur globales" />

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Réservation & trajet">
          <table className="w-full">
            <tbody>
              <EditableRow label="Durée du soft lock siège" value="5 min" />
              <EditableRow label="Délai de réponse agence à un litige" value="48h" />
              <EditableRow label="Seuil déclaration d'arrivée trop précoce" value="20 min" />
              <EditableRow label="Programmation — avance maximum" value="1 mois" />
              <EditableRow label="Programmation — minimum requis" value="2 semaines" />
            </tbody>
          </table>
          <div className="px-[18px] py-3"><BtnMini variant="primary">Enregistrer</BtnMini></div>
        </Panel>

        <Panel title="Points JEGO, support & affichage">
          <table className="w-full">
            <tbody>
              <EditableRow label="Barème points JEGO — palier 1" value="500 pts" />
              <EditableRow label="Barème points JEGO — palier 2" value="1000 pts" />
              <EditableRow label="Numéro de téléphone support" value="+237 6XX XXX XXX" />
              <EditableRow label="Délai de remboursement affiché au client" value="3 à 5 jours" />
            </tbody>
          </table>
          <div className="px-[18px] py-3"><BtnMini variant="primary">Enregistrer</BtnMini></div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <Panel title="Barème de remboursement">
          <table className="w-full">
            <tbody>
              <EditableRow label="Annulation par l'agence" value="100%" />
              <EditableRow label="Retard supérieur à 2h" value="30%" />
              <EditableRow label="Client absent au départ" value="0%" />
            </tbody>
          </table>
          <div className="px-[18px] py-3"><BtnMini variant="primary">Enregistrer</BtnMini></div>
        </Panel>

        <Panel title="Seuils de signalement collectif">
          <table className="w-full">
            <tbody>
              <tr className="border-t border-line first:border-t-0">
                <td className="px-[18px] py-2.5 text-[13px]">≤ 20 passagers</td>
                <td className="px-[18px] py-2.5 text-[13px]">3 signalements</td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]">21 à 40 passagers</td>
                <td className="px-[18px] py-2.5 text-[13px]">4 signalements</td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]">Plus de 40 passagers</td>
                <td className="px-[18px] py-2.5 text-[13px]">5 signalements</td>
              </tr>
            </tbody>
          </table>
          <div className="px-[18px] py-[15px] border-t border-line">
            <h3 className="font-display text-[14.5px] m-0 mb-3">Contenus légaux & page publique</h3>
            <BtnMini>Modifier les CGU</BtnMini>
            <BtnMini>Gérer la FAQ</BtnMini>
            <BtnMini>Piloter jego.cm/statut</BtnMini>
          </div>
        </Panel>
      </div>
    </div>
  );
}
