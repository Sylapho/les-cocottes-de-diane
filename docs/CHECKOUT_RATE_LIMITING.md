# Rate limit checkout

## Portee

`POST /api/commandes/checkout` possede un middleware de limitation dedie. Les
autres routes ne consomment pas son quota et son store n'est pas reutilise par
un eventuel rate limiter global.

| Variable | Defaut | Description |
| --- | --- | --- |
| `CHECKOUT_RATE_LIMIT_WINDOW_MS` | `60000` | Fenetre de comptage en millisecondes. |
| `CHECKOUT_RATE_LIMIT_MAX` | `10` | Nombre maximal de tentatives par adresse IP dans la fenetre. |
| `TRUSTED_PROXIES` | vide | Liste separee par des virgules d'adresses IP ou CIDR de proxies approuves. |

Les entrees `TRUSTED_PROXIES` acceptent IPv4, IPv6 et les CIDR correspondants.
Une entree invalide empeche volontairement le demarrage de l'API. Une valeur
vide configure Express avec `trust proxy = false`. Les alias Express comme
`loopback`, les nombres de sauts et `true` sont refuses : le nombre de sauts
peut varier entre le domaine API direct et le chemin Boutique -> Shop -> API.

## Resolution securisee de l'adresse client

Le middleware utilise `request.ip`, calcule par Express :

- si le pair reseau direct n'est pas approuve, Express ignore la chaine
  `X-Forwarded-For` pour calculer l'adresse client ;
- si ce pair est approuve, Express parcourt la chaine depuis le pair le plus
  proche et s'arrete au premier saut non approuve ;
- le middleware ne lit jamais directement `X-Forwarded-For` ou `X-Real-IP` ;
- les adresses IPv4 encapsulees sous la forme `::ffff:a.b.c.d` sont normalisees
  en IPv4 afin de ne pas creer deux quotas pour le meme client ;
- si aucune adresse valide n'est exceptionnellement disponible, une cle
  aleatoire propre a la requete est utilisee. La limitation echoue alors de
  maniere ouverte pour cette requete, sans regrouper tous les clients sous un
  compteur commun.

Les cles du store ont la forme `checkout:<client-ip>`. Cet espace de noms et
l'instance de store dediee isolent le checkout des autres limitations.

## Caddy et Docker sur le VPS

Le proxy reel est Caddy sur le reseau Docker externe `lcdd_proxy`. Il existe
deux chemins vers NestJS :

1. Caddy -> API pour `api.*` et les routes `/api/*` du back-office ;
2. Caddy -> Shop -> API pour les appels `/api/*` faits sur le domaine boutique.

La valeur de production doit donc approuver le pair Caddy **et** le conteneur
Shop de l'environnement. L'option la plus stricte est une liste de leurs IP
statiques sur `lcdd_proxy`. Si ces IP ne sont pas statiques, le CIDR exact de
`lcdd_proxy` peut etre utilise uniquement si l'acces a ce reseau est administre
et limite aux conteneurs de confiance.

Determiner les valeurs reelles sur le VPS, sans recopier un sous-reseau
d'exemple :

```bash
docker network inspect lcdd_proxy
```

Puis configurer le fichier d'environnement propre a chaque deploiement, par
exemple conceptuellement :

```env
TRUSTED_PROXIES=<caddy-ip>/32,<prod-shop-ip>/32
```

Pour staging, remplacer l'IP Shop par celle de `staging-shop`. Si les adresses
sont dynamiques, reserver des IP stables dans la configuration Docker du proxy
et du Shop, ou configurer le CIDR inspecte du reseau apres en avoir controle
tous les membres. Ne jamais utiliser `true`, `0.0.0.0/0` ou `::/0`.

Le fichier [`../deployment/Caddyfile.example`](../deployment/Caddyfile.example)
montre les directives a reporter dans le Caddyfile du VPS. Il remplace
explicitement `X-Forwarded-For` avec le pair direct vu par Caddy et transmet
`X-Real-IP`, `X-Forwarded-Proto` et `Host`. Le proxy Next.js du Shop retransmet
ensuite cette chaine controlee a l'API. Le port API publie par Compose reste lie
a `127.0.0.1`, il ne doit pas etre expose publiquement.

En local, y compris avec le Compose de developpement qui ne contient aucun
reverse proxy, conserver :

```env
TRUSTED_PROXIES=
```

## Reponse 429

Quand le quota est atteint, l'API conserve son corps d'erreur habituel, retourne
`429 Too Many Requests` et ajoute `Retry-After`. La valeur est le nombre de
secondes, arrondi au-dessus et strictement positif, jusqu'a la date `resetAt`
du compteur courant ; ce n'est pas une constante independante de la fenetre.

## Limite du stockage en memoire

Le store est local au processus Node.js :

- chaque instance API possede ses propres compteurs ;
- la limite effective peut etre multipliee par le nombre d'instances ;
- un redemarrage remet les compteurs de cette instance a zero ;
- un load balancer peut distribuer les requetes entre plusieurs quotas ;
- la limitation n'est pas globale au cluster ni strictement distribuee.

Ce comportement convient a l'instance API unique actuelle. Avant un reel
deploiement multi-instance, remplacer `CheckoutRateLimitStore` par un stockage
partage tel que Redis (avec des operations atomiques et une expiration), ou
appliquer une limite partagee au niveau ingress/API gateway. Aucun Redis n'est
ajoute par ce ticket.
