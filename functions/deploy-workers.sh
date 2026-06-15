#!/bin/bash
gcloud functions deploy processSendWorker --region=us-central1 --source=. --trigger-topic=morning-send-topic --update-env-vars NODE_ENV=debug
gcloud functions deploy processReminderWorker --region=us-central1 --source=. --trigger-topic=reminder-send-topic --update-env-vars NODE_ENV=debug
