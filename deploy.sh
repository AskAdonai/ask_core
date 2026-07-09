#!/usr/bin/env bash
#
# ASK WhatsApp Bot — production deploy script
# Deploys all Cloud Functions Gen2, Pub/Sub topics, scheduler, and Firestore indexes.
#
# Usage:
#   cd whatsappBot && ./deploy.sh
#
# Config (in order of precedence):
#   whatsappBot/.env                  — deploy overrides (project ID, CORS origins)
#   whatsappBot/functions/.env.yaml   — non-secret runtime config
#   whatsappBot/functions/.env        — local secrets only (Twilio/R2 keys)
#
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-askwhatsappbot}"
REGION="${GCP_REGION:-us-central1}"
RUNTIME="${GCP_RUNTIME:-nodejs22}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FUNCTIONS_DIR="${SCRIPT_DIR}/functions"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

STEP=0
STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

PUBSUB_TOPICS=(
  morning-send-topic
  reminder-send-topic
  quest-send-topic
  minute-tick
)

REQUIRED_SECRETS=(
  TWILIO_ACCOUNT_SID
  TWILIO_AUTH_TOKEN
  TWILIO_WHATSAPP_NUMBER
)

OPTIONAL_SECRETS=(
  TWILIO_API_KEY_SID
  TWILIO_API_KEY_SECRET
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  RESEND_API_KEY
)

# Never inject these from .env.yaml — they belong in Secret Manager only
SECRET_ENV_KEYS=(
  TWILIO_ACCOUNT_SID
  TWILIO_AUTH_TOKEN
  TWILIO_WHATSAPP_NUMBER
  TWILIO_API_KEY_SID
  TWILIO_API_KEY_SECRET
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  RESEND_API_KEY
)

# Deploy always sets these; .env.yaml values for these keys are ignored
DEPLOY_ENV_OVERRIDES=(
  GOOGLE_CLOUD_PROJECT
  FIREBASE_PROJECT_ID
  NODE_ENV
  TWILIO_WEBHOOK_BASE_URL
  ALLOWED_ADMIN_ORIGINS
)

HTTP_FUNCTIONS=(
  whatsappWebhook
  adminApi
)

WORKER_FUNCTIONS=(
  processSendWorker
  processReminderWorker
  processQuestWorker
)

# ─── Logging helpers ──────────────────────────────────────────────────────────

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

log_section() {
  echo ""
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "$*"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

die() {
  log "ERROR: $*"
  exit 1
}

run_step() {
  local title=$1
  shift
  STEP=$((STEP + 1))
  log_section "STEP ${STEP}: ${title}"
  if "$@"; then
    log "STEP ${STEP}: completed — ${title}"
  else
    local exit_code=$?
    log "STEP ${STEP}: FAILED — ${title} (exit code ${exit_code})"
    die "Deployment aborted at step ${STEP}: ${title}"
  fi
}

run_step_soft() {
  local title=$1
  shift
  STEP=$((STEP + 1))
  log_section "STEP ${STEP}: ${title} (non-fatal if already exists)"
  if "$@"; then
    log "STEP ${STEP}: completed — ${title}"
  else
    log "STEP ${STEP}: skipped or already applied — ${title}"
  fi
}

# ─── Env loading ──────────────────────────────────────────────────────────────

load_env_file() {
  local file=$1
  if [[ ! -f "$file" ]]; then
    log "  No env file at ${file} — skipping"
    return 0
  fi

  log "  Loading env file: ${file}"
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(echo "$line" | xargs)"
    [[ -z "$line" ]] && continue
    if [[ "$line" != *=* ]]; then
      log "  WARN: ignoring invalid env line in ${file}: ${line}"
      continue
    fi
    export "$line"
  done < "$file"
}

is_secret_env_key() {
  local key=$1
  for secret_key in "${SECRET_ENV_KEYS[@]}"; do
    [[ "${key}" == "${secret_key}" ]] && return 0
  done
  return 1
}

is_deploy_env_override() {
  local key=$1
  for override_key in "${DEPLOY_ENV_OVERRIDES[@]}"; do
    [[ "${key}" == "${override_key}" ]] && return 0
  done
  return 1
}

load_yaml_env_file() {
  local file=$1
  if [[ ! -f "$file" ]]; then
    log "  No config file at ${file} — skipping"
    return 0
  fi

  log "  Loading config file: ${file}"
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(echo "$line" | xargs)"
    [[ -z "$line" || "$line" != *:* ]] && continue
    local key="${line%%:*}"
    key="$(echo "$key" | xargs)"
    local val="${line#*:}"
    val="$(echo "$val" | xargs | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/")"
    is_secret_env_key "${key}" && continue
    export "${key}=${val}"
  done < "$file"
}

