# Journée de caisse et clôture

## Journée métier

Une journée de caisse correspond à un jour calendaire `Europe/Paris`, de minuit
à minuit heure de Paris (`getParisDayBounds` dans
`apps/api/src/caisse/cash-register-day.ts`). Les changements d'heure sont pris
en compte : la journée du passage à l'heure d'été dure 23 heures, celle du
passage à l'heure d'hiver 25 heures.

Une vente appartient à la journée de l'instant où l'API la crée. La date de la
vente (`Vente.date`) est fixée par l'API avec ce même instant.

## Sérialisation vente / clôture

La création d'une vente (`POST /api/ventes`) et la clôture
(`POST /api/caisse/cloturer`) prennent, au début de leur transaction, le même
verrou PostgreSQL transactionnel de la journée :

```sql
SELECT pg_advisory_xact_lock(41020, <AAAAMMJJ>)
```

Le verrou est libéré automatiquement à la fin de la transaction (commit ou
rollback). Il ne bloque que les ventes et clôtures de la même journée.

Conséquences :

- une vente qui commence avant la clôture est validée avant que la clôture ne
  lise les ventes : elle est incluse dans le snapshot ;
- une vente qui arrive pendant ou après la clôture attend le verrou, constate
  que la journée est clôturée et est refusée avec un `409`
  (`code: CASH_REGISTER_DAY_CLOSED`), sans modifier le stock ;
- le snapshot (`JourneeCaisse`) est calculé et enregistré dans la même
  transaction que la vérification : en cas d'erreur, rien n'est enregistré et
  la journée reste ouverte.

## Double clôture

Deux clôtures simultanées sont sérialisées par le même verrou : la première
crée la journée clôturée, la seconde reçoit un `409`
(`code: CASH_REGISTER_DAY_ALREADY_CLOSED`). La contrainte unique sur
`JourneeCaisse.date` reste un filet de sécurité ; une violation éventuelle est
traduite dans le même `409`.

## Réouverture

Aucune réouverture de journée n'est prévue dans l'application. Une journée
clôturée est définitive ; une correction éventuelle relève d'une procédure
manuelle à définir (avec sauvegarde préalable de la base).
