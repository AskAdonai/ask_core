# Deployment (manual)

Full guide: **[../DEPLOYMENT.md](../DEPLOYMENT.md)**

## Client project — manual checklist

### 1. Authenticate GCP

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_CLIENT_PROJECT_ID
firebase login
firebase use YOUR_CLIENT_PROJECT_ID
```

### 2. Enable APIs

```bash
gcloud services enable \
  cloudfunctions.googleapis.com cloudbuild.googleapis.com pubsub.googleapis.com \
  cloudscheduler.googleapis.com secretmanager.googleapis.com eventarc.googleapis.com \
  firestore.googleapis.com run.googleapis.com artifactregistry.googleapis.com \
  firebase.googleapis.com \
  --project=YOUR_CLIENT_PROJECT_ID
```

### 3. Create Firestore

```bash
gcloud firestore databases create \
  --project=YOUR_CLIENT_PROJECT_ID \
  --location=us-central1 \
  --database='(default)' \
  --type=firestore-native
```

### 4. Import data (optional)

```bash
gcloud firestore import gs://SOURCE_BUCKET/export-path \
  --project=YOUR_CLIENT_PROJECT_ID
```

### 5. Create secrets

From `functions/.env` (secrets only):

```bash
echo -n 'AC...' | gcloud secrets create TWILIO_ACCOUNT_SID --data-file=- --project=YOUR_CLIENT_PROJECT_ID
echo -n '...'  | gcloud secrets create TWILIO_AUTH_TOKEN --data-file=- --project=YOUR_CLIENT_PROJECT_ID
echo -n '+...' | gcloud secrets create TWILIO_WHATSAPP_NUMBER --data-file=- --project=YOUR_CLIENT_PROJECT_ID
```

Optional: `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.

Non-secret config (Pub/Sub topics, template SIDs, R2 bucket name, webhook URL) goes in `functions/.env.yaml` — `deploy.sh` injects it as plain env vars on all functions.

### 6. Deploy

Update `whatsappBot/.env` with `GOOGLE_CLOUD_PROJECT` and `ALLOWED_ADMIN_ORIGINS`, copy `functions/.env.yaml.example` → `functions/.env.yaml`, then:

```bash
cd whatsappBot
./deploy.sh
```

### 7. Twilio Console

- Webhook: `https://us-central1-YOUR_CLIENT_PROJECT_ID.cloudfunctions.net/whatsappWebhook/webhook`
- Status: `https://us-central1-YOUR_CLIENT_PROJECT_ID.cloudfunctions.net/whatsappWebhook/status`

## Other scripts

| Script | Use |
|--------|-----|
| `./deploy.sh` | Deploy / update all functions |
| `./teardown.sh` | Remove all GCP resources (`TEARDOWN_CONFIRM=PROJECT_ID ./teardown.sh`) |
