# Déploiement Les cocottes de Diane

Les déploiements sont automatisés par `.github/workflows/ci.yml` vers un VPS
avec Docker Compose. Une release est un manifeste JSON contenant les trois
références GHCR immuables de l'API, du back-office et de la boutique.

Le staging et la production consomment le même manifeste. La production ne
reconstruit aucune image et ne recalcule aucun digest.

La persistance, la migration initiale, la sauvegarde et la restauration des
images envoyées sont documentées dans [`UPLOADS.md`](UPLOADS.md). Le répertoire
doit être préparé avant le premier déploiement de cette version.

## Déclenchement

- Une pull request vers `main` ou `develop` exécute les validations, sans
  publication ni déploiement.
- Un push sur `develop` publie les trois images, crée un manifeste et déploie
  ce manifeste en staging.
- Un push sur `main` publie les trois images, crée un manifeste, le déploie et
  le vérifie en staging, puis propose exactement ce même manifeste au job
  `deploy-production`.
- Le job de production utilise l'environment GitHub `production`. Sa
  protection par approbateurs est configurée dans GitHub, pas dans le YAML.

Les groupes de concurrence `deploy-staging` et `deploy-production` empêchent
deux déploiements simultanés sur un même environnement. Un déploiement en cours
n'est pas annulé par l'arrivée d'un nouveau push.

## Construction neutre vis-à-vis de l'environnement

Les images Next.js sont construites avec `NEXT_PUBLIC_API_URL=/api`. Les appels
navigateur utilisent donc le même domaine que l'application. Les routes proxy
Next.js transmettent ensuite les requêtes à `API_INTERNAL_URL`, fourni au
runtime par chaque Docker Compose. Les uploads utilisent également un proxy en
même origine.

Cette configuration évite d'intégrer un domaine staging ou production dans le
bundle JavaScript et permet de promouvoir les mêmes digests entre les deux
environnements.

## Images et manifeste

Les repositories GHCR sont :

```text
ghcr.io/<owner>/les-cocottes-api
ghcr.io/<owner>/les-cocottes-web
ghcr.io/<owner>/les-cocottes-shop
```

Les tags `staging`, `prod` et `<git-sha>` restent publiés uniquement pour la
consultation du registre. Aucun déploiement ne les utilise. Le digest retourné
par `docker/build-push-action` est enregistré par chaque entrée de la matrice,
puis le job `generate-release` produit ce manifeste :

```json
{
  "schemaVersion": 1,
  "gitSha": "0123456789abcdef0123456789abcdef01234567",
  "workflowRunId": "123456789",
  "createdAt": "2026-07-10T12:00:00Z",
  "images": {
    "api": "ghcr.io/<owner>/les-cocottes-api@sha256:<64 caractères hexadécimaux>",
    "web": "ghcr.io/<owner>/les-cocottes-web@sha256:<64 caractères hexadécimaux>",
    "shop": "ghcr.io/<owner>/les-cocottes-shop@sha256:<64 caractères hexadécimaux>"
  }
}
```

Le manifeste est refusé si :

- sa structure, son SHA Git ou son identifiant de workflow est invalide ;
- une des trois images est absente ;
- une référence n'utilise pas `@sha256:` avec un digest complet ;
- une image ne provient pas du repository GHCR attendu.

L'artifact GitHub Actions se nomme `release-manifest-<git-sha>` et est conservé
30 jours. Il ne contient aucun secret.

## Docker Compose versionnés

Les fichiers réellement déployés sont versionnés dans :

- `deployment/docker-compose-staging.yml` ;
- `deployment/docker-compose-prod.yml`.

Le workflow transfère le fichier correspondant et l'installe atomiquement à
l'emplacement défini par `COMPOSE_FILE`. Chaque service applicatif utilise la
référence complète injectée par `deploy-release.sh` :

```yaml
services:
  api:
    image: ${API_IMAGE:?API_IMAGE is required}

  migrate:
    image: ${API_IMAGE:?API_IMAGE is required}
    command: pnpm db:deploy

  web:
    image: ${WEB_IMAGE:?WEB_IMAGE is required}

  shop:
    image: ${SHOP_IMAGE:?SHOP_IMAGE is required}
```

Les services réels sont `api`, `web`, `shop` et `migrate`. Ils ne construisent
plus aucune référence depuis `IMAGE_TAG`, `staging`, `prod` ou `latest`. Le
script vérifie la syntaxe Compose et la présence de ces quatre services avant
de remplacer le fichier du VPS.

