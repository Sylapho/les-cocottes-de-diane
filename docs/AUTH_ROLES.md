# Audit des roles Better Auth

## Objectif

Better Auth gere les sessions internes du projet Les cocottes de Diane. L'API NestJS verifie ces
sessions avec `BetterAuthGuard`, puis applique les permissions avec
`RolesGuard` et le decorateur `@Roles(...)`.

La boutique publique `apps/shop` reste publique. Le back-office `apps/web` est
protege par un proxy Next.js qui redirige vers `/sign-in` lorsqu'aucune session
n'est presente.

## Roles existants

| Role         | Usage attendu                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `admin`      | Tous les droits du back-office et de l'API, y compris la creation de comptes.                         |
| `gerant`     | Catalogue, production, caisse et stock, sans aucun acces a la gestion des utilisateurs.                |
| `vendeur`    | Ventes, commandes client, consultation du catalogue utile a la vente.                                 |
| `production` | Preparation, production, nomenclatures, commandes a preparer.                                         |
| `stock`      | Matieres premieres, mouvements, lots, ajustements et receptions.                                      |
| `comptable`  | Consultation ventes, caisse, commandes et mouvements utiles au suivi.                                 |
| `read_only`  | Consultation transversale du back-office, sans aucune operation d'ecriture.                           |

Le role par defaut Better Auth est `vendeur`.

Le role `admin` est un super-role explicite dans `RolesGuard` : il satisfait
toute route protegee par `@Roles(...)`. Un role absent ou inconnu ne recoit
aucun role de repli et est refuse par les permissions fines.

Le role `read_only` est soumis a une seconde barriere dans `RolesGuard` : seules
les methodes `GET`, `HEAD` et `OPTIONS` sont acceptees. Toute autre methode est
refusee avec un statut `403` avant les pipes, intercepteurs et services metier,
meme si un decorateur de role etait configure trop largement par erreur.

## Separation User / AuthUser

Le schema Prisma contient deux notions differentes :

| Modele     | Table    | Usage                                                              |
| ---------- | -------- | ------------------------------------------------------------------ |
| `User`     | `"User"` | Utilisateur metier historique lie aux ventes (`Vente.userId`).     |
| `AuthUser` | `"user"` | Utilisateur Better Auth pour les sessions, mots de passe et roles. |

Ces deux modeles ne doivent pas etre melanges. Les autorisations et les sessions
doivent utiliser `AuthUser` / Better Auth. Le modele `User` reste lie au domaine
metier des ventes tant qu'il n'est pas migre explicitement.

## Statistiques de connexion

Les statistiques de connexion du back-office sont stockees directement sur le
modele Prisma `AuthUser`, dans la table Better Auth `"user"` :

- `loginCount` contient le nombre de connexions reussies et vaut `0` par defaut ;
- `lastLoginAt` contient la date de la derniere connexion reussie et reste nullable.

La migration `20260720120000_add_auth_user_login_statistics` initialise ainsi
les utilisateurs existants avec un compteur a `0` et une date a `null`. Aucun
historique artificiel n'est reconstruit a partir des sessions existantes.

La comptabilisation est configuree dans `apps/web/src/lib/auth.ts` avec le hook
Better Auth `databaseHooks.session.create.after`. Le hook appelle
`trackSuccessfulLogin` uniquement lorsqu'une session vient d'etre creee par une
connexion email reussie ou par un callback OAuth. L'increment PostgreSQL
`"loginCount" = "loginCount" + 1` est atomique. Les echecs de connexion, les
lectures et rafraichissements de session, la creation d'un employe, le bootstrap
administrateur et l'impersonation ne sont pas comptes.

Les champs sont exposes par `GET /api/admin/users` et affiches sur
`/admin/users` uniquement pour le role `admin`. L'endpoint renvoie `403` aux
roles `gerant`, `read_only` et aux autres roles non administrateurs. La liste
read-only de la page utilise une requete distincte qui ne selectionne pas ces
colonnes. La reponse API repose sur une liste blanche et n'inclut ni mots de
passe, ni tokens, ni sessions, ni adresses IP, ni user-agents.

