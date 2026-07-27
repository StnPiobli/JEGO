# JEGO — Espace Super Admin (admin_web)

Next.js 14 (App Router) + TypeScript + Tailwind. Maquette convertie en code réel,
données 100% DEMO (cherche les commentaires `⚠️ DEMO` dans chaque page — c'est
le marquage habituel pour repérer ce qui reste à brancher sur l'API réelle).

## Installation

Dans le monorepo, place ce dossier à côté de `backend/`, `jego_mobile/`, `agence_web/` :

```
C:\Users\HP\JEGO\admin_web
```

Puis, terminal ADMIN WEB :

```
cd C:\Users\HP\JEGO\admin_web
npm install
npm run dev
```

Ouvre http://localhost:3000 (redirige automatiquement vers /login).

## Structure

- `app/login` — connexion Super Admin (2 étapes : identifiant/mdp puis code email)
- `app/(admin)/*` — toutes les pages protégées, enveloppées par `app/(admin)/layout.tsx`
  qui affiche la Sidebar partagée
- `components/Sidebar.tsx` — nav complète, gère les badges, les items verrouillés
  "plus tard" (🔒) et "à spécifier" (⚠️)
- `components/ui.tsx` — Topbar, Panel, Badge, BtnMini, StatCard, LockedPage —
  réutilisés sur toutes les pages pour rester cohérent visuellement

## Ce qui n'est PAS branché (volontairement)

- Aucun appel API réel — tout est en dur dans chaque `page.tsx`
- Pas d'authentification réelle sur `/login` (redirige sans vérifier)
- `app/(admin)/rgpd` et `app/(admin)/incidents` sont des pages "à spécifier" —
  contenu volontairement vide de fonctionnalité, juste la liste des questions
  à trancher avant de les construire
- Le compte à rebours 48h dans Litiges est une valeur statique, pas un vrai calcul

## Prochaines étapes possibles

1. Brancher `/login` sur le vrai endpoint d'authentification + double auth email
2. Remplacer les tableaux statiques par des fetch vers l'API (Node/Express)
3. Trancher RGPD et Incidents avant de les construire
4. Ajouter la confirmation modale sur "Désactivation d'urgence" (chauffeurs)
