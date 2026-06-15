#!/bin/bash
set -e

PROJECT_ID="whatapp-497611"
REGION="us-central1"
RUNTIME="nodejs22"
# Resolve absolute path to the functions directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FUNCTIONS_DIR="$SCRIPT_DIR/functions"

# Source environment variables from .env if it exists
if [ -f "$FUNCTIONS_DIR/.env" ]; then
  echo "Sourcing environment variables from $FUNCTIONS_DIR/.env..."
  export $(grep -v '^#' "$FUNCTIONS_DIR/.env" | xargs)
fi

TWILIO_SECRET_FLAGS="TWILIO_ACCOUNT_SID=TWILIO_ACCOUNT_SID:latest,TWILIO_AUTH_TOKEN=TWILIO_AUTH_TOKEN:latest,TWILIO_WHATSAPP_NUMBER=TWILIO_WHATSAPP_NUMBER:latest,TWILIO_CONTENT_SID_QUIZ=TWILIO_CONTENT_SID_QUIZ:latest,TWILIO_CONTENT_SID_QUIZ_RESPONSE=TWILIO_CONTENT_SID_QUIZ_RESPONSE:latest,TWILIO_CONTENT_SID_KNOCK_RESPONSE=TWILIO_CONTENT_SID_KNOCK_RESPONSE:latest"

echo "Setting active project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

echo "Enabling necessary APIs..."
gcloud services enable cloudfunctions.googleapis.com \
    cloudbuild.googleapis.com \
    pubsub.googleapis.com \
    cloudscheduler.googleapis.com \
    secretmanager.googleapis.com \
    eventarc.googleapis.com

echo "Building TypeScript..."
cd "$FUNCTIONS_DIR"
yarn install --frozen-lockfile --ignore-engines
npx tsc
cd "$SCRIPT_DIR"

# Setup Secrets (Will prompt if they don't exist)
# gcloud secrets create TWILIO_ACCOUNT_SID --replication-policy="automatic" || true
# echo -n "mock" | gcloud secrets versions add TWILIO_ACCOUNT_SID --data-file=- || true
# gcloud secrets create TWILIO_AUTH_TOKEN --replication-policy="automatic" || true
# echo -n "mock" | gcloud secrets versions add TWILIO_AUTH_TOKEN --data-file=- || true
# gcloud secrets create TWILIO_WHATSAPP_NUMBER --replication-policy="automatic" || true
# echo -n "mock" | gcloud secrets versions add TWILIO_WHATSAPP_NUMBER --data-file=- || true
# gcloud secrets create TWILIO_CONTENT_SID_QUIZ --replication-policy="automatic" || true
# echo -n "HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | gcloud secrets versions add TWILIO_CONTENT_SID_QUIZ --data-file=- || true
# gcloud secrets create TWILIO_CONTENT_SID_QUIZ_RESPONSE --replication-policy="automatic" || true
# echo -n "HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | gcloud secrets versions add TWILIO_CONTENT_SID_QUIZ_RESPONSE --data-file=- || true

echo "Granting Secret Manager access to Cloud Functions service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" --quiet

echo "Creating Pub/Sub topics..."
gcloud pubsub topics create morning-send-topic || true
gcloud pubsub topics create reminder-send-topic || true
gcloud pubsub topics create quest-send-topic || true
gcloud pubsub topics create minute-tick || true

echo "Creating Firestore indexes..."
gcloud firestore indexes composite create --database='(default)' \
  --collection-group=users --query-scope=COLLECTION \
  --field-config=field-path=paused,order=ascending \
  --field-config=field-path=nextSendAt,order=ascending 2>&1 || true

gcloud firestore indexes composite create --database='(default)' \
  --collection-group=users --query-scope=COLLECTION \
  --field-config=field-path=paused,order=ascending \
  --field-config=field-path=nextReminderAt,order=ascending 2>&1 || true

gcloud firestore indexes composite create --database='(default)' \
  --collection-group=users --query-scope=COLLECTION \
  --field-config=field-path=lockedUntil,order=ascending 2>&1 || true

