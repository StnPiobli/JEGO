# JEGO — État réel du projet

13 novembre 2026. Ce document dit ce qui marche, comment c'est vérifié,
et ce qui ne marche pas encore. Sans arrondir.

---

## Ce qui est vérifié par exécution réelle

| Composant | Vérification | Résultat |
|---|---|---|
| Backend | 193 tests (6 suites) contre une vraie base PostgreSQL | **0 échec** |
| Base de données | Tous les fichiers SQL rejoués sur une base **vierge**, puis les 193 tests dessus | **0 erreur, schéma identique à la base de dev** |
| `agence_web` | `eslint` + `next build` | **0 erreur, build OK** |
| `admin_web` | `eslint` + `next build` | **0 erreur, build OK** |
| `jego_mobile` | `flutter analyze` + `flutter test` + `flutter build web` | **0 erreur, 5 tests OK, build OK** |
| Dépendances | `npm audit` (backend, agence, admin) | Reste `minimatch` (modéré), uniquement dans les outils de dev (nodemon, eslint) |

### Le détail des 193 tests (`npm test` dans `backend`)

| Suite | Tests | Ce qu'elle couvre |
|---|---|---|
| `test_flux_complet` | 47 | Admin valide → agence publie → client paie → chauffeur scanne → arrivée → litige tranché |
| `test_nouvelles_fonctions` | 39 | Mot de passe chauffeur, annulation guichet, dénonciations |
| `test_arrets` | 26 | Lignes multi-arrêts, billets clos au bon arrêt |
| `test_retard` | 12 | Retard ≥ 4 h : points JEGO, jamais d'argent |
| `test_portail_agence` | 24 | Passagers d'un trajet, versements escrow, cloisonnement entre agences |
| `test_portefeuille` | 45 | Solde JEGO, remboursements, double dépense impossible, cadeaux, guichet |

---

## Installer la base sur un serveur neuf

L'ordre compte (l'ordre alphabétique des fichiers ne marche pas : deux
migrations dépendent d'une migration datée du même jour). Depuis
`database/` :

```
schema.sql
villes.sql
migration_agences_2026-08-07.sql
migration_frais.sql
migration_2026-08-08_consolidation.sql
migration_2026-08-08_denonciations.sql
migration_2026-08-08_arrets.sql
seed_admin.sql
migration_2026-08-11_email_chauffeurs.sql
migration_2026-08-12_code_acces_profil.sql
migration_2026-08-12_profil_agence.sql
migration_2026-08-14_categorie_et_bagages.sql
migration_2026-08-14_distribution_nourriture.sql
migration_2026-08-16_arrets_troncons_suppression.sql
migration_2026-08-19_messagerie.sql
migration_2026-08-19b_messages_pieces_jointes.sql
migration_2026-08-24_depart_arrets.sql
migration_2026-08-24_numero_trajet.sql
migration_2026-08-24_identifiants_solides.sql
migration_2026-08-25_connexion_google.sql
migration_2026-08-25_mot_de_passe_oublie.sql
migration_2026-08-26_avis_anonyme.sql
migration_2026-11-11_solde_portefeuille.sql
migration_2026-11-11_photo_voyageur.sql
migration_2026-11-11_reglages_argent.sql
migration_2026-11-11_notes_recalculees.sql
migration_2026-11-13_rattrapage_schema.sql
```

Chaque fichier se lance avec `psql -U postgres -d jego -v ON_ERROR_STOP=1 -f <fichier>`.

`migration_2026-11-13_rattrapage_schema.sql` ajoute ce qui n'existait
que dans la base de dev, créé à la main et jamais écrit dans un fichier :
les pièces jointes des litiges, le journal des connexions, l'escalade des
litiges, la date de refus d'une agence et 5 réglages. Sans ce fichier,
ajouter une pièce à un litige ou se connecter échouait sur un serveur neuf.

`seed_admin.sql` crée `admin@jego.cm` / `ChangeMoi123!` : **changez ce mot
de passe dès la première connexion.**

---

## Sécurité (audit du 11 novembre 2026, corrigé le 13)