load_environment() {
  load_env_file "${SCRIPT_DIR}/.env"
  load_yaml_env_file "${FUNCTIONS_DIR}/.env.yaml"
  load_env_file "${FUNCTIONS_DIR}/.env"

  export GOOGLE_CLOUD_PROJECT="${GOOGLE_CLOUD_PROJECT:-$PROJECT_ID}"
  export FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-$PROJECT_ID}"
  export ALLOWED_ADMIN_ORIGINS="${ALLOWED_ADMIN_ORIGINS:-https://dashboard.askadonai.com}"
  export TWILIO_WEBHOOK_BASE_URL="${TWILIO_WEBHOOK_BASE_URL:-https://${REGION}-${PROJECT_ID}.cloudfunctions.net/whatsappWebhook}"

  # Keep deploy target in sync with loaded env files (ignore stale shell exports).
  PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-askwhatsappbot}"
  export GOOGLE_CLOUD_PROJECT="${PROJECT_ID}"
  export FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-$PROJECT_ID}"

  log "  Project ID            : ${PROJECT_ID}"
  log "  Region                : ${REGION}"
  log "  Runtime               : ${RUNTIME}"
  log "  Allowed admin origins : ${ALLOWED_ADMIN_ORIGINS}"
  log "  Webhook base URL      : ${TWILIO_WEBHOOK_BASE_URL}"
}

# ─── GCP helpers ──────────────────────────────────────────────────────────────

ensure_gcloud_project() {
  log "  Setting active gcloud project to ${PROJECT_ID}"
  gcloud config set project "${PROJECT_ID}" >/dev/null
  gcloud projects describe "${PROJECT_ID}" >/dev/null
  log "  Project verified"
}

enable_apis() {
  local apis=(
    cloudfunctions.googleapis.com
    cloudbuild.googleapis.com
    pubsub.googleapis.com
    cloudscheduler.googleapis.com
    secretmanager.googleapis.com
    eventarc.googleapis.com
    firestore.googleapis.com
    run.googleapis.com
    artifactregistry.googleapis.com
    firebase.googleapis.com
    identitytoolkit.googleapis.com
  )

  log "  Enabling ${#apis[@]} Google Cloud APIs..."
  gcloud services enable "${apis[@]}" --project="${PROJECT_ID}"
  log "  APIs enabled"
}

grant_secret_access() {
  local project_number
  project_number="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
  local sa="${project_number}-compute@developer.gserviceaccount.com"

  log "  Granting secretmanager.secretAccessor to ${sa}"
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${sa}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null
  log "  IAM binding applied"
}

grant_build_service_account_access() {
  local project_number
  project_number="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
  local compute_sa="${project_number}-compute@developer.gserviceaccount.com"
  local cloudbuild_sa="${project_number}@cloudbuild.gserviceaccount.com"

  log "  Granting Cloud Functions Gen2 build/deploy roles..."
  for role in storage.objectViewer artifactregistry.writer logging.logWriter; do
    gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
      --member="serviceAccount:${compute_sa}" \
      --role="roles/${role}" \
      --quiet >/dev/null 2>&1 || true
  done
  for role in cloudfunctions.developer run.admin artifactregistry.writer logging.logWriter storage.objectViewer; do
    gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
      --member="serviceAccount:${cloudbuild_sa}" \
      --role="roles/${role}" \
      --quiet >/dev/null 2>&1 || true
  done
  gcloud iam service-accounts add-iam-policy-binding "${compute_sa}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${cloudbuild_sa}" \
    --role="roles/iam.serviceAccountUser" \
    --quiet >/dev/null 2>&1 || true
  gcloud iam service-accounts add-iam-policy-binding "${compute_sa}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${compute_sa}" \
    --role="roles/iam.serviceAccountUser" \
    --quiet >/dev/null 2>&1 || true
  log "  Build service account roles applied"
}

