# JEGO — Mise à jour du 8 août 2026

Ce document explique quoi installer, dans quel ordre, et ce qui a changé.

---

## 1. Ce qu'il faut faire EN PREMIER (obligatoire)

Le dépôt contenait un schéma de base désynchronisé du code : plusieurs
tables et colonnes utilisées par les contrôleurs n'existaient nulle
part dans les fichiers SQL committés. Concrètement, `payer()` échouait
à chaque appel, et aucune agence ne pouvait être validée faute de rôles
et de permissions en base.

Les quatre fichiers ci-dessous corrigent cela. Ils sont **idempotents**
(relançables sans risque de doublon).

```powershell
cd C:\Users\steph\JEGO\database

psql -U postgres -d jego -f migration_2026-08-08_consolidation.sql
psql -U postgres -d jego -f migration_2026-08-08_denonciations.sql
psql -U postgres -d jego -f migration_2026-08-08_arrets.sql
psql -U postgres -d jego -f seed_admin.sql
```

> `seed_admin.sql` crée le compte Super Admin `admin@jego.cm`
> (mot de passe `ChangeMoi123!`) ainsi que les rôles, permissions et la
> grille de commission par défaut.
> **Changez ce mot de passe dès votre première connexion.**

---

## 2. Backend

```powershell
cd C:\Users\steph\JEGO\backend
npm install
npm start
```

`pdfkit` a été ajouté aux dépendances (export PDF des rapports).

Vérifiez que votre `.env` contient bien :

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jego
DB_USER=postgres
DB_PASSWORD=<votre mot de passe>
JWT_SECRET=<votre secret>
QR_SECRET=<votre secret QR>
RESEND_API_KEY=<votre clé Resend>
```

> `QR_SECRET` ne doit jamais changer une fois des billets émis : les QR
> déjà distribués deviendraient invérifiables.

### Lancer les tests

Serveur démarré dans une fenêtre, puis dans une autre :

```powershell
cd C:\Users\steph\JEGO\backend
node tests\test_flux_complet.js
node tests\test_nouvelles_fonctions.js
node tests\test_arrets.js
node tests\test_retard.js
node tests\test_portail_agence.js
```

Résultat attendu : **147 tests, 0 échec.**

---

## 3. Portails web (agence et administration)

Les deux portails pointaient sur le port **5000** alors que le backend
écoute sur le **3000**, et aucun fichier d'environnement n'existait :
ni l'un ni l'autre ne pouvait se connecter. C'est corrigé, et un
`.env.local` est fourni dans chaque dossier.

```powershell
cd C:\Users\steph\JEGO\admin_web
npm install
npm run dev
```

```powershell
cd C:\Users\steph\JEGO\agence_web
npm install
npm run dev
```

Si votre backend tourne sur un autre port, modifiez `NEXT_PUBLIC_API_URL`
dans le `.env.local` de chaque portail.

### Sécurité des dépendances

`admin_web` tournait sur `next@14.2.5`, qui cumulait plusieurs failles
dont un **contournement d'autorisation** et un **empoisonnement de
cache** — sérieux pour un portail qui valide des agences et pilote des
flux financiers. Le portail est passé en Next 16 / React 19, aligné sur
`agence_web`. Les sous-dépendances vulnérables (`postcss`, `sharp`,
`nanoid`) sont contraintes par `overrides` dans les deux `package.json`.

Les deux portails affichent désormais **0 vulnérabilité** à
`npm audit`, et compilent sans erreur (`tsc --noEmit`).

---

## 4. Application mobile

```powershell
cd C:\Users\steph\JEGO\jego_mobile
flutter pub get
flutter run
```

### Adresse du serveur

Elle est choisie automatiquement selon la plateforme
(`lib/config/api_service.dart`) :

| Plateforme            | Adresse utilisée      |
|-----------------------|-----------------------|
| Émulateur Android     | `http://10.0.2.2:3000` |
| Navigateur / bureau   | `http://localhost:3000` |

Pour un téléphone physique sur le même réseau Wi-Fi, renseignez
l'adresse IP de votre PC dans `baseUrlProduction` :

```dart
static const String baseUrlProduction = 'http://192.168.1.42:3000';
```

### Connexion

L'application se connecte **par numéro de téléphone**, pas par email —
c'est ce qu'attend le backend, pour le voyageur comme pour le chauffeur.
L'écran de connexion essaie d'abord le compte voyageur, puis le compte
chauffeur, et bascule automatiquement vers l'espace chauffeur si les
identifiants correspondent à un chauffeur.

---

## 5. Ce qui a changé

### Bugs corrigés

**Remboursement de retard (bloquant).** Dans `services/retardService.js`,
la notification de remboursement était écrite **hors de la boucle** des
passagers et référençait des variables inexistantes. Toute déclaration
d'arrivée d'un trajet en retard de 2 h ou plus échouait, et aucun
passager n'était remboursé. Le bug était masqué tant que la colonne
`heure_arrivee_initiale` n'existait pas en base. Un test dédié
(`tests/test_retard.js`) verrouille désormais ce comportement.