Appliquer la migration en production avec :

```bash
pnpm db:deploy
```

En developpement, `pnpm db:migrate` applique les migrations et regenere le
client Prisma selon la configuration locale.

Le hook est execute apres la creation reussie de la session afin de ne jamais
compter un echec. Cette mise a jour n'est pas dans la meme transaction que la
creation interne de session Better Auth : une panne de base survenant exactement
entre les deux operations peut laisser une connexion non comptabilisee. L'erreur
est journalisee sans invalider une session utilisateur deja creee.

## Routes publiques API

| Route                                            | Statut                   | Note                                                                                      |
| ------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------- |
| `GET /api`                                       | Publique                 | Health/info simple de l'API.                                                              |
| `GET /api/boutique/articles`                     | Publique                 | Catalogue public de la boutique.                                                          |
| `GET /api/commandes/pickup-points`               | Publique                 | Points de retrait affiches au checkout.                                                   |
| `POST /api/commandes/checkout`                   | Publique avec rate limit | Cree une commande en attente et une session Stripe.                                       |
| `POST /api/commandes/stripe/webhook`             | Publique signee          | Endpoint appele par Stripe, signature verifiee dans le service.                           |
| `GET /api/commandes/checkout-session/:sessionId` | Publique                 | Recapitulatif client apres retour Stripe.                                                 |
| `POST /api/commandes`                            | Protegee                 | Creation manuelle interne hors paiement Stripe, reservee aux roles `gerant` et `vendeur`. |

## Matrice des routes protegees API

`admin` a acces a toutes les routes de cette matrice. Les roles listes dans la
colonne suivante decrivent les acces des autres roles.

| Domaine            | Routes                                                                                                                                              | Roles autorises                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Articles           | `GET /api/articles`, `GET /api/articles/:id`                                                                                                        | `gerant`, `vendeur`, `production`, `stock`, `read_only`     |
| Articles           | `GET /api/articles/:id/capacity`                                                                                                                    | `gerant`, `production`, `stock`, `read_only`                |
| Articles           | `POST /api/articles/:id/produce`                                                                                                                    | `gerant`, `production`                         |
| Articles           | `POST /api/articles`, `PATCH /api/articles/:id`, `DELETE /api/articles/:id`                                                                         | `gerant`                                       |
| Matieres premieres | `GET /api/matieres-premieres`, `GET /api/matieres-premieres/:id`                                                                                    | `gerant`, `production`, `stock`, `read_only`                |
| Matieres premieres | `POST /api/matieres-premieres`, `PATCH /api/matieres-premieres/:id`, `DELETE /api/matieres-premieres/:id`                                           | `gerant`, `stock`                              |
| Nomenclatures      | `GET /api/articles/:articleId/nomenclature`                                                                                                         | `gerant`, `production`, `stock`, `read_only`                |
| Nomenclatures      | `POST/PATCH/DELETE /api/articles/:articleId/nomenclature...`                                                                                        | `gerant`, `production`                         |
| Commandes          | `GET /api/commandes`, `GET /api/commandes/:id`, `GET /api/commandes/:id/refunds`                                                                    | `gerant`, `vendeur`, `production`, `comptable`, `read_only` |
| Commandes          | `POST /api/commandes`                                                                                                                               | `gerant`, `vendeur`                            |
| Commandes          | `PATCH /api/commandes/:id/statut`                                                                                                                   | `gerant`, `vendeur`, `production`              |
| Commandes          | `POST /api/commandes/cleanup-abandoned`                                                                                                             | `gerant`                                       |
| Ventes             | `GET /api/ventes`, `GET /api/ventes/:id`                                                                                                            | `gerant`, `vendeur`, `comptable`, `read_only`               |
| Ventes             | `POST /api/ventes`                                                                                                                                  | `gerant`, `vendeur`                            |
| Caisse             | `GET /api/caisse/today`                                                                                                                             | `gerant`, `vendeur`, `comptable`, `read_only`               |
| Caisse             | `GET /api/caisse/journees`                                                                                                                          | `gerant`, `comptable`, `read_only`                          |
| Caisse             | `POST /api/caisse/cloturer`                                                                                                                         | `gerant`, `comptable`                          |
| Stock              | `GET /api/mouvements-stock`, `GET /api/mouvements-stock/lots`                                                                                       | `gerant`, `stock`, `production`, `comptable`, `read_only`   |
| Stock              | `POST /api/mouvements-stock/ajustement`, `POST /api/mouvements-stock/matieres-premieres/:id/reception`, `POST /api/mouvements-stock/lots/:id/perte` | `gerant`, `stock`                              |
| Categories         | `GET /api/article-categories`, `GET /api/article-categories/:id`                                                                                    | `gerant`, `vendeur`, `production`, `stock`, `read_only`     |
| Points de retrait  | `GET /api/pickup-points`                                                                                                                            | `gerant`, `read_only`                          |

