// ⛔ NON SPÉCIFIÉ — voir LockedPage.
import { Topbar, LockedPage } from "@/components/ui";

export default function IncidentsPage() {
  return (
    <div>
      <Topbar title="Incidents & accidents" subtitle="Cas extrêmes — distinct des litiges niveau 3" />
      <LockedPage title="Écran non spécifié">
        <p>
          La section 17 du v4.0 (&quot;Gestion des incidents et accidents&quot;) existe dans le
          sommaire mais son contenu ne m&apos;est pas encore ressorti des documents — possible
          qu&apos;elle renvoie simplement à la procédure du Litige Niveau 3 (suspension immédiate
          de l&apos;agence + transmission aux autorités + &quot;JEGO n&apos;est pas assureur&quot;),
          possible aussi qu&apos;elle prévoie un vrai flux séparé avec preuves, contacts
          d&apos;urgence, suivi post-incident. Cette page reste un espace réservé tant que ce
          n&apos;est pas tranché — je ne veux pas inventer une procédure sur un accident réel.
        </p>
      </LockedPage>
    </div>
  );
}
