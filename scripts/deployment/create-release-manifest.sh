#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=release-lib.sh
source "${SCRIPT_DIRECTORY}/release-lib.sh"

usage() {
  cat <<'EOF'
Usage: create-release-manifest.sh \
  --git-sha SHA \
  --workflow-run-id ID \
  --api-image REPOSITORY@sha256:DIGEST \
  --web-image REPOSITORY@sha256:DIGEST \
  --shop-image REPOSITORY@sha256:DIGEST \
  --expected-api-repository REPOSITORY \
  --expected-web-repository REPOSITORY \
  --expected-shop-repository REPOSITORY \
  --output PATH
EOF
}

GIT_SHA=''
WORKFLOW_RUN_ID=''
API_IMAGE=''
WEB_IMAGE=''
SHOP_IMAGE=''
EXPECTED_API_REPOSITORY=''
EXPECTED_WEB_REPOSITORY=''
EXPECTED_SHOP_REPOSITORY=''
OUTPUT_PATH=''

while (($# > 0)); do
  case "$1" in
    --git-sha) GIT_SHA="${2:-}"; shift 2 ;;
    --workflow-run-id) WORKFLOW_RUN_ID="${2:-}"; shift 2 ;;
    --api-image) API_IMAGE="${2:-}"; shift 2 ;;
    --web-image) WEB_IMAGE="${2:-}"; shift 2 ;;
    --shop-image) SHOP_IMAGE="${2:-}"; shift 2 ;;
    --expected-api-repository) EXPECTED_API_REPOSITORY="${2:-}"; shift 2 ;;
    --expected-web-repository) EXPECTED_WEB_REPOSITORY="${2:-}"; shift 2 ;;
    --expected-shop-repository) EXPECTED_SHOP_REPOSITORY="${2:-}"; shift 2 ;;
    --output) OUTPUT_PATH="${2:-}"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) release_error "Unknown argument: $1"; usage >&2; exit 2 ;;
  esac
done

for required_value in \
  GIT_SHA WORKFLOW_RUN_ID API_IMAGE WEB_IMAGE SHOP_IMAGE \
  EXPECTED_API_REPOSITORY EXPECTED_WEB_REPOSITORY EXPECTED_SHOP_REPOSITORY \
  OUTPUT_PATH; do
  if [[ -z "${!required_value}" ]]; then
    release_error "Missing required argument for ${required_value}"
    usage >&2
    exit 2
  fi
done

release_require_command jq

if [[ ! "$GIT_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  release_error 'Git SHA must contain exactly 40 lowercase hexadecimal characters'
  exit 1
fi

release_validate_image "$API_IMAGE" "$EXPECTED_API_REPOSITORY"
release_validate_image "$WEB_IMAGE" "$EXPECTED_WEB_REPOSITORY"
release_validate_image "$SHOP_IMAGE" "$EXPECTED_SHOP_REPOSITORY"

mkdir -p "$(dirname "$OUTPUT_PATH")"
temporary_path="${OUTPUT_PATH}.tmp.$$"

jq -n \
  --arg gitSha "$GIT_SHA" \
  --arg workflowRunId "$WORKFLOW_RUN_ID" \
  --arg createdAt "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  --arg apiImage "$API_IMAGE" \
  --arg webImage "$WEB_IMAGE" \
  --arg shopImage "$SHOP_IMAGE" \
  '{
    schemaVersion: 1,
    gitSha: $gitSha,
    workflowRunId: $workflowRunId,
    createdAt: $createdAt,
    images: {
      api: $apiImage,
      web: $webImage,
      shop: $shopImage
    }
  }' > "$temporary_path"

release_validate_manifest \
  "$temporary_path" \
  "$EXPECTED_API_REPOSITORY" \
  "$EXPECTED_WEB_REPOSITORY" \
  "$EXPECTED_SHOP_REPOSITORY"

mv -f "$temporary_path" "$OUTPUT_PATH"
printf 'Created release manifest: %s\n' "$OUTPUT_PATH"
