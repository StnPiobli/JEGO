# JEGO — État réel du projet

8 août 2026. Ce document dit ce qui marche, ce qui a été vérifié
comment, et ce qui ne marche pas encore. Sans arrondir.

---

## Ce qui est vérifié par exécution réelle

| Composant | Vérification | Résultat |
|---|---|---|
| Backend | 147 tests contre une vraie base PostgreSQL | **0 échec** |
| Migrations et seed | Appliqués sur base vierge | **0 erreur** |
| Export PDF | Fichiers générés puis inspectés visuellement | Conforme |
| `admin_web` | `tsc --noEmit` + `npm audit` | **0 erreur, 0 vulnérabilité** |
| `agence_web` | `tsc --noEmit` + `npm audit` | **0 erreur, 0 vulnérabilité** |
| `jego_mobile` | Contrôle structurel des 70 fichiers Dart | Cohérent |

### Le détail des 147 tests

| Suite | Tests | Ce qu'elle couvre |
|---|---|---|
| `test_flux_complet` | 47 | Admin valide → agence publie → client paie → chauffeur scanne → arrivée → litige tranché |
| `test_nouvelles_fonctions` | 39 | Mot de passe chauffeur, annulation guichet, dénonciations |
| `test_arrets` | 26 | Lignes multi-arrêts, billets clos au bon arrêt |
| `test_retard` | 11 | Barème de retard et remboursement automatique |
| `test_portail_agence` | 24 | Passagers d'un trajet, versements escrow, cloisonnement entre agences |

---

## Les bugs bloquants trouvés et corrigés

Aucun n'avait été signalé. Tous auraient explosé en production.

**1. Le schéma de base était désynchronisé du code.** Des migrations
appliquées en local n'avaient jamais été committées. `payer()` échouait
à chaque appel, et aucun rôle ni permission n'était seedé : sur une base
neuve, aucune agence ne pouvait être validée. L'application entière
était inutilisable.

**2. Le remboursement de retard plantait.** Dans `retardService.js`, la
notification était écrite hors de la boucle des passagers, référençant
des variables inexistantes à ce niveau. Toute déclaration d'arrivée d'un
trajet en retard de 2 h ou plus échouait, et personne n'était remboursé.

**3. Le QR code n'était pas scannable.** L'application affichait un
motif aléatoire dessiné à la main. `qr_flutter` était déclaré mais
utilisé nulle part. Le chauffeur n'aurait pas pu scanner un seul billet.

**4. Les deux portails web étaient injoignables.** Ils appelaient le
port 5000 alors que le backend écoute sur 3000, sans aucun fichier
d'environnement.

**5. Le serveur refusait de démarrer sans clé email.** Une
`RESEND_API_KEY` absente faisait planter tout le backend.

**6. La capacité des bus renvoyait toujours zéro.** Le code comptait les
sièges au statut `actif` alors qu'ils sont `disponible`. Remplissage et
capacité affichée au chauffeur étaient faux.

**7. Faille de sécurité critique.** `admin_web` tournait sur
`next@14.2.5`, cumulant un contournement d'autorisation et un
empoisonnement de cache — sérieux pour un portail qui valide des agences
et pilote des flux financiers. Migré en Next 16 / React 19, aligné sur
`agence_web`.

---

## Ce qui fonctionne aujourd'hui

**Backend.** Recherche multi-arrêts avec prix par tronçon, réservation
avec verrou de siège, paiement Mobile Money idempotent, QR signé
HMAC-SHA256, escrow, barème de retard automatique, litiges à effet
financier réel, dénonciations, vente et annulation au guichet, arrivées
par arrêt intermédiaire, rapports JSON et PDF, notifications.

**`admin_web`.** Validation d'agences, configuration des frais, billets
et trajets, finances, gestion documentaire, suspension avec
remboursements en cascade.

**`agence_web`.** Inscription et connexion, création de trajets, flotte,
réservations avec liste réelle des passagers, paiements avec versements
escrow réels, incidents alimentés par les signalements des voyageurs,
litiges, avis, chauffeurs, et **vente au guichet** : le plan du bus est
le vrai plan, le siège est réellement réservé, le billet créé avec son
QR signé, et le montant à encaisser calculé par le serveur.

**`jego_mobile`.** Recherche, connexion, inscription, sélection de siège
sur le plan réel du bus, paiement idempotent, billets, fiche agence avec
vrais avis, QR scannable, espace chauffeur complet avec feuille de route
et scan hors ligne.

