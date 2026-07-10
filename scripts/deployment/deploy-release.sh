#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=release-lib.sh
source "${SCRIPT_DIRECTORY}/release-lib.sh"

usage() {
  cat <<'EOF'
Usage: deploy-release.sh [options]

Required options:
  --environment NAME
  --manifest PATH
  --compose-source PATH
  --compose-file PATH
  --env-file PATH
  --project-name NAME
  --deployment-root PATH
  --uploads-directory PATH
  --api-health-url URL
  --web-health-url URL
  --shop-health-url URL
  --expected-api-repository REPOSITORY
  --expected-web-repository REPOSITORY
  --expected-shop-repository REPOSITORY

Optional service names:
  --api-service NAME        Default: api
  --web-service NAME        Default: web
  --shop-service NAME       Default: shop
  --migration-service NAME  Default: migrate

Restore option:
  --application-restore     Skip migrations when manually restoring a known
                            release. Never rolls back the PostgreSQL schema.
EOF
}

ENVIRONMENT=''
MANIFEST_PATH=''
COMPOSE_SOURCE=''
COMPOSE_FILE=''
ENV_FILE=''
PROJECT_NAME=''
DEPLOYMENT_ROOT=''
UPLOADS_DIRECTORY=''
API_HEALTH_URL=''
WEB_HEALTH_URL=''
SHOP_HEALTH_URL=''
EXPECTED_API_REPOSITORY=''
EXPECTED_WEB_REPOSITORY=''
EXPECTED_SHOP_REPOSITORY=''
API_SERVICE='api'
WEB_SERVICE='web'
SHOP_SERVICE='shop'
MIGRATION_SERVICE='migrate'
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-30}"
HEALTH_DELAY_SECONDS="${HEALTH_DELAY_SECONDS:-5}"
RUN_MIGRATIONS=true

while (($# > 0)); do
  case "$1" in
    --environment) ENVIRONMENT="${2:-}"; shift 2 ;;
    --manifest) MANIFEST_PATH="${2:-}"; shift 2 ;;
    --compose-source) COMPOSE_SOURCE="${2:-}"; shift 2 ;;
    --compose-file) COMPOSE_FILE="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --project-name) PROJECT_NAME="${2:-}"; shift 2 ;;
    --deployment-root) DEPLOYMENT_ROOT="${2:-}"; shift 2 ;;
    --uploads-directory) UPLOADS_DIRECTORY="${2:-}"; shift 2 ;;
    --api-health-url) API_HEALTH_URL="${2:-}"; shift 2 ;;
    --web-health-url) WEB_HEALTH_URL="${2:-}"; shift 2 ;;
    --shop-health-url) SHOP_HEALTH_URL="${2:-}"; shift 2 ;;
    --expected-api-repository) EXPECTED_API_REPOSITORY="${2:-}"; shift 2 ;;
    --expected-web-repository) EXPECTED_WEB_REPOSITORY="${2:-}"; shift 2 ;;
    --expected-shop-repository) EXPECTED_SHOP_REPOSITORY="${2:-}"; shift 2 ;;
    --api-service) API_SERVICE="${2:-}"; shift 2 ;;
    --web-service) WEB_SERVICE="${2:-}"; shift 2 ;;
    --shop-service) SHOP_SERVICE="${2:-}"; shift 2 ;;
    --migration-service) MIGRATION_SERVICE="${2:-}"; shift 2 ;;
    --application-restore) RUN_MIGRATIONS=false; shift ;;
    --help|-h) usage; exit 0 ;;
    *) release_error "Unknown argument: $1"; usage >&2; exit 2 ;;
  esac
done

