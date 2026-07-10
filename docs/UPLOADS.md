# Persistance et sauvegarde des uploads

L'API enregistre en base des URL relatives stables de la forme
`/uploads/articles/<fichier>`. Les fichiers résident sous `UPLOADS_DIR`; aucune
migration PostgreSQL n'est requise. Sans variable, le comportement local reste
`<process.cwd()>/uploads`.

En conteneur, `UPLOADS_DIR=/app/uploads`. Docker Compose utilise les bind mounts
suivants :

- staging : `/opt/les-cocottes-de-diane/staging/shared/uploads:/app/uploads` ;
- production : `/opt/les-cocottes-de-diane/prod/shared/uploads:/app/uploads`.

Le conteneur s'exécute avec l'utilisateur `node` (UID/GID `1000:1000`). Le
déploiement vérifie que le répertoire hôte existe, appartient à `1000:1000`, a
le mode `0750`, puis contrôle le bind mount réellement attaché au conteneur.

## Première mise en place sur le VPS

Exécuter pour chaque environnement concerné :

```bash
sudo install -d -o 1000 -g 1000 -m 0750 /opt/les-cocottes-de-diane/staging/shared/uploads
sudo install -d -o 1000 -g 1000 -m 0750 /opt/les-cocottes-de-diane/prod/shared/uploads
```

Avant le premier déploiement de cette version, copier les fichiers éventuellement
présents dans l'ancien conteneur. Pour la production, prévoir une courte fenêtre
de maintenance afin d'éviter un upload entre la copie et le remplacement :

```bash
cd /opt/les-cocottes-de-diane/prod
docker compose --project-name cocottes-prod --env-file .env.prod \
  --file docker-compose-prod.yml stop api
docker cp cocottes-prod-api-1:/app/apps/api/uploads/. shared/uploads/
sudo chown -R 1000:1000 shared/uploads
sudo find shared/uploads -type d -exec chmod 0750 {} +
sudo find shared/uploads -type f -exec chmod 0640 {} +
```

Si l'ancien chemin n'existe pas, `docker cp` échoue sans modifier la destination :
le répertoire vide créé précédemment est alors correct. Déclencher immédiatement
le workflow de déploiement. Ne supprimez pas l'ancien conteneur avant d'avoir
contrôlé les fichiers copiés.

Contrôles après déploiement :

```bash
docker compose --project-name cocottes-prod --env-file .env.prod \
  --file docker-compose-prod.yml exec api sh -lc \
  'id && echo "$UPLOADS_DIR" && ls -ld "$UPLOADS_DIR" && touch "$UPLOADS_DIR/.write-test" && rm "$UPLOADS_DIR/.write-test"'
docker inspect cocottes-prod-api-1 --format '{{json .Mounts}}'
```

## Sauvegarde

Le script crée une archive horodatée, la relit, puis crée un fichier SHA-256. Il
ne supprime aucune ancienne sauvegarde.

```bash
sudo bash scripts/uploads/backup-uploads.sh \
  /opt/les-cocottes-de-diane/prod/shared/uploads \
  /opt/les-cocottes-de-diane/prod/backups/uploads
```

Planifier au minimum une sauvegarde quotidienne, conserver 30 jours et copier
les archives et leurs `.sha256` hors du VPS. Sauvegarder PostgreSQL séparément ;
pour une restauration cohérente à un instant précis, conserver dump SQL et
archive uploads issus de la même fenêtre de maintenance.

## Restauration testable et non destructive

Le script exige le checksum, refuse les chemins dangereux, liens et fichiers
spéciaux, applique les droits attendus et déplace l'arborescence actuelle vers
`uploads.before-restore.<date>` au lieu de la supprimer.

```bash
cd /opt/les-cocottes-de-diane/prod
docker compose --project-name cocottes-prod --env-file .env.prod \
  --file docker-compose-prod.yml stop api
sudo bash scripts/uploads/restore-uploads.sh \
  backups/uploads/uploads-2026-07-10T120000Z.tar.gz \
  shared/uploads
docker compose --project-name cocottes-prod --env-file .env.prod \
  --file docker-compose-prod.yml start api
```

Vérifier ensuite une URL d'image connue et les logs API. Supprimer l'arborescence
`before-restore` uniquement après validation fonctionnelle et une sauvegarde.

## Test de persistance

1. Envoyer une image depuis le back-office et noter son URL.
2. Vérifier sa présence sous `shared/uploads/articles` et son téléchargement.
3. Recréer uniquement l'API avec `docker compose ... up -d --force-recreate api`.
4. Vérifier que le même fichier et la même URL sont toujours disponibles.
5. Effectuer une sauvegarde, modifier une copie de test, restaurer l'archive et
   comparer son SHA-256.

`docker compose down -v` ne supprime pas ce bind mount, mais détruit le volume
PostgreSQL nommé : cette commande reste interdite en production. Une suppression
manuelle de `shared/uploads` détruit les images. Les sauvegardes hors VPS sont la
protection contre cette erreur et contre la perte du serveur.
