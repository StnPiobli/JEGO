# JEGO - Plateforme de réservation de bus (Cameroun)

| Dossier | Contenu |
|---|---|
| `backend/` | API Node.js / Express + PostgreSQL (port 3000) |
| `database/` | Schéma, migrations et données de départ |
| `agence_web/` | Portail des agences (Next.js) |
| `admin_web/` | Portail d'administration JEGO (Next.js) |
| `jego_mobile/` | Application voyageurs et chauffeurs (Flutter) |

**Document de référence : [ETAT_DU_PROJET.md](ETAT_DU_PROJET.md)**
(ce qui marche, ce qui ne marche pas, ordre d'installation de la base,
vérifications). `INSTALLATION_2026-08-08.md` est un historique.

## Démarrage local

1. Créer la base `jego`, puis appliquer les fichiers SQL **dans l'ordre**
   donné par ETAT_DU_PROJET.md (avec `-v ON_ERROR_STOP=1`).
2. Copier `backend/.env.example` en `backend/.env` et le remplir
   (`JWT_SECRET` et `QR_SECRET` sont obligatoires, 24 caractères minimum).
3. `cd backend && npm install && npm run dev`
4. Portails : `npm install && npm run dev` dans `agence_web/` et `admin_web/`.
5. Tests (serveur lancé, base de test uniquement) : `cd backend && npm test`.

Les paiements Mobile Money sont **simulés** : aucun argent ne bouge.