for required_value in \
  ENVIRONMENT MANIFEST_PATH COMPOSE_SOURCE COMPOSE_FILE ENV_FILE PROJECT_NAME DEPLOYMENT_ROOT UPLOADS_DIRECTORY \
  API_HEALTH_URL WEB_HEALTH_URL SHOP_HEALTH_URL EXPECTED_API_REPOSITORY \
  EXPECTED_WEB_REPOSITORY EXPECTED_SHOP_REPOSITORY; do
  if [[ -z "${!required_value}" ]]; then
    release_error "Missing required argument for ${required_value}"
    usage >&2
    exit 2
  fi
done

for required_command in docker jq curl grep stat; do
  release_require_command "$required_command"
done

if [[ ! -d "$UPLOADS_DIRECTORY" ]]; then
  release_error "Uploads directory does not exist: ${UPLOADS_DIRECTORY}"
  release_error "Create it before deploying: sudo install -d -o 1000 -g 1000 -m 0750 '${UPLOADS_DIRECTORY}'"
  exit 1
fi

uploads_owner="$(stat -c '%u:%g' "$UPLOADS_DIRECTORY")"
uploads_mode="$(stat -c '%a' "$UPLOADS_DIRECTORY")"
if [[ "$uploads_owner" != '1000:1000' || "$uploads_mode" != '750' ]]; then
  release_error "Uploads directory must be owned by 1000:1000 with mode 0750; found ${uploads_owner} mode ${uploads_mode}"
  exit 1
fi

if [[ ! -f "$COMPOSE_SOURCE" ]]; then
  release_error "Candidate Docker Compose file does not exist: ${COMPOSE_SOURCE}"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  release_error "Environment file does not exist: ${ENV_FILE}"
  exit 1
fi

STATE_DIRECTORY="${DEPLOYMENT_ROOT}/state"
RELEASES_DIRECTORY="${DEPLOYMENT_ROOT}/releases"
BIN_DIRECTORY="${DEPLOYMENT_ROOT}/bin"
mkdir -p "$STATE_DIRECTORY" "$RELEASES_DIRECTORY" "$BIN_DIRECTORY"

release_atomic_copy \
  "${SCRIPT_DIRECTORY}/deploy-release.sh" \
  "${BIN_DIRECTORY}/deploy-release.sh"
release_atomic_copy \
  "${SCRIPT_DIRECTORY}/release-lib.sh" \
  "${BIN_DIRECTORY}/release-lib.sh"
chmod 700 "${BIN_DIRECTORY}/deploy-release.sh"

release_load_manifest \
  "$MANIFEST_PATH" \
  "$EXPECTED_API_REPOSITORY" \
  "$EXPECTED_WEB_REPOSITORY" \
  "$EXPECTED_SHOP_REPOSITORY"

APP_ENV_FILE="$ENV_FILE"
export APP_ENV_FILE

existing_project_names="$(
  docker ps \
    --filter "label=com.docker.compose.project.working_dir=$(dirname "$COMPOSE_FILE")" \
    --format '{{.Label "com.docker.compose.project"}}'
)"
if [[ -n "$existing_project_names" ]]; then
  while IFS= read -r existing_project_name; do
    if [[ -n "$existing_project_name" && "$existing_project_name" != "$PROJECT_NAME" ]]; then
      release_error "Configured Compose project ${PROJECT_NAME} does not match existing project ${existing_project_name} in $(dirname "$COMPOSE_FILE")"
      release_error 'Refusing to continue because a different project name could select a different PostgreSQL volume'
      exit 1
    fi
  done <<< "$existing_project_names"
fi

CANDIDATE_COMPOSE=(
  docker compose
  --project-name "$PROJECT_NAME"
  --env-file "$ENV_FILE"
  --file "$COMPOSE_SOURCE"
)

if ! "${CANDIDATE_COMPOSE[@]}" config --quiet; then
  release_error "Candidate Docker Compose configuration is invalid: ${COMPOSE_SOURCE}"
  exit 1
fi