Le service de migration doit exécuter la commande existante
`pnpm db:deploy`, soit `prisma migrate deploy`, avec `${API_IMAGE}`. Les secrets
applicatifs restent dans `.env.staging` ou `.env.prod` sur le VPS ; ils ne sont
ni copiés dans le manifeste ni stockés comme artifact. La variable interne
`APP_ENV_FILE` transmet à Compose le chemin absolu du fichier concerné.

Chaque fichier d'environnement VPS doit aussi définir `TRUSTED_PROXIES` avec
les IP/CIDR contrôlés du chemin entrant. Le Caddy actuel atteint directement
l'API pour les domaines API/back-office, mais le domaine boutique suit le
chemin Caddy -> Shop -> API : Caddy et le conteneur Shop concerné doivent donc
être approuvés. Inspecter `lcdd_proxy` et suivre la procédure détaillée dans
[`CHECKOUT_RATE_LIMITING.md`](CHECKOUT_RATE_LIMITING.md) avant de redémarrer
l'API. Une valeur invalide bloque volontairement son démarrage.

Le VPS doit fournir :

- Docker Engine et Docker Compose v2 ;
- `bash`, `curl` et `jq` ;
- un accès en lecture aux trois packages GHCR pour l'utilisateur Docker ;
- un utilisateur SSH autorisé à exécuter Docker et à écrire dans
  `DEPLOYMENT_ROOT`.

## Variables et secrets GitHub

Créer les mêmes noms dans les environments GitHub `staging` et `production`,
avec des valeurs propres à chacun.

Secrets :

| Nom | Description |
| --- | --- |
| `SSH_HOST` | Hôte du VPS |
| `SSH_PORT` | Port SSH |
| `SSH_USER` | Utilisateur de déploiement |
| `SSH_PRIVATE_KEY` | Clé privée de déploiement |

Variables :

| Nom | Description |
| --- | --- |
| `ENVIRONMENT_URL` | URL affichée par l'environment GitHub |
| `COMPOSE_FILE` | Chemin absolu où installer le Docker Compose sur le VPS |
| `ENV_FILE` | Chemin absolu du fichier `.env` sur le VPS |
| `COMPOSE_PROJECT_NAME` | Projet Compose, par exemple `cocottes-staging` |
| `DEPLOYMENT_ROOT` | Répertoire des scripts, releases et états |
| `API_HEALTH_URL` | URL publique complète de `/api/health/ready` |
| `WEB_HEALTH_URL` | URL publique complète de `/health` du back-office |
| `SHOP_HEALTH_URL` | URL publique complète de `/health` de la boutique |
| `API_SERVICE` | Nom du service API, défaut `api` |
| `WEB_SERVICE` | Nom du service back-office, défaut `web` |
| `SHOP_SERVICE` | Nom du service boutique, défaut `shop` |
| `MIGRATION_SERVICE` | Nom du service de migration, défaut `migrate` |
| `NEXT_PUBLIC_FACEBOOK_URL` | URL publique complète de la page Facebook officielle, intégrée au build de la boutique |
| `NEXT_PUBLIC_INSTAGRAM_URL` | URL publique complète du compte Instagram officiel, intégrée au build de la boutique |

Les variables `NEXT_PUBLIC_FACEBOOK_URL` et `NEXT_PUBLIC_INSTAGRAM_URL` doivent être définies dans chaque environment GitHub qui publie une image (`staging` et `production`). Les valeurs présentes uniquement dans le fichier `.env.staging` ou `.env.prod` du VPS arrivent trop tard : Next.js intègre les variables publiques au bundle pendant la construction de l'image. Après une modification, reconstruire et redéployer l'image de la boutique.

Les anciens secrets `STAGING_SSH_*` doivent être recopiés sous les noms
génériques ci-dessus dans l'environment `staging`. Les secrets de production
doivent exister uniquement dans l'environment `production`.

Valeurs correspondant à l'infrastructure actuelle :

