# Statistiques de la boutique

## Définitions métier

- Une **visite** est une session de navigation consentie sur `apps/shop`. Une session reste active tant qu’une activité pertinente intervient dans une fenêtre glissante de 30 minutes. Les changements de page, rafraîchissements et appels concurrents pendant cette fenêtre ne créent pas une nouvelle visite.
- Un **visiteur unique** est un identifiant aléatoire de navigateur ayant au moins une session commencée pendant la période. Il ne représente pas avec certitude une personne physique.
- Une **commande prise** est une commande dont `confirmedAt` a été renseigné. Pour Stripe, cette date est fixée une seule fois lors du premier webhook `checkout.session.completed` valide faisant passer la commande de `paiement_en_attente` à `nouvelle`. Une commande créée directement dans le back-office reçoit `confirmedAt` à sa création. Les commandes en attente, abandonnées ou annulées avant confirmation restent sans `confirmedAt`. Une annulation postérieure ne supprime pas la confirmation historique.
- Un **acheteur unique** est un visiteur pseudonymisé associé à au moins une commande confirmée dans la période. Trois commandes du même visiteur donnent trois commandes et un acheteur unique.
- Le taux principal est `acheteurs uniques / visiteurs uniques × 100`. L’API renvoie un pourcentage non arrondi. Lorsque le dénominateur vaut zéro, le taux vaut `0`.

Les périodes utilisent `Europe/Paris` : aujourd’hui depuis minuit local, 7 jours glissants (jour courant et six jours précédents) et 30 jours glissants (jour courant et vingt-neuf jours précédents). Il ne s’agit ni d’une semaine ni d’un mois calendaire.

## Données et pseudonymisation

Après consentement, la boutique conserve dans `localStorage` :

- le choix de consentement pendant six mois ;
- un UUID v4 visiteur pendant au plus 395 jours (environ 13 mois) ;
- un UUID v4 de session, sa dernière activité et son dernier envoi.

L’API ne persiste jamais ces UUID en clair. Elle enregistre un HMAC-SHA256 stable calculé avec `ANALYTICS_HASH_SECRET`, secret distinct des secrets Better Auth et Stripe. Elle ne persiste pas d’adresse IP ni de user-agent. L’adresse réseau peut servir brièvement au rate limiting en mémoire, sous forme hachée non persistée.

`AnalyticsVisitor` contient le hash visiteur et les dates de première/dernière activité. `AnalyticsSession` contient le hash de session, son début, sa dernière activité et une date facultative de conversion. `Commande` référence facultativement le visiteur et la session, et porte `confirmedAt`. Les relations facultatives préservent les commandes historiques ou passées sans analytics.

Les sessions et visiteurs dépassant 395 jours sont supprimés au démarrage de l’API puis toutes les 24 heures. Les clés étrangères de commande passent alors à `NULL`; la commande reste comptée, mais devient non attribuée. Le nettoyage est idempotent et sûr avec plusieurs instances. Chaque instance peut lancer la même suppression; PostgreSQL reste la source de vérité.

## Consentement et droits

Le suivi est volontairement **opt-in** : aucun identifiant analytics n’est créé et aucun appel de tracking n’est envoyé avant le choix « Autoriser ». « Refuser » supprime immédiatement les identifiants locaux. Le lien « Gérer mes préférences » du pied de page permet de renouveler ou retirer le choix.

Ce choix technique limite le risque, mais ne constitue pas à lui seul une validation de conformité RGPD. La base légale, les mentions, la durée et le caractère éventuellement exempté de la mesure d’audience doivent être validés juridiquement avant production.

## Flux technique

1. `POST /api/analytics/visits` valide deux UUID v4, applique un rate limit, calcule leurs HMAC et crée au maximum une session active par visiteur sur 30 minutes. Une transaction et un verrou de ligne évitent les doublons concurrents.
2. La boutique transmet les UUID consentis à `POST /api/commandes/checkout`. Le serveur les pseudonymise et associe uniquement les enregistrements internes à la commande.
3. Le webhook Stripe validé remplit `confirmedAt` et `convertedAt` seulement si ces champs sont encore absents. Le mécanisme existant de `StripeWebhookEvent` rend le rejeu idempotent. Une commande sans identifiant reste comptée et apparaît dans `unattributedOrders`.
4. `GET /api/admin/analytics/overview` effectue des `COUNT` et `COUNT DISTINCT` en PostgreSQL. La route exige Better Auth et le rôle exact `admin`, puis renvoie uniquement des agrégats avec `Cache-Control: private, no-store`.

Le rate limit du tracking est en mémoire par instance. En production multi-instance, un rate limit partagé doit aussi être configuré au niveau de l’ingress ou de la passerelle API.

## Limites connues

- Un changement de navigateur ou la suppression du stockage local crée un nouveau visiteur.
- Plusieurs personnes utilisant le même navigateur peuvent être fusionnées.
- Une commande sans identifiant analytics ne peut pas être attribuée.
- Un blocage réseau peut faire manquer une visite, sans jamais bloquer la navigation ou le paiement.
- Le taux est une mesure statistique pseudonyme, pas l’identification certaine d’une personne.
- Les anciennes commandes éligibles sont migrées avec `createdAt`, seule date historique stable disponible avant l’ajout de `confirmedAt`.