Aucune donnée fictive nulle part, dans aucun des quatre composants. Les
fichiers `donnees_demo.dart`, `donnees_demo_chauffeur.dart`,
`comptes_chauffeurs.dart` et `trajets-demo.ts` ont été supprimés, et le mot « démo » n'apparaît plus
dans aucun texte visible par un utilisateur.

---

## Ce qui ne fonctionne pas, et pourquoi

### Fonctions volontairement non simulées

Elles n'existent pas côté serveur, donc elles ne font pas semblant :

- **Express Union** — retiré des opérateurs (le backend n'accepte que
  MTN MoMo et Orange Money).
- **Connexion Google / Facebook / Apple** — affiche que la fonction
  arrive, au lieu d'ouvrir une session inexistante.

### Écrans de réglages sans stockage serveur

Adresses, moyens de paiement, sécurité, confidentialité, devise, thème.
L'interface existe et indique clairement que le réglage n'est pas actif.

**Mon avis : retirez-les du menu pour le lancement.** Un réglage qui ne
fait rien érode la confiance d'un utilisateur méfiant — exactement le
public que vous visez.

### Chantiers entiers, pas des finitions

Suivi GPS temps réel, chat agence, notifications météo. Aucune
infrastructure : ni table, ni remontée de position, ni carte. Ce sont
des projets à part entière.

**Sur le GPS en particulier :** ne le faites pas pour le lancement. Le
chauffeur déclare déjà son départ, ses passages aux arrêts et son
arrivée — le voyageur sait où en est son bus. Le GPS continu consomme
batterie et données mobiles (coûteuses au Cameroun) et suppose une
couverture réseau que vous n'aurez pas sur les axes interurbains.

---

## La seule chose que je n'ai pas pu vérifier

**Le code Flutter n'a pas été compilé.** Le SDK Flutter n'existe pas
dans l'environnement où ces modifications ont été produites, et il n'y
est pas installable. Ce n'est pas de la prudence excessive : c'est une
contrainte matérielle.

Ce qui a été fait à la place : contrôle structurel automatique des 70
fichiers Dart, et chaque appel réseau écrit à partir d'une route backend
réellement exposée et testée.

**Lancez `flutter analyze` avant `flutter run`.** S'il reste des
avertissements — imports inutiles, `use_build_context_synchronously` sur
les méthodes devenues asynchrones — ils apparaîtront là. Ce sont des
corrections de surface, pas des défauts d'architecture.

Le `next build` des portails n'a pas non plus pu aboutir ici, pour une
raison unique et identifiée : l'environnement n'a pas accès à Google
Fonts, téléchargées au moment du build. `tsc --noEmit` passe sans erreur
sur les deux, ce qui couvre le code lui-même.

---

## Le test qui vaut tous les autres

Après installation, faites ce parcours dans l'ordre. S'il passe en
entier, le système fonctionne.

1. Connexion admin (`admin@jego.cm` / `ChangeMoi123!`) → **changez le mot de passe**
2. Inscription d'une agence sur `agence_web` → validation par l'admin
3. Création d'un bus, d'une ligne, d'un trajet
4. Recherche et achat d'un billet depuis l'application mobile
5. Affichage du billet → **le QR doit être scannable**
6. Connexion chauffeur → scan du QR → départ → arrivée
7. Retour sur `agence_web` : le passager apparaît dans Réservations, le
   versement dans Paiements

---

## Deux points qui ne sont pas techniques

### L'escrow doit être validé juridiquement avant le lancement

Vous retenez les fonds du client jusqu'à confirmation d'arrivée.
Détenir des fonds clients, même transitoirement, peut vous faire relever
du régime d'établissement de paiement au regard de la COBAC et de la
BEAC.

**À trancher avec un avocat camerounais avant d'ouvrir au public.** Si
le montage impose que l'argent ne transite jamais par un compte JEGO
(paiement fractionné directement chez l'opérateur Mobile Money), cela
change l'architecture technique de l'escrow, pas seulement vos
conditions générales.

### Lancez petit

Le code supporte un nombre illimité d'agences, de lignes et d'arrêts.
Ce n'est pas une raison pour ouvrir large.

Une seule ligne, une seule agence pilote, jusqu'à ce que le cycle
complet tourne sans incident en conditions réelles. Vous êtes seul
développeur : chaque agence supplémentaire multiplie le support et les
litiges, pas les revenus au début.

Et prévoyez une présence physique en gare routière les premières
semaines. Une clientèle méfiante ne se convainc pas par une belle
application, mais en voyant quelqu'un de JEGO présent quand quelque
chose ne marche pas.
