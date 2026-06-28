#!/usr/bin/env bash
#
# ASK WhatsApp Bot — full GCP teardown
# Stops schedulers, exports Firestore, deletes functions, Pub/Sub, secrets, and database.
#
# Usage:
#   cd whatsappBot && ./teardown.sh
#   DELETE_GCP_PROJECT=true ./teardown.sh   # also delete the GCP project (30-day recovery)
#
set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-askwhatsappbot}"
REGION="${GCP_REGION:-us-central1}"
EXPORT_BUCKET="${TEARDOWN_EXPORT_BUCKET:-${PROJECT_ID}-firestore-export}"

HTTP_FUNCTIONS=(whatsappWebhook adminApi)
WORKER_FUNCTIONS=(processSendWorker processReminderWorker processQuestWorker)
OTHER_FUNCTIONS=(minuteTick)
LEGACY_FUNCTIONS=(processMorningDispatch processReminderDispatch reconcileStuckJobs)

SCHEDULER_JOBS=(
  minuteTickJob
  processMorningDispatchJob
  processReminderDispatchJob
  reconcileStuckJobsJob
)

PUBSUB_TOPICS=(
  morning-send-topic
  reminder-send-topic
  quest-send-topic
  minute-tick
  morning-dispatch-trigger
  reminder-dispatch-trigger
  reconcile-trigger
)

REQUIRED_SECRETS=(
  TWILIO_ACCOUNT_SID
  TWILIO_AUTH_TOKEN
  TWILIO_WHATSAPP_NUMBER
)

OPTIONAL_SECRETS=(
  TWILIO_CONTENT_SID_QUIZ
  TWILIO_CONTENT_SID_QUIZ_RESPONSE
  TWILIO_CONTENT_SID_KNOCK_RESPONSE
  TWILIO_CONTENT_SID_MORNING_DEVOTION
  TWILIO_CONTENT_SID_QUEST_MONDAY
  TWILIO_CONTENT_SID_QUEST_TUESDAY
  TWILIO_CONTENT_SID_QUEST_WEDNESDAY
  TWILIO_CONTENT_SID_QUEST_FRIDAY
  TWILIO_CONTENT_SID_QUEST_SATURDAY
  TWILIO_API_KEY_SID
  TWILIO_API_KEY_SECRET
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
)

log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*"; exit 1; }

confirm_teardown() {
  if [[ "${TEARDOWN_CONFIRM:-}" == "${PROJECT_ID}" ]]; then
    return 0
  fi
  echo ""
  echo "⚠️  DESTRUCTIVE TEARDOWN — project: ${PROJECT_ID}"
  echo "    This deletes Cloud Functions, Firestore data, Pub/Sub, schedulers, and secrets."
  echo "    Firestore is exported first to gs://${EXPORT_BUCKET}/"
  echo ""
  echo "    Re-run with: TEARDOWN_CONFIRM=${PROJECT_ID} ./teardown.sh"
  echo ""
  exit 1
}

ensure_project() {
  gcloud config set project "${PROJECT_ID}" >/dev/null
  gcloud projects describe "${PROJECT_ID}" >/dev/null
  log "Project verified: ${PROJECT_ID}"
}

export_firestore() {
  local export_path="gs://${EXPORT_BUCKET}/firestore-$(date -u +%Y%m%dT%H%M%SZ)"
  log "Creating export bucket (if needed): gs://${EXPORT_BUCKET}/"
  if ! gcloud storage buckets describe "gs://${EXPORT_BUCKET}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    gcloud storage buckets create "gs://${EXPORT_BUCKET}" \
      --project="${PROJECT_ID}" \
      --location="${REGION}" \
      --uniform-bucket-level-access
  fi

  log "Exporting Firestore → ${export_path}"
  gcloud firestore export "${export_path}" --project="${PROJECT_ID}" --async
  log "Firestore export started (async). Import on client project with:"
  log "  gcloud firestore import ${export_path} --project=CLIENT_PROJECT_ID"
}

