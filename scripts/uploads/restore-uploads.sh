#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  printf 'Usage: restore-uploads.sh ARCHIVE TARGET_DIRECTORY\n'
}

if (($# != 2)); then
  usage >&2
  exit 2
fi

archive_path="$1"
target_directory="${2%/}"
uploads_uid="${UPLOADS_UID:-1000}"
uploads_gid="${UPLOADS_GID:-1000}"

if [[ ! -f "$archive_path" ]]; then
  printf 'ERROR: Backup archive does not exist: %s\n' "$archive_path" >&2
  exit 1
fi

for command_name in tar sha256sum mktemp date chown chmod find mv; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'ERROR: Required command is not installed: %s\n' "$command_name" >&2
    exit 1
  fi
done

archive_directory="$(cd "$(dirname "$archive_path")" && pwd)"
archive_name="$(basename "$archive_path")"
archive_path="${archive_directory}/${archive_name}"
checksum_path="${archive_path}.sha256"

if [[ -f "$checksum_path" ]]; then
  (cd "$archive_directory" && sha256sum --check "$(basename "$checksum_path")")
else
  printf 'ERROR: Checksum file does not exist: %s\n' "$checksum_path" >&2
  exit 1
fi

while IFS= read -r entry; do
  if [[ "$entry" == /* || "$entry" == *\\* || "$entry" =~ (^|/)\.\.(/|$) || "$entry" != uploads && "$entry" != uploads/* ]]; then
    printf 'ERROR: Unsafe archive entry: %s\n' "$entry" >&2
    exit 1
  fi
done < <(tar -tzf "$archive_path")

while IFS= read -r entry_type; do
  if [[ "$entry_type" != '-' && "$entry_type" != 'd' ]]; then
    printf 'ERROR: Archive contains links or special files\n' >&2
    exit 1
  fi
done < <(tar -tvzf "$archive_path" | cut -c1)

target_parent="$(dirname "$target_directory")"
mkdir -p "$target_parent"
temporary_directory="$(mktemp -d "${target_parent}/.uploads-restore.XXXXXX")"
preserved_directory=''

cleanup() {
  local status=$?
  rm -rf "$temporary_directory"
  if ((status != 0)) && [[ -n "$preserved_directory" && ! -e "$target_directory" ]]; then
    mv "$preserved_directory" "$target_directory"
  fi
  exit "$status"
}
trap cleanup EXIT

tar --no-same-owner --no-same-permissions -xzf "$archive_path" \
  -C "$temporary_directory"

if [[ ! -d "${temporary_directory}/uploads" ]]; then
  printf 'ERROR: Archive does not contain a top-level uploads directory\n' >&2
  exit 1
fi

chown -R "${uploads_uid}:${uploads_gid}" "${temporary_directory}/uploads"
find "${temporary_directory}/uploads" -type d -exec chmod 0750 {} +
find "${temporary_directory}/uploads" -type f -exec chmod 0640 {} +

if [[ -e "$target_directory" ]]; then
  preserved_directory="${target_directory}.before-restore.$(date -u +%Y-%m-%dT%H%M%SZ)"
  mv "$target_directory" "$preserved_directory"
fi

mv "${temporary_directory}/uploads" "$target_directory"
printf 'Uploads restored to: %s\n' "$target_directory"
if [[ -n "$preserved_directory" ]]; then
  printf 'Previous uploads preserved at: %s\n' "$preserved_directory"
fi
