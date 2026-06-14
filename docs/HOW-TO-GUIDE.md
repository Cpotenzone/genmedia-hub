# GenMedia Hub — How-To Guide

A comprehensive step-by-step guide for deploying, configuring, and operating GenMedia Hub.

---

## Table of Contents

1. [How to Deploy from Scratch](#1-how-to-deploy-from-scratch)
2. [How to Configure Google Sign-In](#2-how-to-configure-google-sign-in)
3. [How to Restrict Access to Specific Domains](#3-how-to-restrict-access-to-specific-domains)
4. [How to Use Each MCP Server](#4-how-to-use-each-mcp-server)
5. [How to Monitor Usage and Costs](#5-how-to-monitor-usage-and-costs)
6. [Troubleshooting Common Issues](#6-troubleshooting-common-issues)

---

## 1. How to Deploy from Scratch

### Prerequisites

Before you begin, ensure you have:

- [ ] A Google Cloud Platform account with billing enabled
- [ ] Owner or Editor role on the `casey-genmedia` GCP project
- [ ] Node.js 18 or higher installed
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Google Cloud SDK installed and configured

### Step 1: Install the Firebase CLI

```bash
npm install -g firebase-tools
firebase --version  # Should show 13.x or higher
```

### Step 2: Authenticate

```bash
# Log in to Firebase
firebase login

# Log in to Google Cloud
gcloud auth login
gcloud config set project casey-genmedia
```

### Step 3: Clone the Repository

```bash
git clone https://github.com/your-org/genmedia-hub.git
cd genmedia-hub
```

### Step 4: Install Dependencies

```bash
# Frontend dependencies
npm install

# Cloud Functions dependencies
cd functions
npm install
cd ..
```

### Step 5: Configure the Firebase Project

```bash
# Select the project
firebase use casey-genmedia

# Verify project association
firebase projects:list
```

### Step 6: Set Environment Configuration

```bash
# Set allowed domains for access control
firebase functions:config:set \
  auth.allowed_domains="criticalasset.com,insuremep.com"

# Set GCP configuration
firebase functions:config:set \
  gcp.project="casey-genmedia" \
  gcp.region="us-central1" \
  gcp.output_bucket="casey-genmedia-output"

# Set Cloud Run service URLs
firebase functions:config:set \
  services.gstack="https://gstack-mcp-HASH-uc.a.run.app" \
  services.veo="https://mcp-veo-HASH-uc.a.run.app" \
  services.nanobanana="https://mcp-nanobanana-HASH-uc.a.run.app" \
  services.lyria="https://mcp-lyria-HASH-uc.a.run.app" \
  services.avtool="https://mcp-avtool-HASH-uc.a.run.app"
```

> **Note:** Replace `HASH` with your actual Cloud Run service hash. Find it with:
> ```bash
> gcloud run services list --project casey-genmedia --region us-central1
> ```

### Step 7: Build the Frontend

```bash
npm run build
```

### Step 8: Deploy

```bash
# Deploy everything
firebase deploy

# Or deploy specific components
firebase deploy --only hosting    # Just the web app
firebase deploy --only functions  # Just the Cloud Functions
firebase deploy --only firestore:rules  # Just security rules
```

### Step 9: Verify Deployment

```bash
# Open the deployed site
firebase open hosting:site

# Check function logs
firebase functions:log
```

Your GenMedia Hub is now live at: `https://casey-genmedia.web.app`

---

## 2. How to Configure Google Sign-In

### Step 1: Enable Google Sign-In in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the `casey-genmedia` project
3. Navigate to **Authentication** → **Sign-in method**
4. Click **Google** provider
5. Toggle **Enable**
6. Set the **Project support email**
7. Click **Save**

### Step 2: Configure OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **OAuth consent screen**
2. Select **Internal** (restricts to your Google Workspace organization)
3. Fill in:
   - App name: `GenMedia Hub`
   - User support email: your admin email
   - Authorized domains: `casey-genmedia.web.app`, `casey-genmedia.firebaseapp.com`
4. Add scopes: `email`, `profile`, `openid`
5. Click **Save and Continue**

### Step 3: Add Authorized Domains

1. In Firebase Console → **Authentication** → **Settings**
2. Under **Authorized domains**, ensure these are listed:
   - `casey-genmedia.web.app`
   - `casey-genmedia.firebaseapp.com`
   - `localhost` (for development)

### Step 4: Frontend Configuration

Ensure your Firebase config in `src/config/firebase.ts` contains:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "casey-genmedia.firebaseapp.com",
  projectId: "casey-genmedia",
  storageBucket: "casey-genmedia.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Force account selection on each sign-in
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
```

### Step 5: Test Authentication

1. Open `https://casey-genmedia.web.app`
2. Click **Sign in with Google**
3. Select an account from an allowed domain
4. Verify successful redirect to the dashboard

---

## 3. How to Restrict Access to Specific Domains

### Server-Side Domain Restriction (Cloud Function)

The primary access control is enforced in the Cloud Function proxy:

```typescript
// functions/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const ALLOWED_DOMAINS = functions.config().auth.allowed_domains.split(',');

export async function validateAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const email = decodedToken.email;

    if (!email) {
      return res.status(403).json({ error: 'No email associated with account' });
    }

    const domain = email.split('@')[1];
    if (!ALLOWED_DOMAINS.includes(domain)) {
      return res.status(403).json({
        error: `Access denied. Domain '${domain}' is not authorized.`
      });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}
```

### Update Allowed Domains

To add or modify allowed domains:

```bash
# Add a new domain
firebase functions:config:set \
  auth.allowed_domains="criticalasset.com,insuremep.com,newdomain.com"

# Redeploy functions to apply
firebase deploy --only functions
```

### Client-Side Domain Check (UX Enhancement)

Add a pre-check on the frontend for better user experience:

```typescript
// src/auth/domainCheck.ts
const ALLOWED_DOMAINS = ['criticalasset.com', 'insuremep.com'];

export function isAllowedDomain(email: string): boolean {
  const domain = email.split('@')[1];
  return ALLOWED_DOMAINS.includes(domain);
}

// After Google Sign-In:
const result = await signInWithPopup(auth, googleProvider);
if (!isAllowedDomain(result.user.email)) {
  await auth.signOut();
  showError('Access restricted to authorized domains only.');
}
```

### Using Google Workspace Admin (Optional)

For tighter control, configure the OAuth consent screen as **Internal**:

1. Go to GCP Console → **APIs & Services** → **OAuth consent screen**
2. Set User Type to **Internal**
3. This restricts sign-in to your Google Workspace organization automatically

---

## 4. How to Use Each MCP Server

### 4.1 gstack-mcp — AI Engineering Tools

**What it does:** 12 AI-powered product and engineering agent tools built on Gemini 2.5 Pro.

**Example Workflow: AI Code Review**

```json
{
  "server": "gstack-mcp",
  "tool": "code_review",
  "params": {
    "code": "function calculateDiscount(price, tier) { ... }",
    "language": "javascript",
    "focus": ["security", "performance", "best-practices"]
  }
}
```

**Example Workflow: Architecture Planning**

```json
{
  "server": "gstack-mcp",
  "tool": "architecture_plan",
  "params": {
    "requirements": "Real-time notification system for 100K concurrent users",
    "constraints": ["GCP-only", "budget-under-500/month", "sub-100ms-latency"],
    "output_format": "detailed_with_diagram"
  }
}
```

**Available Tools:** code_review, architecture_plan, documentation_gen, test_generation, refactor_suggest, dependency_audit, performance_analysis, security_scan, api_design, data_model, migration_plan, incident_response

---

### 4.2 genmedia-veo — Video Generation

**What it does:** Generate videos from text prompts using Veo 2, Veo 3, and Veo 3.1.

**Example Workflow: Product Demo Video**

```json
{
  "server": "genmedia-veo",
  "tool": "generate_video",
  "params": {
    "prompt": "A sleek smartphone rotating slowly on a white surface with soft lighting, product photography style, 4K quality",
    "model": "veo-3.1",
    "duration": "8s",
    "aspect_ratio": "16:9",
    "output_path": "gs://casey-genmedia-output/videos/"
  }
}
```

**Example Workflow: Social Media Content**

```json
{
  "server": "genmedia-veo",
  "tool": "generate_video",
  "params": {
    "prompt": "Timelapse of a city skyline transitioning from day to night, cinematic colors, drone perspective",
    "model": "veo-3",
    "duration": "5s",
    "aspect_ratio": "9:16",
    "style": "cinematic"
  }
}
```

**Models Available:**
- **Veo 2** — Balanced quality and speed
- **Veo 3** — Higher fidelity, complex scenes
- **Veo 3.1** — Latest model, best quality, longest generation times

---

### 4.3 genmedia-nanobanana — Image Generation

**What it does:** Generate and edit images using Gemini's image models.

**Example Workflow: Brand Asset Creation**

```json
{
  "server": "genmedia-nanobanana",
  "tool": "generate_image",
  "params": {
    "prompt": "Modern minimalist logo for a fintech startup, blue and white color scheme, clean lines, vector style",
    "count": 4,
    "size": "1024x1024",
    "output_path": "gs://casey-genmedia-output/images/"
  }
}
```

**Example Workflow: Image Editing**

```json
{
  "server": "genmedia-nanobanana",
  "tool": "edit_image",
  "params": {
    "source_image": "gs://casey-genmedia-output/images/original.png",
    "edit_prompt": "Change the background to a tropical beach at sunset",
    "mask_prompt": "the background behind the person"
  }
}
```

---

### 4.4 genmedia-lyria — Music Generation

**What it does:** Compose original music and soundtracks.

**Example Workflow: Background Music for Video**

```json
{
  "server": "genmedia-lyria",
  "tool": "generate_music",
  "params": {
    "prompt": "Upbeat corporate background music, light and inspiring, suitable for a tech product video, 120 BPM",
    "duration": "30s",
    "genre": "corporate",
    "mood": "inspiring",
    "output_format": "wav",
    "output_path": "gs://casey-genmedia-output/music/"
  }
}
```

**Example Workflow: Podcast Intro**

```json
{
  "server": "genmedia-lyria",
  "tool": "generate_music",
  "params": {
    "prompt": "Short energetic podcast intro jingle with electronic elements, memorable melody, builds to a peak then resolves",
    "duration": "8s",
    "mood": "energetic",
    "output_format": "mp3"
  }
}
```

---

### 4.5 genmedia-chirp3 — Speech Synthesis

**What it does:** Generate natural-sounding speech with Chirp3 HD voices.

**Example Workflow: Video Narration**

```json
{
  "server": "genmedia-chirp3",
  "tool": "synthesize_speech",
  "params": {
    "text": "Welcome to GenMedia Hub — the AI-powered media creation studio that runs in your cloud.",
    "voice": "en-US-Neural2-D",
    "speaking_rate": 0.95,
    "pitch": 0,
    "output_format": "wav",
    "output_path": "gs://casey-genmedia-output/speech/"
  }
}
```

**Example Workflow: Multi-Language Voiceover**

```json
{
  "server": "genmedia-chirp3",
  "tool": "synthesize_speech",
  "params": {
    "text": "Bienvenidos a GenMedia Hub — su estudio de creación de medios impulsado por inteligencia artificial.",
    "voice": "es-US-Neural2-A",
    "speaking_rate": 1.0,
    "output_format": "mp3"
  }
}
```

**Available Voices:** 30+ HD neural voices across English, Spanish, French, German, Japanese, and more.

---

### 4.6 genmedia-gemini — TTS + Image Generation with Style Control

**What it does:** Advanced text-to-speech and image generation with fine-grained style parameters.

**Example Workflow: Styled Image Generation**

```json
{
  "server": "genmedia-gemini",
  "tool": "generate_styled_image",
  "params": {
    "prompt": "A futuristic city with flying cars",
    "style": {
      "art_style": "cyberpunk",
      "color_palette": "neon blues and purples",
      "lighting": "dramatic rim lighting",
      "composition": "wide angle, low perspective"
    },
    "size": "1536x1024"
  }
}
```

**Example Workflow: Expressive TTS**

```json
{
  "server": "genmedia-gemini",
  "tool": "generate_tts",
  "params": {
    "text": "I can't believe we actually did it! This is incredible!",
    "style": {
      "emotion": "excited",
      "pacing": "fast",
      "emphasis_words": ["can't believe", "incredible"]
    },
    "voice_profile": "warm_female"
  }
}
```

---

### 4.7 genmedia-avtool — AV Compositing

**What it does:** Combine, edit, and process audio/video files using an FFmpeg wrapper.

**Example Workflow: Combine Video + Voiceover + Music**

```json
{
  "server": "genmedia-avtool",
  "tool": "composite",
  "params": {
    "video": "gs://casey-genmedia-output/videos/product-demo.mp4",
    "audio_tracks": [
      {
        "source": "gs://casey-genmedia-output/speech/narration.wav",
        "volume": 1.0,
        "start_time": "0s"
      },
      {
        "source": "gs://casey-genmedia-output/music/background.wav",
        "volume": 0.3,
        "start_time": "0s",
        "fade_in": "2s",
        "fade_out": "3s"
      }
    ],
    "output_format": "mp4",
    "output_path": "gs://casey-genmedia-output/final/product-video-final.mp4"
  }
}
```

**Example Workflow: Video Trimming and Format Conversion**

```json
{
  "server": "genmedia-avtool",
  "tool": "process",
  "params": {
    "input": "gs://casey-genmedia-output/videos/raw-footage.mp4",
    "operations": [
      { "type": "trim", "start": "00:00:05", "end": "00:00:35" },
      { "type": "resize", "width": 1080, "height": 1920 },
      { "type": "format", "codec": "h264", "quality": "high" }
    ],
    "output_path": "gs://casey-genmedia-output/final/trimmed-vertical.mp4"
  }
}
```

---

## 5. How to Monitor Usage and Costs

### Firebase Console Monitoring

1. Go to [Firebase Console](https://console.firebase.google.com/) → `casey-genmedia`
2. Check **Usage and billing** for:
   - Hosting bandwidth
   - Function invocations
   - Authentication events

### Google Cloud Console Monitoring

#### View Cloud Run Metrics

1. Go to [Cloud Console](https://console.cloud.google.com/) → **Cloud Run**
2. Select a service (e.g., `gstack-mcp`)
3. View metrics:
   - Request count
   - Latency (p50, p95, p99)
   - Container instance count
   - Memory/CPU utilization

#### Set Up Billing Alerts

```bash
# Create a budget alert at $100
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT \
  --display-name="GenMedia Hub Monthly Budget" \
  --budget-amount=100 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=80 \
  --threshold-rule=percent=100 \
  --notifications-rule-pubsub-topic=projects/casey-genmedia/topics/billing-alerts
```

#### View Cost Breakdown

1. Go to **Billing** → **Reports**
2. Filter by project: `casey-genmedia`
3. Group by **Service** to see costs per AI API
4. Group by **SKU** for granular pricing details

### Custom Logging and Analytics

#### View Function Logs

```bash
# Real-time log streaming
firebase functions:log --only mcpProxy

# Or via gcloud
gcloud logging read "resource.type=cloud_function" \
  --project casey-genmedia \
  --limit 50 \
  --format json
```

#### Create a Usage Dashboard

1. Go to **Cloud Monitoring** → **Dashboards**
2. Create a new dashboard: "GenMedia Hub Usage"
3. Add widgets:
   - Cloud Run request count (per service)
   - Function execution time
   - Error rate
   - Active users (from Firebase Auth)

#### Export Usage Data to BigQuery

```bash
# Enable billing export to BigQuery
gcloud services enable bigquery.googleapis.com
# Configure in Billing → Billing export → BigQuery export
```

Then query:

```sql
SELECT
  service.description AS service,
  SUM(cost) AS total_cost,
  COUNT(*) AS request_count
FROM `casey-genmedia.billing_export.gcp_billing_export_v1_*`
WHERE DATE(_PARTITIONTIME) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY service
ORDER BY total_cost DESC;
```

---

## 6. Troubleshooting Common Issues

### Issue: "Access Denied" after sign-in

**Symptom:** User signs in with Google but sees a 403 error.

**Cause:** Email domain not in the allowed list.

**Fix:**
```bash
# Check current allowed domains
firebase functions:config:get auth.allowed_domains

# Add the domain
firebase functions:config:set \
  auth.allowed_domains="criticalasset.com,insuremep.com,newdomain.com"
firebase deploy --only functions
```

---

### Issue: Cloud Function timeout

**Symptom:** Requests to MCP servers time out (504 Gateway Timeout).

**Cause:** Default Cloud Function timeout is 60 seconds; AI generation can take longer.

**Fix:**
```typescript
// functions/src/index.ts
export const mcpProxy = functions
  .runWith({
    timeoutSeconds: 540,  // 9 minutes max
    memory: '1GB'
  })
  .https.onRequest(app);
```

Then redeploy:
```bash
firebase deploy --only functions
```

---

### Issue: CORS errors in browser console

**Symptom:** `Access-Control-Allow-Origin` errors when calling the API.

**Fix:** Ensure CORS is configured in the Cloud Function:

```typescript
import cors from 'cors';

const corsMiddleware = cors({
  origin: [
    'https://casey-genmedia.web.app',
    'https://casey-genmedia.firebaseapp.com',
    'http://localhost:3000'  // development
  ],
  credentials: true
});

app.use(corsMiddleware);
```

---

### Issue: Cloud Run service returns 403

**Symptom:** Cloud Function can't reach Cloud Run services.

**Cause:** Missing IAM permission for the function's service account.

**Fix:**
```bash
# Get the function's service account
SA="casey-genmedia@appspot.gserviceaccount.com"

# Grant Cloud Run invoker role for each service
gcloud run services add-iam-policy-binding gstack-mcp \
  --region=us-central1 \
  --member="serviceAccount:${SA}" \
  --role="roles/run.invoker"

# Repeat for other services
for SERVICE in mcp-veo mcp-nanobanana mcp-lyria mcp-avtool; do
  gcloud run services add-iam-policy-binding $SERVICE \
    --region=us-central1 \
    --member="serviceAccount:${SA}" \
    --role="roles/run.invoker"
done
```

---

### Issue: Generated media not accessible

**Symptom:** Files are generated but download links don't work.

**Cause:** GCS signed URL expired or bucket permissions misconfigured.

**Fix:**
```bash
# Check bucket permissions
gsutil iam get gs://casey-genmedia-output/

# Ensure the Cloud Run service account can write
gsutil iam ch \
  serviceAccount:casey-genmedia-compute@developer.gserviceaccount.com:objectCreator \
  gs://casey-genmedia-output/

# Ensure the Cloud Function can generate signed URLs
gsutil iam ch \
  serviceAccount:casey-genmedia@appspot.gserviceaccount.com:objectViewer \
  gs://casey-genmedia-output/
```

---

### Issue: Firebase deploy fails

**Symptom:** `firebase deploy` shows errors.

**Common Fixes:**

```bash
# Clear the build cache
rm -rf dist/ node_modules/ functions/node_modules/
npm install
cd functions && npm install && cd ..
npm run build

# Check Firebase CLI version
firebase --version
npm install -g firebase-tools@latest

# Verify project selection
firebase use casey-genmedia

# Deploy with verbose logging
firebase deploy --debug
```

---

### Issue: High latency on first request

**Symptom:** First request after idle period takes 10-30 seconds.

**Cause:** Cloud Run cold start.

**Fix:** Set minimum instances:

```bash
gcloud run services update gstack-mcp \
  --region=us-central1 \
  --min-instances=1

# Or for cost savings, use CPU allocation = "always" with 0 min instances
gcloud run services update gstack-mcp \
  --region=us-central1 \
  --cpu-boost
```

---

### Issue: Vertex AI quota exceeded

**Symptom:** 429 Too Many Requests from AI services.

**Fix:**
1. Go to GCP Console → **IAM & Admin** → **Quotas**
2. Filter by the relevant Vertex AI API
3. Click **Edit Quotas** and request an increase
4. Or implement rate limiting in the Cloud Function:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 20,  // 20 requests per minute per user
  keyGenerator: (req) => req.user?.uid || req.ip
});

app.use('/api/', limiter);
```

---

### Getting Help

- **Firebase Documentation:** https://firebase.google.com/docs
- **Cloud Run Documentation:** https://cloud.google.com/run/docs
- **Vertex AI Documentation:** https://cloud.google.com/vertex-ai/docs
- **MCP Protocol Spec:** https://modelcontextprotocol.io/
- **Internal Support:** File an issue in the project repository

---

*Last updated: June 2026*
