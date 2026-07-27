// ⛔ NON SPÉCIFIÉ — voir LockedPage. Ne pas construire de logique tant que
// les décisions ci-dessous n'ont pas été tranchées avec Stéphane.
import { Topbar, LockedPage } from "@/components/ui";

export default function RgpdPage() {
  return (
    <div>
      <Topbar title="Demandes RGPD" subtitle="Suppression de compte · export de données · anonymisation manuelle" />
      <LockedPage title="Écran non spécifié — pas seulement une maquette manquante">
        <p className="mb-3">
          Le v4.0 liste 5 permissions dédiées (traiter_demande_suppression_compte,
          traiter_demande_export_donnees_client, lancer_anonymisation_manuelle,
          voir_politique_conservation_donnees, voir_rapport_donnees_supprimees) et un tableau de
          durées de conservation par type de donnée — mais aucun écran, aucun flux, aucun champ
          n&apos;est décrit nulle part dans le cahier des charges ni dans le document frontend.
          Avant de dessiner quoi que ce soit ici, il faut répondre à :
        </p>
        <ul className="list-disc pl-5 space-y-2 max-w-xl">
          <li>Comment une demande arrive-t-elle dans cette file — le client la fait depuis son profil, ou par email au support ?</li>
          <li>L&apos;anonymisation manuelle est-elle un bouton par client, ou un job qu&apos;on déclenche globalement ?</li>
          <li>L&apos;export de données : quel format, généré à la demande ou pré-généré chaque nuit comme le prévoit déjà l&apos;espace voyageur ?</li>
        </ul>
      </LockedPage>
    </div>
  );
}
