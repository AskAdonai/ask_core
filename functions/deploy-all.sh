#!/bin/bash
set -e

echo "Deploying whatsappWebhook..."
gcloud functions deploy whatsappWebhook --region=us-central1 --source=. --trigger-http --env-vars-file .env.yaml

echo "Deploying adminApi..."
gcloud functions deploy adminApi --region=us-central1 --source=. --trigger-http --env-vars-file .env.yaml

echo "Deploying docsApi..."
gcloud functions deploy docsApi --region=us-central1 --source=. --trigger-http --env-vars-file .env.yaml

echo "Deploying minuteTick..."
gcloud functions deploy minuteTick --region=us-central1 --source=. --trigger-topic=minute-tick --env-vars-file .env.yaml

echo "Deploying processReminderWorker..."
gcloud functions deploy processReminderWorker --region=us-central1 --source=. --trigger-topic=reminder-send-topic --env-vars-file .env.yaml

echo "Deploying processSendWorker..."
gcloud functions deploy processSendWorker --region=us-central1 --source=. --trigger-topic=morning-send-topic --env-vars-file .env.yaml

echo "Deploying reconcileStuckJobs..."
gcloud functions deploy reconcileStuckJobs --region=us-central1 --source=. --trigger-topic=reconcile-trigger --env-vars-file .env.yaml

echo "All functions deployed successfully!"