for required_service in \
  "$API_SERVICE" "$WEB_SERVICE" "$SHOP_SERVICE" "$MIGRATION_SERVICE"; do
  if ! "${CANDIDATE_COMPOSE[@]}" config --services | grep -Fxq "$required_service"; then
    release_error "Candidate Docker Compose is missing service: ${required_service}"
    exit 1
  fi
done

release_atomic_copy "$COMPOSE_SOURCE" "$COMPOSE_FILE"

CANDIDATE_RELEASE_DIRECTORY="${RELEASES_DIRECTORY}/${RELEASE_GIT_SHA}"
CANDIDATE_MANIFEST="${CANDIDATE_RELEASE_DIRECTORY}/release.json"
CURRENT_MANIFEST="${STATE_DIRECTORY}/current.json"
PREVIOUS_MANIFEST="${STATE_DIRECTORY}/previous.json"
mkdir -p "$CANDIDATE_RELEASE_DIRECTORY"
release_atomic_copy "$MANIFEST_PATH" "$CANDIDATE_MANIFEST"

COMPOSE=(
  docker compose
  --project-name "$PROJECT_NAME"
  --env-file "$ENV_FILE"
  --file "$COMPOSE_FILE"
)


print_release() {
  local label="$1"
  local manifest_path="$2"

  if [[ -f "$manifest_path" ]]; then
    printf '%s SHA: %s\n' "$label" "$(jq -r '.gitSha' "$manifest_path")"
  else
    printf '%s SHA: none\n' "$label"
  fi
}

collect_diagnostics() {
  printf '\nDeployment diagnostics for %s\n' "$ENVIRONMENT" >&2
  print_release 'Candidate' "$CANDIDATE_MANIFEST" >&2
  print_release 'Current' "$CURRENT_MANIFEST" >&2
  "${COMPOSE[@]}" ps --all >&2 || true
  "${COMPOSE[@]}" logs --no-color --tail=200 \
    "$API_SERVICE" "$WEB_SERVICE" "$SHOP_SERVICE" >&2 || true

  local container_ids
  container_ids="$("${COMPOSE[@]}" ps --all --quiet 2>/dev/null || true)"
  if [[ -n "$container_ids" ]]; then
    # shellcheck disable=SC2086
    docker inspect $container_ids >&2 || true
  fi
}

wait_for_health() {
  local service_name="$1"
  local health_url="$2"
  local attempt

  for ((attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt += 1)); do
    if curl --fail --silent --show-error \
      --connect-timeout 5 --max-time 10 "$health_url" >/dev/null; then
      printf '%s health check succeeded (%s)\n' "$service_name" "$health_url"
      return 0
    fi

    printf '%s health check attempt %d/%d failed; retrying in %ss\n' \
      "$service_name" "$attempt" "$HEALTH_ATTEMPTS" "$HEALTH_DELAY_SECONDS" >&2
    sleep "$HEALTH_DELAY_SECONDS"
  done

  release_error "${service_name} did not become healthy: ${health_url}"
  return 1
}

verify_release_health() {
  verify_running_images &&
    verify_uploads_mount &&
    wait_for_health 'API readiness' "$API_HEALTH_URL" &&
    wait_for_health 'Back-office' "$WEB_HEALTH_URL" &&
    wait_for_health 'Shop' "$SHOP_HEALTH_URL"
}

verify_uploads_mount() {
  local container_id
  container_id="$("${COMPOSE[@]}" ps --quiet "$API_SERVICE")"

  if [[ -z "$container_id" ]] || ! docker inspect "$container_id" | jq --exit-status \
    --arg source "$UPLOADS_DIRECTORY" '
      .[0].Mounts
      | any(.Type == "bind" and .Source == $source and .Destination == "/app/uploads" and .RW == true)
    ' >/dev/null; then
    release_error "API does not have the expected writable uploads bind mount: ${UPLOADS_DIRECTORY} -> /app/uploads"
    return 1
  fi

  printf 'API uploads bind mount is writable and points to %s\n' "$UPLOADS_DIRECTORY"
}