**QR code non scannable (bloquant).** L'application affichait au
voyageur un motif aléatoire dessiné à la main, pas un vrai QR : le
chauffeur n'aurait jamais pu scanner un billet. Le rendu utilise
maintenant `qr_flutter`, qui encode réellement la chaîne signée par le
serveur.

**Schéma désynchronisé.** Voir section 1.

**Portails injoignables (bloquant).** `agence_web` et `admin_web`
appelaient `http://localhost:5000` alors que le backend écoute sur
`3000`. Aucune page ne pouvait charger de données.

**Serveur bloqué sans clé email (bloquant).** L'absence de
`RESEND_API_KEY` faisait planter tout le backend au démarrage. Le
serveur démarre maintenant avec un avertissement, et les notifications
restent enregistrées en base même sans envoi d'email.

**Capacité des bus toujours à zéro.** Le code comptait les sièges au
statut `actif` alors qu'ils sont enregistrés comme `disponible`. Le
taux de remplissage et la capacité affichée au chauffeur étaient donc
faux.

### Ajouts backend

- **Mot de passe chauffeur en libre-service.** Le chauffeur est seul à
  pouvoir le changer, en fournissant son mot de passe actuel. L'agence
  peut uniquement déclencher l'envoi d'un mot de passe provisoire, sans
  jamais le voir.
- **Annulation d'un billet guichet par l'agence**, remboursement en
  espèces, avec garde-fous : billet physique uniquement, avant le
  départ, avant tout scan.
- **Espace dénonciation voyageur**, distinct du signalement collectif :
  dossier individuel ouvert après le voyage, agence et administration
  notifiées simultanément, agence en mode observation (elle se défend
  mais ne peut pas clore), décision réservée à l'administration.
- **Arrivées par arrêt intermédiaire.** Un passager qui descend à un
  arrêt voit son billet clos à cet arrêt, pas au terminus. Le retard est
  calculé sur le tronçon concerné.
- **Export PDF des rapports** (agence et global), mise en page JEGO.
  Les chiffres proviennent d'une fonction de calcul unique partagée avec
  la sortie JSON, pour que les deux formats ne puissent pas diverger.

### Application mobile

L'application ne contient plus **aucune donnée fictive**. Les fichiers
`donnees_demo.dart`, `donnees_demo_chauffeur.dart` et
`comptes_chauffeurs.dart` ont été supprimés.

Écrans branchés sur le serveur : recherche, connexion, inscription,
sélection de siège (plan réel du bus), paiement, billets, fiche agence
et ses avis, scan de billet, espace chauffeur.

**Paiement.** Une clé d'idempotence est générée une seule fois par
tentative et réutilisée en cas de nouvel essai : un double appui ou une
reprise réseau ne peut pas débiter deux fois.

**Scan hors ligne.** Si le serveur est injoignable, le QR est contrôlé
localement sur sa structure, le passager peut monter, et le scan part
en file d'attente pour être synchronisé au retour du réseau. La
vérification cryptographique complète a lieu à ce moment-là — la clé
secrète ne quitte jamais le serveur, sans quoi n'importe qui pourrait
fabriquer des billets valides.

### Ce qui n'est volontairement pas simulé

Ces fonctions n'existent pas côté serveur, elles ne prétendent donc pas
fonctionner :

- **Express Union** — retiré des opérateurs proposés (seuls MTN MoMo et
  Orange Money sont acceptés par le backend).
- **Connexion Google / Facebook / Apple** — affiche un message
  indiquant que la fonction arrive, au lieu d'ouvrir une session
  inexistante.

---

## 6. Points restant à traiter

- Écrans de réglages sans équivalent serveur (adresses, moyens de
  paiement, sécurité, confidentialité) : l'interface existe, le stockage
  côté serveur reste à créer. Ils indiquent clairement que le réglage
  n'est pas actif — aucun ne prétend fonctionner.
- Refonte visuelle de l'accueil mobile (hors périmètre : vous aviez
  retenu « brancher seulement, garder le design actuel »).
- Suivi GPS temps réel, chat agence, notifications météo : aucune
  infrastructure côté serveur, ce sont des chantiers à part entière.

---

## 7. Réserve honnête sur la vérification

Le **backend a été exécuté et testé** contre une vraie base PostgreSQL :
147 tests passent, migrations appliquées sans erreur, PDF générés et
inspectés visuellement.

Les **deux portails web ont été compilés** : `tsc --noEmit` ne remonte
aucune erreur, et `npm audit` ne signale plus aucune vulnérabilité. Le
`next build` complet n'a pas pu aboutir ici pour une seule raison :
l'environnement de compilation n'a pas accès à Google Fonts, et les
polices sont téléchargées au build. Chez vous, avec une connexion
normale, il passera.

Le **code Flutter n'a pas pu être compilé** dans l'environnement où ces
modifications ont été produites : le SDK Flutter n'y est pas disponible,
donc ni `flutter analyze` ni `flutter run` n'ont pu être lancés. La
cohérence structurelle des 70 fichiers Dart a été vérifiée
automatiquement, et chaque appel réseau a été écrit à partir des routes
réellement exposées par le backend et testées.

Lancez `flutter analyze` avant `flutter run` : s'il reste des
avertissements d'imports ou de types, ils apparaîtront là.
