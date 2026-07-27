// ⚠️ DEMO — file de modération factice. En vrai : filtre automatique de mots interdits
// + signalements manuels (par utilisateur ou par agence).
import { Topbar, Panel, Badge, BtnMini } from "@/components/ui";

const commentaires = [
  {
    texte: "« Chauffeur imb*** roulait comme un fou, plus jamais cette agence »",
    auteur: "Franck M.",
    agence: "Nuit Express",
    motif: "Filtre automatique",
    color: "red" as const,
    primaryDanger: true,
  },
  {
    texte: "« Bus toujours en retard, agence à éviter »",
    auteur: "Aïcha B.",
    agence: "Rapid'Bus Cameroun",
    motif: "Signalé par l'agence",
    color: "amber" as const,
    primaryDanger: false,
  },
  {
    texte: "« Numéro de téléphone du chauffeur : 6XX XXX XXX, contactez-le direct »",
    auteur: "Jean D.",
    agence: "Touristique Express",
    motif: "Filtre automatique — données perso",
    color: "red" as const,
    primaryDanger: true,
  },
  {
    texte: "« Service correct mais siège 12B cassé »",
    auteur: "Marc A.",
    agence: "Général Voyages",
    motif: "Signalé — faux positif probable",
    color: "grey" as const,
    primaryDanger: false,
  },
];

export default function ModerationPage() {
  return (
    <div>
      <Topbar title="Modération" subtitle="Commentaires signalés — automatiquement (filtre de mots interdits) ou manuellement" />
      <Panel>
        <table className="w-full">
          <thead>
            <tr>
              {["Commentaire", "Auteur", "Agence visée", "Motif", ""].map((h) => (
                <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {commentaires.map((c, i) => (
              <tr key={i} className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px] max-w-[280px]">{c.texte}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{c.auteur}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{c.agence}</td>
                <td className="px-[18px] py-2.5"><Badge color={c.color}>{c.motif}</Badge></td>
                <td className="px-[18px] py-2.5 whitespace-nowrap">
                  {c.primaryDanger ? (
                    <>
                      <BtnMini variant="danger-primary">Supprimer</BtnMini>
                      <BtnMini>Ignorer</BtnMini>
                    </>
                  ) : (
                    <>
                      <BtnMini variant="danger">Supprimer</BtnMini>
                      <BtnMini variant="primary">Conserver</BtnMini>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