grant_http_invoker() {
  local fn=$1
  local service
  service="$(echo "${fn}" | tr '[:upper:]' '[:lower:]')"
  log "  Granting public invoker on Cloud Run service: ${service}"
  if gcloud run services add-iam-policy-binding "${service}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --quiet >/dev/null 2>&1; then
    log "  OK   ${service} — roles/run.invoker for allUsers"
  else
    log "  WARN ${service} — could not grant allUsers invoker (org policy may block public access)"
  fi
}

verify_secrets() {
  local missing=0
  for secret in "${REQUIRED_SECRETS[@]}"; do
    if gcloud secrets describe "${secret}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
      log "  OK  secret exists: ${secret}"
    else
      log "  MISSING required secret: ${secret}"
      missing=1
    fi
  done

  for secret in "${OPTIONAL_SECRETS[@]}"; do
    if gcloud secrets describe "${secret}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
      log "  OK  optional secret: ${secret}"
    else
      log "  —   optional secret not found (skipped at deploy): ${secret}"
    fi
  done

  [[ "${missing}" -eq 0 ]] || die "Create missing secrets in Secret Manager before deploying. See DEPLOYMENT.md §7.4"

  if gcloud secrets describe TWILIO_ACCOUNT_SID --project="${PROJECT_ID}" >/dev/null 2>&1; then
    local account_sid
    account_sid="$(gcloud secrets versions access latest --secret=TWILIO_ACCOUNT_SID --project="${PROJECT_ID}" 2>/dev/null || true)"
    if [[ "${account_sid}" == SK* ]]; then
      die "Secret TWILIO_ACCOUNT_SID is an API Key SID (SK...). Update Secret Manager to your Account SID (AC...) from Twilio Console → Account Info."
    fi
    if [[ -n "${account_sid}" && "${account_sid}" != AC* ]]; then
      log "  WARN: TWILIO_ACCOUNT_SID secret does not start with AC — verify Twilio Console → Account Info"
    else
      log "  OK  TWILIO_ACCOUNT_SID format (AC...)"
    fi
  fi
}