- **Secrets obligatoires.** Le serveur refuse de démarrer si `JWT_SECRET`
  ou `QR_SECRET` manque ou fait moins de 24 caractères. Avant, une clé
  QR écrite dans le code servait par défaut : n'importe qui pouvait
  fabriquer de faux billets.
- **Récupération d'un billet.** Le numéro suffit toujours (il est
  imprévisible, et c'est ce qui permet d'offrir un billet), mais la
  réponse ne contient plus le téléphone ni l'email du voyageur, et les
  essais ratés sont limités.
- **Pièces jointes (messages, litiges).** Le vrai format est reconnu aux
  premiers octets du fichier (une page web renommée en `.png` est
  refusée), le serveur choisit le nom et l'extension, et seuls l'agence
  concernée et JEGO peuvent ouvrir le fichier. Les documents officiels
  et les logos suivent la même vérification du format.
- **Versement d'escrow.** La route ouverte à tous qui déclenchait un
  versement est supprimée ; la tâche automatique s'en charge.
- **Configuration.** `/test-db` supprimé ; CORS limité aux adresses
  connues (`CORS_ORIGINES` en production) ; `trust proxy` limité à cette
  machine ; port par défaut 3000 ; jeton dans l'adresse accepté
  seulement pour ouvrir un fichier.
- **Tentatives limitées** (en mémoire, un seul serveur) : 10 connexions
  ratées par compte et par adresse en 15 min, 5 demandes de code de mot
  de passe par heure, 5 messages « Nous contacter » par heure.

---

## Ce qui fonctionne aujourd'hui

**Backend.** Recherche multi-arrêts avec prix par tronçon, réservation
avec verrou de siège, paiement idempotent, QR signé HMAC-SHA256, escrow,
solde JEGO réutilisable, points de retard, litiges à effet financier
réel, dénonciations, vente et annulation au guichet, arrivées par arrêt,
rapports JSON et PDF, notifications, connexion Google.

**`admin_web`.** Validation d'agences, frais, billets et trajets,
finances, documents, suspension avec remboursements en cascade,
messagerie avec les agences, litiges, dénonciations, notifications.

**`agence_web`.** Trajets, flotte, chauffeurs, réservations, paiements et
versements escrow, signalements, litiges, avis, messagerie avec JEGO,
vente au guichet sur le vrai plan du bus.

**`jego_mobile`.** Recherche, compte, choix du siège, paiement, solde
JEGO, billets avec QR et PDF, avis, litiges, dénonciations, espace
chauffeur avec scan hors ligne.

---

## Ce qui ne fonctionne pas encore

- **Les paiements sont simulés.** Aucun appel à MTN MoMo ni à Orange
  Money : aucun argent ne bouge, ni à l'achat ni au versement aux
  agences. L'écran de paiement l'affiche (« Paiement de démonstration »).
  Le jour où la vraie API est branchée, mettre `PAIEMENTS_REELS=true`
  dans `backend/.env` : le bandeau disparaît.
- **Rien n'est en ligne.** Pas de serveur ni de nom de domaine en https.
  L'appli compilée vise `localhost`.
- **Les applis ne sont pas publiables.** Android utilise encore
  l'identifiant `com.example.jego_mobile` et la clé de signature de
  développement. La version iPhone demande un Mac.
- **Pas de sauvegardes ni d'alertes**, à prévoir avec le serveur.

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
BEAC. Le solde JEGO réutilisable (argent remboursé gardé dans l'appli)
renforce ce point : c'est de la monnaie conservée pour le client.

**À trancher avec un avocat camerounais avant d'ouvrir au public.** Si
le montage impose que l'argent ne transite jamais par un compte JEGO
(paiement fractionné directement chez l'opérateur Mobile Money), cela
change l'architecture technique de l'escrow, pas seulement vos
conditions générales.

### Lancez petit

Une seule ligne, une seule agence pilote, jusqu'à ce que le cycle
complet tourne sans incident en conditions réelles. Vous êtes seul
développeur : chaque agence supplémentaire multiplie le support et les
litiges, pas les revenus au début.

Et prévoyez une présence physique en gare routière les premières
semaines. Une clientèle méfiante ne se convainc pas par une belle
application, mais en voyant quelqu'un de JEGO présent quand quelque
chose ne marche pas.
