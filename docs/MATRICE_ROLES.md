# Matrice des roles

Ce document definit les roles de l'application Les cocottes de Diane et les permissions associees.

## Roles

| Role         | Description                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `admin`      | Acces complet a l'application et a l'API, y compris la creation de comptes.                      |
| `gerant`     | Configuration, stock et caisse, sans aucun acces a la categorie utilisateurs.                     |
| `vendeur`    | Encaissement, consultation simple des articles et caisse du jour.                                |
| `production` | Production des articles, consultation des recettes/nomenclatures et stock utile a la production. |
| `stock`      | Gestion des matieres premieres, receptions, corrections et alertes stock.                        |
| `comptable`  | Consultation caisse, historique, exports et chiffres, sans modifier l'exploitation.              |
| `read_only`  | Consultation transversale des donnees autorisees, sans aucune action de modification.             |

## Matrice des permissions

Le role `admin` dispose de toutes les permissions listees ci-dessous. La matrice
detaille le comportement des roles metier existants. `read_only` a acces a
toutes les actions commencant par "Voir" dans ce tableau, ainsi qu'aux
categories, points de retrait et utilisateurs. Toutes les autres actions lui
sont refusees.

| Action                          | gerant | vendeur | production | stock | comptable |
| ------------------------------- | ------ | ------- | ---------- | ----- | --------- |
| Voir le dashboard               | Oui    | Oui     | Oui        | Oui   | Oui       |
| Voir les articles               | Oui    | Oui     | Oui        | Oui   | Oui       |
| Creer un article                | Oui    | Non     | Non        | Non   | Non       |
| Modifier un article             | Oui    | Non     | Non        | Non   | Non       |
| Supprimer un article            | Oui    | Non     | Non        | Non   | Non       |
| Voir les matieres premieres     | Oui    | Non     | Oui        | Oui   | Non       |
| Creer une matiere premiere      | Oui    | Non     | Non        | Oui   | Non       |
| Modifier une matiere premiere   | Oui    | Non     | Non        | Oui   | Non       |
| Supprimer une matiere premiere  | Oui    | Non     | Non        | Oui   | Non       |
| Voir les nomenclatures          | Oui    | Non     | Oui        | Oui   | Non       |
| Creer/modifier une nomenclature | Oui    | Non     | Oui        | Non   | Non       |
| Produire un article             | Oui    | Non     | Oui        | Non   | Non       |
| Voir la capacite de production  | Oui    | Non     | Oui        | Oui   | Non       |
| Creer une vente                 | Oui    | Oui     | Non        | Non   | Non       |
| Voir les ventes                 | Oui    | Oui     | Non        | Non   | Oui       |
| Rembourser une commande Stripe  | Oui    | Non     | Non        | Non   | Non       |
| Voir la caisse du jour          | Oui    | Oui     | Non        | Non   | Oui       |
| Cloturer la caisse              | Oui    | Non     | Non        | Non   | Oui       |
| Voir l'historique de caisse     | Oui    | Non     | Non        | Non   | Oui       |
| Voir la marge                   | Oui    | Non     | Non        | Non   | Oui       |
| Exporter caisse / compta        | Oui    | Non     | Non        | Non   | Oui       |
| Voir les alertes stock          | Oui    | Non     | Oui        | Oui   | Non       |
| Faire une reception de stock    | Oui    | Non     | Non        | Oui   | Non       |
| Corriger un stock               | Oui    | Non     | Non        | Oui   | Non       |
| Voir les mouvements de stock    | Oui    | Non     | Oui        | Oui   | Non       |
| Gerer les utilisateurs          | Non    | Non     | Non        | Non   | Non       |
| Creer un utilisateur            | Non    | Non     | Non        | Non   | Non       |
| Modifier les roles              | Oui    | Non     | Non        | Non   | Non       |

## Permissions par route API

Le role `admin` est autorise sur toutes les routes protegees ci-dessous, en plus
des roles indiques. Le role `read_only` est autorise sur les lectures des
articles, categories, matieres premieres, nomenclatures, commandes et
remboursements existants, ventes, caisse, lots, mouvements de stock et points
de retrait. Il n'est autorise sur aucune route d'ecriture ni sur les
reconciliations Stripe. Les colonnes ci-dessous decrivent les autres roles
metier.

