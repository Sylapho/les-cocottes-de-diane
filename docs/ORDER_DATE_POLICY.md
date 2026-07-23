# Règle de date des commandes

Les commandes Click & Collect pour le lendemain doivent être passées avant
14 h, heure de Paris :

- avant 14 h, le lendemain peut être proposé s’il respecte le calendrier du
  point de retrait ;
- à partir de 14 h inclus, le lendemain est refusé et la recherche commence au
  surlendemain ;
- le retrait le jour même n’est pas proposé.

Le calcul utilise explicitement le fuseau `Europe/Paris`. Il ne dépend donc pas
du fuseau du navigateur, du conteneur ou du serveur, et suit les changements
d’heure été/hiver.

Les constantes `ORDER_TIMEZONE` et `NEXT_DAY_ORDER_CUTOFF_HOUR` ainsi que la
validation de référence se trouvent dans
`apps/api/src/commandes/pickup-slots.ts`. Le shop applique la même politique
dans `apps/shop/src/lib/pickup-points.ts` pour mettre à jour le sélecteur sans
attendre une requête refusée.

L’API reste la source d’autorité. `CommandePreparationService` déclenche la
validation avant toute lecture d’article, création de commande, réservation de
stock ou session Stripe. Une page restée ouverte avant 14 h ne peut donc pas
contourner la limite.

Les dates de retrait sont traitées comme des dates calendaires métier. Si le
client envoie un ISO avec une heure ou un décalage, la partie `YYYY-MM-DD`
explicite est conservée lors du stockage afin d’éviter une dérive d’un jour.
