# ASK Devotional Chatbot Backend

This is the distributed microservices backend for the ASK ("Ask, Seek, Knock") Devotional Chatbot built with Node.js, TypeScript, Google Cloud Functions Gen 2, Firebase Firestore, and Google Pub/Sub.

## Architecture
- **Webhook Gateway**: Fast, stateless routing of Twilio messages.
- **Job Dispatchers**: Cloud Schedulers query Firestore for due jobs and publish tasks to Pub/Sub.
- **Workers**: Listen to Pub/Sub topics and execute Twilio sending.
- **Execution Lease**: Uses Firestore transactions (`lockedUntil`) to ensure idempotency.

## Local Setup

### 1. Requirements
- Node.js 20+
- Yarn (`npm install -g yarn`)
- Firebase CLI (`npm install -g firebase-tools`)

### 2. Environment Variables
Copy `.env.example` to `.env` in the `functions/` directory and fill in your keys:
```bash
cp functions/.env.example functions/.env
```

### 3. Install Dependencies
```bash
cd functions
yarn install
```

### 4. Running Tests
```bash
cd functions
yarn test
```

## Deployment

1. **Login to Google Cloud**:
```bash
gcloud auth login
```

2. **Set the active project**:
```bash
gcloud config set project askwhatsappbot
```

3. **Deploy the GCP infrastructure (Pub/Sub, Scheduler, Cloud Functions)**:
```bash
./deploy.sh
```

## Twilio Setup
1. Go to Twilio Console.
2. Navigate to WhatsApp Sender settings.
3. Set the Webhook URL for incoming messages to your deployed Cloud Function URL (e.g. `https://us-central1-demo-ask-bot.cloudfunctions.net/whatsappWebhook`).
