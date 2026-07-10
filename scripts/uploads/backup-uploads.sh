#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  printf 'Usage: backup-uploads.sh SOURCE_DIRECTORY BACKUP_DIRECTORY\n'
}

if (($# != 2)); then
  usage >&2
  exit 2
fi

source_directory="${1%/}"
backup_directory="${2%/}"

if [[ ! -d "$source_directory" ]]; then
  printf 'ERROR: Uploads source directory does not exist: %s\n' "$source_directory" >&2
  exit 1
fi

for command_name in tar sha256sum mktemp date install mv; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'ERROR: Required command is not installed: %s\n' "$command_name" >&2
    exit 1
  fi
done

install -d -m 0750 "$backup_directory"
timestamp="$(date -u +%Y-%m-%dT%H%M%SZ)"
archive_name="uploads-${timestamp}.tar.gz"
archive_path="${backup_directory}/${archive_name}"
temporary_archive="$(mktemp "${backup_directory}/.${archive_name}.XXXXXX")"
trap 'rm -f "$temporary_archive"' EXIT

tar -C "$(dirname "$source_directory")" -czf "$temporary_archive" \
  "$(basename "$source_directory")"
tar -tzf "$temporary_archive" >/dev/null
mv "$temporary_archive" "$archive_path"
trap - EXIT

(
  cd "$backup_directory"
  sha256sum "$archive_name" > "${archive_name}.sha256"
)

printf 'Uploads backup created: %s\n' "$archive_path"
printf 'Checksum created: %s.sha256\n' "$archive_path"