| Variable | Staging | Production |
| --- | --- | --- |
| `ENVIRONMENT_URL` | `https://dev.lescocottesdediane.fr` | `https://lescocottesdediane.fr` |
| `COMPOSE_FILE` | `/opt/les-cocottes-de-diane/staging/docker-compose-staging.yml` | `/opt/les-cocottes-de-diane/prod/docker-compose-prod.yml` |
| `ENV_FILE` | `/opt/les-cocottes-de-diane/staging/.env.staging` | `/opt/les-cocottes-de-diane/prod/.env.prod` |
| `COMPOSE_PROJECT_NAME` | `cocottes-staging` | `cocottes-prod` |
| `DEPLOYMENT_ROOT` | `/opt/les-cocottes-de-diane/staging/deployment` | `/opt/les-cocottes-de-diane/prod/deployment` |
| `API_HEALTH_URL` | `https://dev.api.lescocottesdediane.fr/api/health/ready` | `https://api.lescocottesdediane.fr/api/health/ready` |
| `WEB_HEALTH_URL` | `https://dev.app.lescocottesdediane.fr/health` | `https://app.lescocottesdediane.fr/health` |
| `SHOP_HEALTH_URL` | `https://dev.lescocottesdediane.fr/health` | `https://lescocottesdediane.fr/health` |
| `API_SERVICE` | `api` | `api` |
| `WEB_SERVICE` | `web` | `web` |
| `SHOP_SERVICE` | `shop` | `shop` |
| `MIGRATION_SERVICE` | `migrate` | `migrate` |

`COMPOSE_PROJECT_NAME` doit impérativement rester identique au nom déjà utilisé
pour l'environnement, car il participe au nom du volume `postgres_data`. Le
script compare la valeur configurée aux labels des conteneurs actifs dans le
répertoire Compose et refuse le déploiement en cas de différence. Les anciens
conteneurs arrêtés d'un projet historique ne bloquent pas le déploiement.

## Déroulement d'un déploiement

1. Les trois images sont construites et publiées.
2. Leurs digests sont regroupés dans un unique `release.json` validé.
3. Le job télécharge cet artifact et transfère le manifeste, les scripts et le
   Docker Compose versionné vers un répertoire temporaire du VPS.
4. Le script valide les outils, les chemins, le manifeste, les repositories,
   les digests et la configuration Compose candidate. Le Compose validé est
   ensuite installé atomiquement à son chemin définitif.
5. Le manifeste candidat est copié dans
   `DEPLOYMENT_ROOT/releases/<git-sha>/release.json`.
6. Les quatre services `api`, `web`, `shop` et `migrate` téléchargent les
   références exactes avec `docker compose pull`.
7. `docker compose run --rm migrate` applique les migrations avec l'image API
   de la release. Un échec arrête immédiatement le déploiement avant tout
   remplacement de conteneur.
8. `docker compose up -d --remove-orphans api web shop` démarre la release et
   PostgreSQL via les dépendances Compose, sans relancer le service `migrate`.
9. Le script vérifie d'abord que les conteneurs actifs utilisent exactement
   les trois références par digest du manifeste, puis contrôle successivement
   l'API, le back-office et la boutique. Par défaut, chaque contrôle dispose de
   30 tentatives espacées de 5 secondes, avec des timeouts HTTP bornés.
10. Après les trois succès uniquement, `state/current.json` devient le nouveau
    manifeste et l'ancien `current.json` est copié atomiquement vers
    `state/previous.json`.

Le job production répète les étapes 3 à 10 avec le même artifact après le
succès du staging et l'approbation GitHub éventuelle. Il ne reconstruit rien.

## Endpoints vérifiés

- API : `GET /api/health/ready`. La réponse doit être HTTP 2xx ; l'endpoint
  vérifie PostgreSQL et la configuration Stripe/Resend existante.
- Back-office : `GET /health`, endpoint public déterministe qui retourne
  `{"status":"ok","service":"localco-web"}`.
- Boutique : `GET /health`, endpoint public déterministe qui retourne
  `{"status":"ok","service":"localco-shop"}`.

Les URLs complètes proviennent exclusivement des variables de l'environment
GitHub.

Le chemin `/health` est volontaire : le Caddyfile actuel route `/api/*` du
back-office directement vers l'API NestJS. Utiliser `/api/health` sur ce domaine
vérifierait donc le mauvais conteneur. `/health` passe bien par `prod-web` ou
`staging-web`. Les domaines boutique passent de la même manière par `prod-shop`
ou `staging-shop`.

Le Caddyfile du VPS doit reconstruire les en-têtes transmis à chaque upstream,
notamment `X-Forwarded-For`, au lieu de conserver une valeur fournie par le
client. Reporter le snippet de
[`../deployment/Caddyfile.example`](../deployment/Caddyfile.example) sur toutes
les directives `reverse_proxy`, puis valider et recharger Caddy :

```bash
docker exec <caddy-container> caddy validate --config /etc/caddy/Caddyfile
docker exec <caddy-container> caddy reload --config /etc/caddy/Caddyfile
```

