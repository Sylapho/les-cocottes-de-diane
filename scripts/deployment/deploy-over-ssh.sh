#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<'EOF'
Usage: deploy-over-ssh.sh [deploy-release.sh options]

The following environment variables are required:
  DEPLOY_SSH_HOST
  DEPLOY_SSH_PORT
  DEPLOY_SSH_USER
  DEPLOY_SSH_PRIVATE_KEY
EOF
}

for required_variable in \
  DEPLOY_SSH_HOST DEPLOY_SSH_PORT DEPLOY_SSH_USER DEPLOY_SSH_PRIVATE_KEY; do
  if [[ -z "${!required_variable:-}" ]]; then
    printf 'ERROR: Missing required environment variable: %s\n' \
      "$required_variable" >&2
    usage >&2
    exit 2
  fi
done

manifest_path=''
compose_source_path=''
arguments=("$@")
declare -A option_values=()
for ((index = 0; index < ${#arguments[@]}; index += 1)); do
  if [[
    "${arguments[index]}" == --* &&
    -n "${arguments[index + 1]:-}" &&
    "${arguments[index + 1]}" != --*
  ]]; then
    option_values["${arguments[index]}"]="${arguments[index + 1]}"
  fi
done

for required_option in \
  --environment --manifest --compose-source --compose-file --env-file \
  --project-name --deployment-root --api-health-url --web-health-url \
  --shop-health-url --expected-api-repository --expected-web-repository \
  --expected-shop-repository; do
  if [[ -z "${option_values[$required_option]:-}" ]]; then
    printf 'ERROR: Missing required deployment option before SSH: %s\n' \
      "$required_option" >&2
    exit 2
  fi
done

manifest_path="${option_values[--manifest]}"
compose_source_path="${option_values[--compose-source]}"

if [[ -z "$manifest_path" || ! -f "$manifest_path" ]]; then
  printf 'ERROR: --manifest must reference an existing local file\n' >&2
  exit 2
fi

if [[ -z "$compose_source_path" || ! -f "$compose_source_path" ]]; then
  printf 'ERROR: --compose-source must reference an existing local file\n' >&2
  exit 2
fi

for required_command in ssh scp ssh-keyscan; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    printf 'ERROR: Required command is not installed: %s\n' \
      "$required_command" >&2
    exit 1
  fi
done

temporary_directory="$(mktemp -d)"
remote_directory="/tmp/les-cocottes-de-diane-deploy-${GITHUB_RUN_ID:-manual}-$$"
private_key_path="${temporary_directory}/deploy_key"
known_hosts_path="${temporary_directory}/known_hosts"
trap 'rm -rf "$temporary_directory"' EXIT

printf '%s\n' "$DEPLOY_SSH_PRIVATE_KEY" > "$private_key_path"
chmod 600 "$private_key_path"
ssh-keyscan -p "$DEPLOY_SSH_PORT" "$DEPLOY_SSH_HOST" > "$known_hosts_path"
chmod 600 "$known_hosts_path"

ssh_options=(
  -i "$private_key_path"
  -p "$DEPLOY_SSH_PORT"
  -o "UserKnownHostsFile=${known_hosts_path}"
  -o StrictHostKeyChecking=yes
)
remote_host="${DEPLOY_SSH_USER}@${DEPLOY_SSH_HOST}"

# The remote path is generated locally from the numeric run and process IDs.
# shellcheck disable=SC2029
ssh "${ssh_options[@]}" "$remote_host" "mkdir -p '$remote_directory'"
scp \
  -i "$private_key_path" \
  -P "$DEPLOY_SSH_PORT" \
  -o "UserKnownHostsFile=${known_hosts_path}" \
  -o StrictHostKeyChecking=yes \
  "$manifest_path" \
  "$compose_source_path" \
  "${SCRIPT_DIRECTORY}/deploy-release.sh" \
  "${SCRIPT_DIRECTORY}/release-lib.sh" \
  "${remote_host}:${remote_directory}/"

remote_arguments=("${arguments[@]}")
for ((index = 0; index < ${#remote_arguments[@]}; index += 1)); do
  if [[ "${remote_arguments[index]}" == '--manifest' ]]; then
    remote_arguments[index + 1]="${remote_directory}/$(basename "$manifest_path")"
  elif [[ "${remote_arguments[index]}" == '--compose-source' ]]; then
    remote_arguments[index + 1]="${remote_directory}/$(basename "$compose_source_path")"
  fi
done

printf -v remote_command '%q ' \
  bash "${remote_directory}/deploy-release.sh" "${remote_arguments[@]}"

set +e
# remote_command is built with printf %q for each argument.
# shellcheck disable=SC2029
ssh "${ssh_options[@]}" "$remote_host" "$remote_command"
deployment_status=$?
set -e

# shellcheck disable=SC2029
ssh "${ssh_options[@]}" "$remote_host" \
  "rm -rf -- '$remote_directory'" || true

exit "$deployment_status"