verify_service_image() {
  local service_name="$1"
  local expected_image="$2"
  local container_id
  local container_state
  local configured_image
  local -a container_ids=()

  mapfile -t container_ids < <("${COMPOSE[@]}" ps --quiet "$service_name")
  if ((${#container_ids[@]} == 0)); then
    release_error "No container is running for Compose service: ${service_name}"
    return 1
  fi

  for container_id in "${container_ids[@]}"; do
    container_state="$(docker inspect --format '{{.State.Running}}' "$container_id")"
    configured_image="$(docker inspect --format '{{.Config.Image}}' "$container_id")"

    if [[ "$container_state" != true ]]; then
      release_error "Container is not running for service ${service_name}: ${container_id}"
      return 1
    fi

    if [[ "$configured_image" != "$expected_image" ]]; then
      release_error "Service ${service_name} runs ${configured_image}, expected ${expected_image}"
      return 1
    fi
  done

  printf '%s runs the expected immutable image\n' "$service_name"
}

verify_running_images() {
  verify_service_image "$API_SERVICE" "$API_IMAGE" &&
    verify_service_image "$WEB_SERVICE" "$WEB_IMAGE" &&
    verify_service_image "$SHOP_SERVICE" "$SHOP_IMAGE"
}

pull_release_images() {
  "${COMPOSE[@]}" pull \
    "$API_SERVICE" "$WEB_SERVICE" "$SHOP_SERVICE" "$MIGRATION_SERVICE"
}

start_release() {
  "${COMPOSE[@]}" up --detach --remove-orphans \
    "$API_SERVICE" "$WEB_SERVICE" "$SHOP_SERVICE"
}

rollback_release() {
  local rollback_manifest

  if ! rollback_manifest="$(release_select_rollback_manifest "$STATE_DIRECTORY")"; then
    release_error 'Deployment failed and no rollback release is available'
    return 1
  fi

  printf 'Rolling back %s to SHA %s\n' \
    "$ENVIRONMENT" "$(jq -r '.gitSha' "$rollback_manifest")" >&2

  release_load_manifest \
    "$rollback_manifest" \
    "$EXPECTED_API_REPOSITORY" \
    "$EXPECTED_WEB_REPOSITORY" \
    "$EXPECTED_SHOP_REPOSITORY" || return 1

  pull_release_images || return 1
  start_release || return 1
  verify_release_health || return 1

  printf 'Deployment failed, rollback succeeded; the workflow remains failed\n' >&2
  return 0
}

printf 'Deploying SHA %s to %s from workflow run %s\n' \
  "$RELEASE_GIT_SHA" "$ENVIRONMENT" "$RELEASE_WORKFLOW_RUN_ID"

pull_release_images

if [[ "$RUN_MIGRATIONS" == true ]]; then
  printf 'Running database migrations with API image %s\n' "$API_IMAGE"
  if ! "${COMPOSE[@]}" run --rm "$MIGRATION_SERVICE"; then
    release_error 'Database migrations failed; running containers and release state were not replaced'
    collect_diagnostics
    exit 1
  fi
else
  printf 'Application restore mode: PostgreSQL migrations are intentionally skipped\n'
fi

if ! start_release || ! verify_release_health; then
  release_error 'Candidate release failed after container replacement; starting application rollback'
  collect_diagnostics

  if rollback_release; then
    exit 1
  fi

  release_error 'Deployment failed and rollback also failed'
  collect_diagnostics
  exit 1
fi

if [[ -f "$CURRENT_MANIFEST" ]]; then
  release_atomic_copy "$CURRENT_MANIFEST" "$PREVIOUS_MANIFEST"
fi
release_atomic_copy "$CANDIDATE_MANIFEST" "$CURRENT_MANIFEST"

printf 'Deployment succeeded; SHA %s is now current on %s\n' \
  "$RELEASE_GIT_SHA" "$ENVIRONMENT"
