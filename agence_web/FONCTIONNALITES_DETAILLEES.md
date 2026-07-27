# JEGO - Espace agence - Fonctionnalites detaillees

Ce document explique les fonctionnalites visibles dans la maquette afin que toute personne qui recupere le projet comprenne rapidement le perimetre fonctionnel.

## 1) Structure generale
- **Accueil** : vue synthese de l'activite de l'agence.
- **Trajets** : programmation, declaration de retard, arret d'un trajet, duplication d'un trajet.
- **Flotte** : liste des bus, creation / modification et modelisation du plan de sieges.
- **Chauffeurs** : gestion des chauffeurs.
- **Reservations** : reservations par trajet avec detail des clients et des options supplementaires.
- **Paiements** : suivi des paiements.
- **Statistiques** : indicateurs et rapports PDF demo.
- **Incidents** : incidents regroupes par numero de voyage, avec details depliables.
- **Litiges** : litiges du jour J et historiques dedies.
- **Discussion** : echanges simulant la messagerie agence / JEGO.
- **Profil agence** : modification centralisee des informations de l'agence.

## 2) Navigation / interface
- Sidebar compacte contenant **toutes les pages sans scroll**.
- Mode **replie / deplié** avec changement reel de presentation.
- Profil agence visible correctement en mode replie et en mode deplié.
- Selecteur de langue accessible en haut a droite de l'accueil.
- Police generale volontairement reduite pour un rendu plus compact.

## 3) Date et calendrier
- Calendrier **reellement cliquable**.
- Fleches pour naviguer sur les dates.
- Les pages utilisant les dates sont alignees sur la date selectionnee.

## 4) Trajets
- Visualisation des trajets du jour selectionne.
- Ajout d'un nouveau trajet.
- Duplication d'un trajet existant.
- Declaration d'un retard par **le chauffeur** ou par **l'agence**.
- Le retard n'est plus affiche en temps reel : il apparait sous forme lisible, par exemple :
  - retard de 30 minutes
  - retard de 60 minutes
  - retard de 1h30
- Recherche globale qui parcourt **tous les trajets sur toutes les dates**.

## 5) Flotte / creation de bus
- Creation et edition d'un bus.
- Le plan des sieges est affiche **directement a droite** de la configuration.
- Correction des debordements visuels des boutons.
- Modes de marquage disponibles :
  - Toilettes
  - Abime
  - Espace porte
  - Premium
- Si le type de bus est **Standard**, la selection **Premium** est automatiquement bloquee.
- Si le type de bus est **VIP**, le bus est considere premium globalement.
- Si le type de bus est **Mixte**, les sieges premium peuvent etre choisis manuellement.

## 6) Reservations
- Reservations affichees par trajet.
- Detail des passagers : nom, telephone, email, siege, statut, montant.
- Affichage explicite des **options supplementaires prises par le client**.
  - Exemple : bagage supplementaire, assurance bagage, choix du siege, siege premium, flex billet.
- Recherche globale qui parcourt **toutes les reservations sur toutes les dates**.

## 7) Incidents
- Incidents regroupes par **numero de voyage**.
- Affichage du compteur d'incidents par voyage.
- Details depliables pour chaque incident.
- Affichage de la date, de l'heure et du numero de voyage.
- Recherche globale qui parcourt **tous les incidents sur toutes les dates**.

## 8) Litiges
- Bloc principal : **Litiges du jour J**.
  - Affiche uniquement les litiges ouverts ou resolus a la date selectionnee.
- Historiques en haut de page :
  - **Litiges non resolus** : tries par anciennete.
  - **Litiges qui viennent d'etre resolus** : tries du plus recent au plus ancien.
- Les historiques ne s'affichent **pas par defaut** : ils s'ouvrent uniquement lorsqu'on clique sur leur espace dedie.
- Affichage de la date, de l'heure et du numero de voyage dans les dossiers.
- Contestation autorisee **une seule fois** et uniquement pour une **decision defavorable**.
- Lors d'une contestation, le **message** et les **documents** sont facultatifs.
- Recherche globale qui parcourt **tous les litiges sur toutes les dates**.

## 9) Profil agence
- Acces protege par code.
- Une fois dans l'espace, toutes les informations se modifient **dans un seul formulaire**.
- Pour valider les changements, il suffit d'ecrire **"modifier"**.
- Fermeture / reouverture possible de l'espace protege.

## 10) Rapports / statistiques
- Les rapports PDF sont des rapports de demonstration plus detailles.
- Regles de periode prevues :
  - Hebdomadaire = semaine precedente uniquement
  - Mensuel = mois precedent uniquement
  - Annuel = annee precedente uniquement

## 11) Nature du projet
- Il s'agit d'une **facade fonctionnelle / maquette avancee**.
- Plusieurs interactions sont simulees localement en front-end.
- Certaines mentions "TODO backend" ou messages de facade indiquent ce qui devra etre branche a une API reelle.

## 12) Lancement du projet
```powershell
npm install
npm run dev
```
Puis ouvrir :
```text
http://localhost:3000/accueil
```
