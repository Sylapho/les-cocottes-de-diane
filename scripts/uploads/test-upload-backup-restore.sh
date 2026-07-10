#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
temporary_directory="$(mktemp -d)"
trap 'rm -rf "$temporary_directory"' EXIT

uploads_directory="${temporary_directory}/uploads"
backup_directory="${temporary_directory}/backups"
mkdir -p "${uploads_directory}/articles"
printf 'original image bytes' > "${uploads_directory}/articles/example.jpg"

bash "${SCRIPT_DIRECTORY}/backup-uploads.sh" \
  "$uploads_directory" "$backup_directory"
archive_path="$(find "$backup_directory" -name 'uploads-*.tar.gz' -type f)"

printf 'changed image bytes' > "${uploads_directory}/articles/example.jpg"
UPLOADS_UID="$(id -u)" UPLOADS_GID="$(id -g)" \
  bash "${SCRIPT_DIRECTORY}/restore-uploads.sh" \
    "$archive_path" "$uploads_directory"

if [[ "$(cat "${uploads_directory}/articles/example.jpg")" != 'original image bytes' ]]; then
  printf 'ERROR: Restored upload content does not match the backup\n' >&2
  exit 1
fi

if ! find "$temporary_directory" -maxdepth 1 \
  -name 'uploads.before-restore.*' -type d | grep -q .; then
  printf 'ERROR: Restore did not preserve the previous uploads directory\n' >&2
  exit 1
fi

printf 'Uploads backup and restore test passed\n'
