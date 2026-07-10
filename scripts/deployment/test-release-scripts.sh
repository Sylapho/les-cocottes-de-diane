#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=release-lib.sh
source "${SCRIPT_DIRECTORY}/release-lib.sh"

API_REPOSITORY='ghcr.io/example/les-cocottes-api'
WEB_REPOSITORY='ghcr.io/example/les-cocottes-web'
SHOP_REPOSITORY='ghcr.io/example/les-cocottes-shop'
SHA='0123456789abcdef0123456789abcdef01234567'
DIGEST='sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
TEMPORARY_DIRECTORY="$(mktemp -d)"
trap 'rm -rf "$TEMPORARY_DIRECTORY"' EXIT

expect_failure() {
  local description="$1"
  shift

  if "$@" >/dev/null 2>&1; then
    release_error "Expected failure: ${description}"
    exit 1
  fi
}

VALID_MANIFEST="${TEMPORARY_DIRECTORY}/valid.json"
bash "${SCRIPT_DIRECTORY}/create-release-manifest.sh" \
  --git-sha "$SHA" \
  --workflow-run-id '123456789' \
  --api-image "${API_REPOSITORY}@${DIGEST}" \
  --web-image "${WEB_REPOSITORY}@${DIGEST}" \
  --shop-image "${SHOP_REPOSITORY}@${DIGEST}" \
  --expected-api-repository "$API_REPOSITORY" \
  --expected-web-repository "$WEB_REPOSITORY" \
  --expected-shop-repository "$SHOP_REPOSITORY" \
  --output "$VALID_MANIFEST" >/dev/null

release_validate_manifest \
  "$VALID_MANIFEST" "$API_REPOSITORY" "$WEB_REPOSITORY" "$SHOP_REPOSITORY"

INCOMPLETE_MANIFEST="${TEMPORARY_DIRECTORY}/incomplete.json"
jq 'del(.images.shop)' "$VALID_MANIFEST" > "$INCOMPLETE_MANIFEST"
expect_failure 'incomplete manifest' \
  release_validate_manifest \
  "$INCOMPLETE_MANIFEST" "$API_REPOSITORY" "$WEB_REPOSITORY" "$SHOP_REPOSITORY"

MUTABLE_MANIFEST="${TEMPORARY_DIRECTORY}/mutable.json"
jq --arg image "${API_REPOSITORY}:staging" '.images.api = $image' \
  "$VALID_MANIFEST" > "$MUTABLE_MANIFEST"
expect_failure 'mutable image tag' \
  release_validate_manifest \
  "$MUTABLE_MANIFEST" "$API_REPOSITORY" "$WEB_REPOSITORY" "$SHOP_REPOSITORY"

STATE_DIRECTORY="${TEMPORARY_DIRECTORY}/state"
mkdir -p "$STATE_DIRECTORY"
expect_failure 'missing rollback manifest' \
  release_select_rollback_manifest "$STATE_DIRECTORY"
expect_failure 'missing previous manifest' \
  release_select_previous_manifest "$STATE_DIRECTORY"

cp "$VALID_MANIFEST" "${STATE_DIRECTORY}/current.json"
selected_manifest="$(release_select_rollback_manifest "$STATE_DIRECTORY")"
if [[ "$selected_manifest" != "${STATE_DIRECTORY}/current.json" ]]; then
  release_error 'Rollback selection did not return the current manifest'
  exit 1
fi

cp "$VALID_MANIFEST" "${STATE_DIRECTORY}/previous.json"
selected_manifest="$(release_select_previous_manifest "$STATE_DIRECTORY")"
if [[ "$selected_manifest" != "${STATE_DIRECTORY}/previous.json" ]]; then
  release_error 'Previous release selection did not return previous.json'
  exit 1
fi

printf 'All release script tests passed\n'
