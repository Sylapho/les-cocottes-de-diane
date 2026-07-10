#!/usr/bin/env bash

release_error() {
  printf 'ERROR: %s\n' "$*" >&2
}

release_require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    release_error "Required command is not installed: ${command_name}"
    return 1
  fi
}

release_validate_image() {
  local image="$1"
  local expected_repository="$2"
  local digest

  if [[ "$image" != "${expected_repository}@"* ]]; then
    release_error "Image must use the expected repository and an immutable sha256 digest: ${expected_repository}@sha256:<64 lowercase hex characters>"
    return 1
  fi

  digest="${image#"${expected_repository}@"}"
  if [[ ! "$digest" =~ ^sha256:[0-9a-f]{64}$ ]]; then
    release_error "Image must use the expected repository and an immutable sha256 digest: ${expected_repository}@sha256:<64 lowercase hex characters>"
    return 1
  fi
}

release_validate_manifest() {
  local manifest_path="$1"
  local expected_api_repository="$2"
  local expected_web_repository="$3"
  local expected_shop_repository="$4"
  local api_image
  local web_image
  local shop_image

  release_require_command jq || return 1

  if [[ ! -f "$manifest_path" ]]; then
    release_error "Release manifest does not exist: ${manifest_path}"
    return 1
  fi

  if ! jq -e '
    type == "object" and
    .schemaVersion == 1 and
    (.gitSha | type == "string" and test("^[0-9a-f]{40}$")) and
    (.workflowRunId | type == "string" and length > 0) and
    (.createdAt | type == "string" and test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T")) and
    (.images | type == "object") and
    (.images.api | type == "string") and
    (.images.web | type == "string") and
    (.images.shop | type == "string") and
    ((.images | keys | sort) == ["api", "shop", "web"])
  ' "$manifest_path" >/dev/null; then
    release_error "Release manifest has an invalid structure: ${manifest_path}"
    return 1
  fi

  api_image="$(jq -er '.images.api' "$manifest_path")"
  web_image="$(jq -er '.images.web' "$manifest_path")"
  shop_image="$(jq -er '.images.shop' "$manifest_path")"

  release_validate_image "$api_image" "$expected_api_repository" || return 1
  release_validate_image "$web_image" "$expected_web_repository" || return 1
  release_validate_image "$shop_image" "$expected_shop_repository" || return 1
}

release_load_manifest() {
  local manifest_path="$1"
  local expected_api_repository="$2"
  local expected_web_repository="$3"
  local expected_shop_repository="$4"

  release_validate_manifest \
    "$manifest_path" \
    "$expected_api_repository" \
    "$expected_web_repository" \
    "$expected_shop_repository" || return 1

  RELEASE_GIT_SHA="$(jq -er '.gitSha' "$manifest_path")"
  RELEASE_WORKFLOW_RUN_ID="$(jq -er '.workflowRunId' "$manifest_path")"
  API_IMAGE="$(jq -er '.images.api' "$manifest_path")"
  WEB_IMAGE="$(jq -er '.images.web' "$manifest_path")"
  SHOP_IMAGE="$(jq -er '.images.shop' "$manifest_path")"

  export RELEASE_GIT_SHA RELEASE_WORKFLOW_RUN_ID API_IMAGE WEB_IMAGE SHOP_IMAGE
}

release_atomic_copy() {
  local source_path="$1"
  local destination_path="$2"
  local temporary_path

  mkdir -p "$(dirname "$destination_path")"
  temporary_path="${destination_path}.tmp.$$"
  cp "$source_path" "$temporary_path"
  chmod 600 "$temporary_path"
  mv -f "$temporary_path" "$destination_path"
}

release_select_rollback_manifest() {
  local state_directory="$1"
  local current_manifest="${state_directory}/current.json"

  if [[ ! -f "$current_manifest" ]]; then
    release_error "No current release is available for rollback in ${state_directory}"
    return 1
  fi

  printf '%s\n' "$current_manifest"
}

release_select_previous_manifest() {
  local state_directory="$1"
  local previous_manifest="${state_directory}/previous.json"

  if [[ ! -f "$previous_manifest" ]]; then
    release_error "No previous release is available in ${state_directory}"
    return 1
  fi

  printf '%s\n' "$previous_manifest"
}