delete_scheduler_jobs() {
  for job in "${SCHEDULER_JOBS[@]}"; do
    if gcloud scheduler jobs describe "${job}" --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
      log "Deleting scheduler job: ${job}"
      gcloud scheduler jobs delete "${job}" --location="${REGION}" --project="${PROJECT_ID}" --quiet
    else
      log "Scheduler job not found (skip): ${job}"
    fi
  done
}

delete_function() {
  local name=$1
  if gcloud functions describe "${name}" --gen2 --region="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    log "Deleting function: ${name}"
    gcloud functions delete "${name}" --gen2 --region="${REGION}" --project="${PROJECT_ID}" --quiet
  else
    log "Function not found (skip): ${name}"
  fi
}

delete_all_functions() {
  local fn
  for fn in "${HTTP_FUNCTIONS[@]}" "${WORKER_FUNCTIONS[@]}" "${OTHER_FUNCTIONS[@]}" "${LEGACY_FUNCTIONS[@]}"; do
    delete_function "${fn}"
  done

  # Catch any remaining Gen2 functions in the region
  while IFS= read -r fn; do
    [[ -z "${fn}" ]] && continue
    delete_function "${fn}"
  done < <(gcloud functions list --project="${PROJECT_ID}" --regions="${REGION}" --format="value(name)" 2>/dev/null || true)
}

delete_pubsub_subscriptions() {
  while IFS= read -r sub; do
    [[ -z "${sub}" ]] && continue
    log "Deleting subscription: ${sub}"
    gcloud pubsub subscriptions delete "${sub}" --project="${PROJECT_ID}" --quiet
  done < <(gcloud pubsub subscriptions list --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null || true)
}

delete_pubsub_topics() {
  for topic in "${PUBSUB_TOPICS[@]}"; do
    if gcloud pubsub topics describe "${topic}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
      log "Deleting topic: ${topic}"
      gcloud pubsub topics delete "${topic}" --project="${PROJECT_ID}" --quiet
    fi
  done
}

delete_secrets() {
  local secret
  for secret in "${REQUIRED_SECRETS[@]}" "${OPTIONAL_SECRETS[@]}"; do
    if gcloud secrets describe "${secret}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
      log "Deleting secret: ${secret}"
      gcloud secrets delete "${secret}" --project="${PROJECT_ID}" --quiet
    fi
  done
}

delete_firestore_database() {
  log "Deleting Firestore database (default)..."
  gcloud firestore databases delete \
    --database='(default)' \
    --project="${PROJECT_ID}" \
    --quiet
  log "Firestore database deleted"
}

delete_gcp_project() {
  log "Deleting GCP project ${PROJECT_ID} (30-day recovery window)..."
  gcloud projects delete "${PROJECT_ID}" --quiet
  log "Project deletion requested"
}

main() {
  confirm_teardown
  ensure_project

  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "STEP 1: Export Firestore for client migration"
  export_firestore

  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "STEP 2: Delete Cloud Scheduler jobs"
  delete_scheduler_jobs

  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "STEP 3: Delete Cloud Functions Gen2"
  delete_all_functions

  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "STEP 4: Delete Pub/Sub subscriptions and topics"
  delete_pubsub_subscriptions
  delete_pubsub_topics

  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "STEP 5: Delete Secret Manager secrets"
  delete_secrets

  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "STEP 6: Delete Firestore database"
  delete_firestore_database

  if [[ "${DELETE_GCP_PROJECT:-}" == "true" ]]; then
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "STEP 7: Delete GCP project"
    delete_gcp_project
  fi

  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Teardown complete for ${PROJECT_ID}"
  log "Firestore export bucket: gs://${EXPORT_BUCKET}/"
  log "Next: update Twilio webhook URL to client project before go-live"
  if [[ "${DELETE_GCP_PROJECT:-}" != "true" ]]; then
    log "Optional: DELETE_GCP_PROJECT=true TEARDOWN_CONFIRM=${PROJECT_ID} ./teardown.sh"
  fi
}

main "$@"