echo "Deploying Webhook and APIs..."
gcloud functions deploy whatsappWebhook \
    --gen2 --region=$REGION --runtime=$RUNTIME \
    --source="$FUNCTIONS_DIR" --entry-point=whatsappWebhook \
    --trigger-http --allow-unauthenticated \
    --set-env-vars=PUBSUB_TOPIC_MORNING_SEND=morning-send-topic,PUBSUB_TOPIC_REMINDER_SEND=reminder-send-topic,PUBSUB_TOPIC_QUEST_SEND=quest-send-topic,GOOGLE_CLOUD_PROJECT=$PROJECT_ID \
    --set-secrets=$TWILIO_SECRET_FLAGS

gcloud functions deploy adminApi \
    --gen2 --region=$REGION --runtime=$RUNTIME \
    --source="$FUNCTIONS_DIR" --entry-point=adminApi \
    --trigger-http --allow-unauthenticated \
    --set-env-vars=GOOGLE_CLOUD_PROJECT=$PROJECT_ID,ALLOWED_ADMIN_ORIGINS=$ALLOWED_ADMIN_ORIGINS

echo "Deploying Workers..."
gcloud functions deploy processSendWorker \
    --gen2 --region=$REGION --runtime=$RUNTIME \
    --source="$FUNCTIONS_DIR" --entry-point=processSendWorker \
    --trigger-topic=morning-send-topic \
    --set-env-vars=GOOGLE_CLOUD_PROJECT=$PROJECT_ID \
    --set-secrets=$TWILIO_SECRET_FLAGS

gcloud functions deploy processReminderWorker \
    --gen2 --region=$REGION --runtime=$RUNTIME \
    --source="$FUNCTIONS_DIR" --entry-point=processReminderWorker \
    --trigger-topic=reminder-send-topic \
    --set-env-vars=GOOGLE_CLOUD_PROJECT=$PROJECT_ID \
    --set-secrets=$TWILIO_SECRET_FLAGS

gcloud functions deploy processQuestWorker \
    --gen2 --region=$REGION --runtime=$RUNTIME \
    --source="$FUNCTIONS_DIR" --entry-point=processQuestWorker \
    --trigger-topic=quest-send-topic \
    --set-env-vars=GOOGLE_CLOUD_PROJECT=$PROJECT_ID \
    --set-secrets=$TWILIO_SECRET_FLAGS

echo "Deploying Dispatchers..."
gcloud functions deploy minuteTick \
    --gen2 --region=$REGION --runtime=$RUNTIME \
    --source="$FUNCTIONS_DIR" --entry-point=minuteTick \
    --trigger-topic=minute-tick \
    --set-env-vars=PUBSUB_TOPIC_MORNING_SEND=morning-send-topic,PUBSUB_TOPIC_REMINDER_SEND=reminder-send-topic,PUBSUB_TOPIC_QUEST_SEND=quest-send-topic,GOOGLE_CLOUD_PROJECT=$PROJECT_ID

echo "Creating/Updating Cloud Schedulers..."

# Helper: creates a scheduler job if it doesn't exist, updates it if it does
upsert_scheduler() {
  local JOB_NAME=$1
  local SCHEDULE=$2
  local TOPIC=$3

  if gcloud scheduler jobs describe "$JOB_NAME" --location=$REGION > /dev/null 2>&1; then
    echo "  Updating scheduler: $JOB_NAME"
    gcloud scheduler jobs update pubsub "$JOB_NAME" \
      --schedule="$SCHEDULE" \
      --topic="$TOPIC" \
      --message-body="{}" \
      --location=$REGION
  else
    echo "  Creating scheduler: $JOB_NAME"
    gcloud scheduler jobs create pubsub "$JOB_NAME" \
      --schedule="$SCHEDULE" \
      --topic="$TOPIC" \
      --message-body="{}" \
      --location=$REGION
  fi
}

upsert_scheduler "minuteTickJob"  '* * * * *'    "minute-tick"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Webhook URL (paste into Twilio):"
echo "  https://us-central1-$PROJECT_ID.cloudfunctions.net/whatsappWebhook"