## Pages web sensibles

Le proxy `apps/web/src/proxy.ts` rend le back-office interdit sans session, sauf
routes publiques (`/`, `/api/auth`, `/boutique`, `/sign-in`).

| Page                                           | Protection actuelle                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/admin/users`                                 | Consultation `admin`/`read_only`; creation, suppression et changement de role reserves a `admin`.                      |
| `/articles`, `/articles/*`                     | Session requise par proxy, permissions API selon route appelee.                                                          |
| `/commandes`, `/commandes/*`                   | Session requise par proxy, permissions API commandes.                                                                    |
| `/caisse`, `/caisse/journees`                  | Session requise par proxy, permissions API caisse.                                                                       |
| `/ventes`, `/ventes/new`                       | Session requise par proxy, permissions API ventes.                                                                       |
| `/stock`, `/mouvements-stock`                  | Session requise par proxy, permissions API stock.                                                                        |
| `/matieres-premieres`, `/matieres-premieres/*` | Session requise par proxy, permissions API matieres premieres.                                                           |

## Routes shop publiques

`apps/shop` est l'interface client. Les pages catalogue, panier, checkout,
success/cancel et pages legales restent publiques. Les appels sensibles passent
par les endpoints publics controles de l'API (`boutique`, `pickup-points`,
`checkout`, `checkout-session`).

## Risques et durcissements recommandes

- `POST /api/commandes` est reserve a la creation manuelle interne. Il ne cree
  pas de paiement Stripe et doit rester limite aux roles `gerant` et `vendeur`.
- Le proxy web protege la presence d'une session, mais les restrictions fines
  par role sont surtout appliquees cote API. Continuer a considerer l'API comme
  source d'autorite.
- Le menu web masque les actions non autorisees apres resolution de la session ;
  ce masquage ne remplace pas les checks serveur.
- Verifier manuellement chaque role avec un compte dedie avant production.

## Creation ou promotion du premier administrateur

La commande interne idempotente `pnpm --filter @localco/web bootstrap:user`
cree le compte indique ou promeut le compte existant portant le meme email. Elle
n'expose aucune route publique de promotion et ne contient aucun mot de passe en
dur.

Configurer temporairement les variables suivantes dans l'environnement local
d'execution, puis supprimer la variable de mot de passe du shell apres usage :

```bash
BOOTSTRAP_USER_EMAIL=admin@example.com
BOOTSTRAP_USER_PASSWORD=<temporary-strong-password>
BOOTSTRAP_USER_NAME=Administrator
BOOTSTRAP_USER_ROLE=admin
```

`BOOTSTRAP_USER_ROLE` vaut `admin` par defaut. Pour un compte deja existant, la
commande conserve son mot de passe et met uniquement son role a jour.

## Migration des donnees

Les roles Better Auth sont stockes dans une colonne PostgreSQL `TEXT` (`String`
dans Prisma), et non dans un enum Prisma/PostgreSQL. L'ajout de `read_only` ne
requiert donc aucune migration : les roles existants et la valeur par defaut
`vendeur` restent inchanges.
