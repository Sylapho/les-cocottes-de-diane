#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=release-lib.sh
source "${SCRIPT_DIRECTORY}/release-lib.sh"

if (($# != 4)); then
  printf 'Usage: %s MANIFEST EXPECTED_API_REPOSITORY EXPECTED_WEB_REPOSITORY EXPECTED_SHOP_REPOSITORY\n' "$0" >&2
  exit 2
fi

release_validate_manifest "$1" "$2" "$3" "$4"
printf 'Release manifest is valid: %s\n' "$1"