build_twilio_secret_flags() {
  local flags=()
  local all_secrets=("${REQUIRED_SECRETS[@]}" "${OPTIONAL_SECRETS[@]}")

  for secret in "${all_secrets[@]}"; do
    if gcloud secrets describe "${secret}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
      flags+=("${secret}=${secret}:latest")
    fi
  done

  if [[ ${#flags[@]} -eq 0 ]]; then
    die "No Twilio secrets available to attach to functions"
  fi

  local joined
  joined="$(IFS=,; echo "${flags[*]}")"
  log "  Attaching ${#flags[@]} secret(s) to Twilio functions"
  echo "${joined}"
}

ensure_pubsub_topic() {
  local topic=$1
  if gcloud pubsub topics describe "${topic}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    log "  Topic exists: ${topic}"
  else
    log "  Creating topic: ${topic}"
    gcloud pubsub topics create "${topic}" --project="${PROJECT_ID}"
    log "  Created topic: ${topic}"
  fi
}

create_pubsub_topics() {
  for topic in "${PUBSUB_TOPICS[@]}"; do
    ensure_pubsub_topic "${topic}"
  done
}

create_firestore_indexes_gcloud() {
  log "  Creating core user composite indexes (idempotent)..."

  gcloud firestore indexes composite create --project="${PROJECT_ID}" --database='(default)' \
    --collection-group=users --query-scope=COLLECTION \
    --field-config=field-path=paused,order=ascending \
    --field-config=field-path=nextSendAt,order=ascending 2>&1 | log_pipe || true

  gcloud firestore indexes composite create --project="${PROJECT_ID}" --database='(default)' \
    --collection-group=users --query-scope=COLLECTION \
    --field-config=field-path=paused,order=ascending \
    --field-config=field-path=nextReminderAt,order=ascending 2>&1 | log_pipe || true

  gcloud firestore indexes composite create --project="${PROJECT_ID}" --database='(default)' \
    --collection-group=users --query-scope=COLLECTION \
    --field-config=field-path=paused,order=ascending \
    --field-config=field-path=questActive,order=ascending \
    --field-config=field-path=nextQuestAt,order=ascending 2>&1 | log_pipe || true

  gcloud firestore indexes composite create --project="${PROJECT_ID}" --database='(default)' \
    --collection-group=users --query-scope=COLLECTION \
    --field-config=field-path=lockedUntil,order=ascending 2>&1 | log_pipe || true

  log "  Core gcloud index requests submitted"
}

log_pipe() {
  while IFS= read -r line; do
    log "    ${line}"
  done
}

deploy_firestore_indexes_firebase() {
  if ! command -v firebase >/dev/null 2>&1; then
    log "  firebase CLI not installed — skipping firebase deploy --only firestore:indexes"
    return 0
  fi

  log "  Deploying firestore.indexes.json via Firebase CLI..."
  (
    cd "${SCRIPT_DIR}"
    firebase deploy --only firestore:indexes --project "${PROJECT_ID}" --non-interactive
  )
  log "  Firestore indexes deploy finished"
}

build_typescript() {
  log "  Installing dependencies..."
  (
    cd "${FUNCTIONS_DIR}"
    yarn install --frozen-lockfile --ignore-engines
  )

  log "  Compiling TypeScript..."
  (
    cd "${FUNCTIONS_DIR}"
    npx tsc
  )

  if [[ ! -f "${FUNCTIONS_DIR}/lib/index.js" ]]; then
    die "Build failed — ${FUNCTIONS_DIR}/lib/index.js not found"
  fi

  log "  Build output verified: lib/index.js"
}

prepare_config_env_file() {
  CONFIG_ENV_FILE="/tmp/config-env-${PROJECT_ID}.yaml"
  local existing_bootstrap=""

  if gcloud run services describe adminapi --region="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    existing_bootstrap="$(gcloud run services describe adminapi \
      --region="${REGION}" --project="${PROJECT_ID}" \
      --format=json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data.get('spec', {}).get('template', {}).get('spec', {}).get('containers', [{}])[0].get('env', []):
    if item.get('name') == 'ADMIN_BOOTSTRAP_SECRET' and item.get('value'):
        print(item['value'])
        break
" 2>/dev/null || true)"
  fi

  {
    echo "GOOGLE_CLOUD_PROJECT: \"${PROJECT_ID}\""
    echo "FIREBASE_PROJECT_ID: \"${FIREBASE_PROJECT_ID}\""
    echo "NODE_ENV: \"production\""
    echo "TWILIO_WEBHOOK_BASE_URL: \"${TWILIO_WEBHOOK_BASE_URL}\""
    echo "ALLOWED_ADMIN_ORIGINS: \"${ALLOWED_ADMIN_ORIGINS}\""

    if [[ -f "${FUNCTIONS_DIR}/.env.yaml" ]]; then
      while IFS= read -r line || [[ -n "$line" ]]; do
        line="${line%%#*}"
        line="$(echo "$line" | xargs)"
        [[ -z "$line" || "$line" != *:* ]] && continue
        local key="${line%%:*}"
        key="$(echo "$key" | xargs)"
        is_secret_env_key "${key}" && continue
        is_deploy_env_override "${key}" && continue
        echo "$line"
      done < "${FUNCTIONS_DIR}/.env.yaml"
    fi
  } > "${CONFIG_ENV_FILE}"

  if [[ -n "${existing_bootstrap}" ]] && ! grep -q '^ADMIN_BOOTSTRAP_SECRET:' "${CONFIG_ENV_FILE}"; then
    echo "ADMIN_BOOTSTRAP_SECRET: \"${existing_bootstrap}\"" >> "${CONFIG_ENV_FILE}"
  fi

  log "  Prepared function config env file: ${CONFIG_ENV_FILE}"
}

build_admin_secret_flags() {
  local flags=()
  for secret in R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY RESEND_API_KEY; do
    if gcloud secrets describe "${secret}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
      flags+=("${secret}=${secret}:latest")
    fi
  done
  if [[ ${#flags[@]} -eq 0 ]]; then
    echo ""
    return 0
  fi
  IFS=,; echo "${flags[*]}"
}

deploy_http_function() {
  local name=$1
  shift
  log "  Deploying HTTP function: ${name}"
  gcloud functions deploy "${name}" \
    --gen2 \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --runtime="${RUNTIME}" \
    --source="${FUNCTIONS_DIR}" \
    --entry-point="${name}" \
    --trigger-http \
    --allow-unauthenticated \
    "$@"
  log "  Deployed: ${name}"
}

deploy_pubsub_function() {
  local name=$1
  local topic=$2
  shift 2
  log "  Deploying Pub/Sub function: ${name} (topic: ${topic})"
  gcloud functions deploy "${name}" \
    --gen2 \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --runtime="${RUNTIME}" \
    --source="${FUNCTIONS_DIR}" \
    --entry-point="${name}" \
    --trigger-topic="${topic}" \
    "$@"
  log "  Deployed: ${name}"
}

deploy_all_functions() {
  local twilio_secrets
  local admin_secrets
  twilio_secrets="$(build_twilio_secret_flags)"
  admin_secrets="$(build_admin_secret_flags)"

  prepare_config_env_file

  deploy_http_function whatsappWebhook \
    --env-vars-file="${CONFIG_ENV_FILE}" \
    --set-secrets="${twilio_secrets}"

  if [[ -n "${admin_secrets}" ]]; then
    deploy_http_function adminApi \
      --env-vars-file="${CONFIG_ENV_FILE}" \
      --set-secrets="${admin_secrets}"
  else
    deploy_http_function adminApi \
      --env-vars-file="${CONFIG_ENV_FILE}"
  fi

  for worker in "${WORKER_FUNCTIONS[@]}"; do
    local topic=""
    case "${worker}" in
      processSendWorker) topic="morning-send-topic" ;;
      processReminderWorker) topic="reminder-send-topic" ;;
      processQuestWorker) topic="quest-send-topic" ;;
    esac
    deploy_pubsub_function "${worker}" "${topic}" \
      --env-vars-file="${CONFIG_ENV_FILE}" \
      --set-secrets="${twilio_secrets}"
  done

  deploy_pubsub_function minuteTick minute-tick \
    --env-vars-file="${CONFIG_ENV_FILE}"

  for fn in "${HTTP_FUNCTIONS[@]}"; do
    grant_http_invoker "${fn}"
  done
}

upsert_scheduler() {
  local job_name=$1
  local schedule=$2
  local topic=$3

  if gcloud scheduler jobs describe "${job_name}" --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    log "  Updating scheduler job: ${job_name}"
    gcloud scheduler jobs update pubsub "${job_name}" \
      --project="${PROJECT_ID}" \
      --location="${REGION}" \
      --schedule="${schedule}" \
      --topic="${topic}" \
      --message-body="{}"
  else
    log "  Creating scheduler job: ${job_name}"
    gcloud scheduler jobs create pubsub "${job_name}" \
      --project="${PROJECT_ID}" \
      --location="${REGION}" \
      --schedule="${schedule}" \
      --topic="${topic}" \
      --message-body="{}"
  fi
  log "  Scheduler ready: ${job_name} (${schedule} → ${topic})"
}

configure_scheduler() {
  upsert_scheduler minuteTickJob '* * * * *' minute-tick
}

verify_function_active() {
  local name=$1
  local state
  state="$(gcloud functions describe "${name}" --gen2 --region="${REGION}" --project="${PROJECT_ID}" --format='value(state)' 2>/dev/null || echo "NOT_FOUND")"
  if [[ "${state}" != "ACTIVE" ]]; then
    log "  FAIL ${name} — state=${state}"
    return 1
  fi
  log "  OK   ${name} — ACTIVE"
}

verify_deployment() {
  local failed=0

  log "  Verifying Cloud Functions..."
  for fn in "${HTTP_FUNCTIONS[@]}" "${WORKER_FUNCTIONS[@]}" minuteTick; do
    verify_function_active "${fn}" || failed=1
  done

  log "  Verifying HTTP health endpoints..."
  local webhook_health admin_health
  webhook_health="$(curl -s -o /dev/null -w '%{http_code}' "https://${REGION}-${PROJECT_ID}.cloudfunctions.net/whatsappWebhook/health" 2>/dev/null || echo "000")"
  admin_health="$(curl -s -o /dev/null -w '%{http_code}' "https://${REGION}-${PROJECT_ID}.cloudfunctions.net/adminApi/health" 2>/dev/null || echo "000")"

  if [[ "${webhook_health}" == "200" ]]; then
    log "  OK   whatsappWebhook /health — HTTP ${webhook_health}"
  else
    log "  FAIL whatsappWebhook /health — HTTP ${webhook_health}"
    failed=1
  fi

  if [[ "${admin_health}" == "200" ]]; then
    log "  OK   adminApi /health — HTTP ${admin_health}"
  else
    log "  FAIL adminApi /health — HTTP ${admin_health}"
    failed=1
  fi

  log "  Verifying Cloud Scheduler..."
  if gcloud scheduler jobs describe minuteTickJob --location="${REGION}" --project="${PROJECT_ID}" --format='value(state)' 2>/dev/null | grep -q ENABLED; then
    log "  OK   minuteTickJob — ENABLED"
  else
    log "  WARN minuteTickJob is not ENABLED (check Cloud Scheduler / App Engine setup)"
  fi

  [[ "${failed}" -eq 0 ]] || die "Post-deploy verification failed — inspect logs above"
}

print_summary() {
  log_section "Deployment summary"
  log "  Started : ${STARTED_AT}"
  log "  Finished: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  log "  Project : ${PROJECT_ID}"
  log "  Region  : ${REGION}"
  log ""
  log "  Webhook (Twilio):"
  log "    https://${REGION}-${PROJECT_ID}.cloudfunctions.net/whatsappWebhook/webhook"
  log ""
  log "  Admin API:"
  log "    https://${REGION}-${PROJECT_ID}.cloudfunctions.net/adminApi"
  log ""
  log "  Dashboard CORS origins:"
  log "    ${ALLOWED_ADMIN_ORIGINS}"
  log ""
  log "✅ Deployment complete"
}

# ─── Main ─────────────────────────────────────────────────────────────────────

main() {
  log_section "ASK WhatsApp Bot deployment"
  log "Started at ${STARTED_AT}"

  if ! command -v gcloud >/dev/null 2>&1; then
    die "gcloud CLI is not installed"
  fi
  if ! command -v yarn >/dev/null 2>&1; then
    die "yarn is not installed"
  fi
  if ! command -v python3 >/dev/null 2>&1; then
    die "python3 is required to merge adminApi env files"
  fi

  run_step "Load environment files" load_environment
  run_step "Configure gcloud project" ensure_gcloud_project
  run_step "Enable Google Cloud APIs" enable_apis
  run_step "Verify Secret Manager secrets" verify_secrets
  run_step "Grant Secret Manager access to Cloud Functions SA" grant_secret_access
  run_step "Grant Cloud Build / deploy IAM roles" grant_build_service_account_access
  run_step "Build TypeScript" build_typescript
  run_step "Create Pub/Sub topics" create_pubsub_topics
  run_step_soft "Create core Firestore indexes (gcloud)" create_firestore_indexes_gcloud
  run_step_soft "Deploy Firestore indexes (firebase)" deploy_firestore_indexes_firebase
  run_step "Deploy all Cloud Functions" deploy_all_functions
  run_step "Configure Cloud Scheduler" configure_scheduler
  run_step "Verify deployment" verify_deployment
  print_summary
}

main "$@"