| Route                                         | Methode  | Roles autorises                                |
| --------------------------------------------- | -------- | ---------------------------------------------- |
| `/api/articles`                               | `GET`    | `gerant`, `vendeur`, `production`, `stock`     |
| `/api/articles`                               | `POST`   | `gerant`                                       |
| `/api/articles/:id`                           | `GET`    | `gerant`, `vendeur`, `production`, `stock`     |
| `/api/articles/:id`                           | `PATCH`  | `gerant`                                       |
| `/api/articles/:id`                           | `DELETE` | `gerant`                                       |
| `/api/articles/:id/capacity`                  | `GET`    | `gerant`, `production`, `stock`                |
| `/api/articles/:id/produce`                   | `POST`   | `gerant`, `production`                         |
| `/api/matieres-premieres`                     | `GET`    | `gerant`, `production`, `stock`                |
| `/api/matieres-premieres`                     | `POST`   | `gerant`, `stock`                              |
| `/api/matieres-premieres/:id`                 | `GET`    | `gerant`, `production`, `stock`                |
| `/api/matieres-premieres/:id`                 | `PATCH`  | `gerant`, `stock`                              |
| `/api/matieres-premieres/:id`                 | `DELETE` | `gerant`, `stock`                              |
| `/api/articles/:articleId/nomenclature`       | `GET`    | `gerant`, `production`, `stock`                |
| `/api/articles/:articleId/nomenclature`       | `POST`   | `gerant`, `production`                         |
| `/api/articles/:articleId/nomenclature/:mpId` | `PATCH`  | `gerant`, `production`                         |
| `/api/articles/:articleId/nomenclature/:mpId` | `DELETE` | `gerant`, `production`                         |
| `/api/ventes`                                 | `GET`    | `gerant`, `vendeur`, `comptable`               |
| `/api/ventes`                                 | `POST`   | `gerant`, `vendeur`                            |
| `/api/ventes/:id`                             | `GET`    | `gerant`, `vendeur`, `comptable`               |
| `/api/caisse/today`                           | `GET`    | `gerant`, `vendeur`, `comptable`               |
| `/api/caisse/cloturer`                        | `POST`   | `gerant`, `comptable`                          |
| `/api/caisse/journees`                        | `GET`    | `gerant`, `comptable`                          |
| `/api/commandes/:id/refunds`                  | `GET`    | `gerant`, `vendeur`, `production`, `comptable` |
| `/api/commandes/:id/refunds`                  | `POST`   | `gerant`                                       |

## Permissions frontend

Le role `admin` est autorise sur toutes les pages du back-office. Le role
`gerant` n'a acces ni a la page, ni au menu, ni aux endpoints de gestion des
utilisateurs.

Le role `read_only` peut ouvrir les pages de consultation correspondantes, dont
les listes et details articles, commandes, stock, caisse, categories, points de
retrait et utilisateurs. Les pages dediees a la creation ou a l'edition le
redirigent vers la page 403 avec une explication. Les formulaires, menus
d'actions et boutons de mutation ne sont pas rendus.

| Page                                   | Roles autorises                                                 |
| -------------------------------------- | --------------------------------------------------------------- |
| `/articles`                            | `gerant`, `vendeur`, `production`, `stock`                      |
| `/articles/new`                        | `gerant`                                                        |
| `/articles/[id]`                       | `gerant`, `vendeur`, `production`, `stock`                      |
| `/articles/[id]/edit`                  | `gerant`                                                        |
| `/articles/[id]/nomenclature`          | `gerant`, `production`                                          |
| `/matieres-premieres`                  | `gerant`, `production`, `stock`                                 |
| `/matieres-premieres/new`              | `gerant`, `stock`                                               |
| `/matieres-premieres/[id]`             | `gerant`, `production`, `stock`                                 |
| `/matieres-premieres/[id]/edit`        | `gerant`, `stock`                                               |
| `/ventes`                              | `gerant`, `vendeur`, `comptable`                                |
| `/ventes/new`                          | `gerant`, `vendeur`                                             |
| `/caisse`                              | `gerant`, `vendeur`, `comptable`                                |
| `/caisse/journees`                     | `gerant`, `comptable`                                           |
| `/commandes/[id]` remboursement Stripe | `gerant` pour l'action, roles de consultation pour l'historique |

## Note d'implementation

Les roles pris en charge sont :

- `admin`
- `gerant`
- `vendeur`
- `production`
- `stock`
- `comptable`
- `read_only`

Les permissions sont centralisees dans les helpers web et dans `RolesGuard` cote
API. Pour `read_only`, `RolesGuard` refuse aussi centralement toute methode autre
que `GET`, `HEAD` ou `OPTIONS`. Toute valeur absente ou inconnue est refusee par
defaut.