Le hash `basic_auth` de staging et les autres secrets restent exclusivement
dans le Caddyfile réel du VPS et ne doivent pas être copiés dans l'exemple.

## Historique sur le VPS

Chaque environnement possède son propre `DEPLOYMENT_ROOT` :

```text
DEPLOYMENT_ROOT/
├── bin/
│   ├── deploy-release.sh
│   └── release-lib.sh
├── releases/
│   └── <git-sha>/
│       └── release.json
└── state/
    ├── current.json
    └── previous.json
```

Les écritures de `current.json` et `previous.json` utilisent un fichier
temporaire suivi d'un `mv`. Pour connaître la release active :

```bash
jq '{gitSha, workflowRunId, images}' "$DEPLOYMENT_ROOT/state/current.json"
```

## Rollback automatique

Si `docker compose up` ou un health check échoue après remplacement :

1. le workflow affiche les SHA candidat et courant ;
2. il collecte `docker compose ps --all`, les inspections des conteneurs et
   les 200 dernières lignes de logs API/Web/Shop ;
3. il recharge `state/current.json`, qui n'a pas encore été modifié ;
4. il redéploie les trois anciennes images par digest, sans migration ;
5. il revérifie les trois endpoints ;
6. il conserve l'ancien manifeste comme `current.json` ;
7. il termine toujours en échec, même si le rollback a réussi.

Les messages distinguent « déploiement échoué, rollback réussi » et
« déploiement échoué, rollback également échoué ». Au premier déploiement,
l'absence de `current.json` produit un échec explicite sans tentative de
rollback impossible.

## Limite PostgreSQL

Le rollback est exclusivement applicatif. Aucune migration descendante ni
restauration PostgreSQL automatique n'est exécutée. Toutes les migrations de
staging et production doivent suivre une stratégie *expand and contract* et
rester compatibles avec la release applicative précédente pendant la fenêtre
de rollback.

Une suppression ou transformation destructive doit être séparée en plusieurs
releases : ajout compatible, migration des données et du code, puis retrait
ultérieur après expiration de la fenêtre de retour arrière.

## Restauration manuelle d'une release connue

Sur le VPS, choisir un manifeste déjà validé, puis exécuter le script installé
en mode restauration applicative. Ce mode saute volontairement les migrations :

```bash
sudo -u <deploy-user> \
  "$DEPLOYMENT_ROOT/bin/deploy-release.sh" \
  --application-restore \
  --environment <staging|production> \
  --manifest "$DEPLOYMENT_ROOT/releases/<git-sha>/release.json" \
  --compose-source <absolute-compose-path> \
  --compose-file <absolute-compose-path> \
  --env-file <absolute-env-path> \
  --project-name <compose-project> \
  --deployment-root "$DEPLOYMENT_ROOT" \
  --uploads-directory /opt/les-cocottes-de-diane/prod/shared/uploads \
  --api-health-url <api-readiness-url> \
  --web-health-url <web-health-url> \
  --shop-health-url <shop-health-url> \
  --expected-api-repository ghcr.io/<owner>/les-cocottes-api \
  --expected-web-repository ghcr.io/<owner>/les-cocottes-web \
  --expected-shop-repository ghcr.io/<owner>/les-cocottes-shop
```

Après succès, le manifeste restauré devient `current.json` et la release qui
était active devient `previous.json`. Après échec, le script tente de restaurer
la release qui était encore courante et rend un code non nul.

## Protection manuelle de la production dans GitHub

Dans **Settings → Environments → production** :

1. ajouter les approbateurs obligatoires (*required reviewers*) ;
2. désactiver l'auto-approbation si l'organisation propose cette option ;
3. limiter les branches de déploiement à `main` ;
4. créer les quatre secrets SSH spécifiques à la production ;
5. créer les variables production du tableau ci-dessus ;
6. définir `ENVIRONMENT_URL` avec l'URL publique de production.

GitHub bloque alors le job avant l'accès aux secrets de production. Cette
protection ne peut pas être imposée entièrement depuis le workflow versionné.

## Validations locales

```bash
bash -n scripts/deployment/*.sh
shellcheck -x -P scripts/deployment scripts/deployment/*.sh
bash scripts/deployment/test-release-scripts.sh
```

Le test couvre un manifeste valide, un manifeste incomplet, une référence par
tag mutable, l'absence de rollback, la sélection de la release courante pour
un rollback automatique et la sélection de `previous.json`.
