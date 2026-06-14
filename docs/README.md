# GenMedia Hub

> **The Unified AI Media Creation Platform** — 7 MCP servers, one interface, your cloud.

GenMedia Hub is a Firebase-hosted web application that exposes seven AI Model Context Protocol (MCP) servers as a single, secure, unified platform. Built on Google Cloud Platform, it gives developers, creators, and agencies instant access to video generation, image synthesis, music composition, speech synthesis, and AI-powered engineering tools — all running in your own GCP project.

[![Firebase Hosting](https://img.shields.io/badge/Hosted%20on-Firebase-FFCA28?logo=firebase)](https://firebase.google.com/)
[![Cloud Run](https://img.shields.io/badge/Backend-Cloud%20Run-4285F4?logo=google-cloud)](https://cloud.google.com/run)
[![Vertex AI](https://img.shields.io/badge/AI-Vertex%20AI-34A853?logo=google-cloud)](https://cloud.google.com/vertex-ai)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [MCP Servers](#mcp-servers)
- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Configuration](#configuration)
- [Security Model](#security-model)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

GenMedia Hub consolidates seven specialized AI services behind a unified web interface with enterprise-grade security. Instead of managing multiple API keys, endpoints, and billing accounts across disparate services, you get:

- **One platform** to access all AI media generation capabilities
- **One authentication layer** (Google Sign-In + Firebase Auth)
- **One billing relationship** (your GCP project, your costs, your control)
- **One deployment** (Firebase Hosting + Cloud Run, fully serverless)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          GenMedia Hub Platform                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐  │
│  │   Browser    │────▶│  Firebase Hosting │────▶│  Cloud Function     │  │
│  │   (React)    │     │  (Static Assets)  │     │  (Auth Proxy)       │  │
│  └─────────────┘     └──────────────────┘     └────────┬────────────┘  │
│                                                         │               │
│                              ┌───────────────────────────┤               │
│                              │                           │               │
│                              ▼                           ▼               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     Cloud Run Services (us-central1)             │    │
│  ├──────────┬──────────┬──────────┬──────────┬──────────┬─────────┤    │
│  │ gstack   │ mcp-veo  │mcp-nano  │mcp-lyria │mcp-chirp3│mcp-avt  │    │
│  │ -mcp     │          │banana    │          │          │ool      │    │
│  ├──────────┴──────────┴──────────┴──────────┴──────────┴─────────┤    │
│  │                        Vertex AI APIs                           │    │
│  ├────────────────────────────────────────────────────────────────-┤    │
│  │  Gemini 2.5 Pro │ Veo 2/3/3.1 │ Lyria │ Chirp3 HD │ Imagen    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │              GCS: gs://casey-genmedia-output/                    │    │
│  │              (Generated media artifacts)                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## MCP Servers

| Server | Capability | Models / Tech |
|--------|-----------|---------------|
| **gstack-mcp** | 12 AI product/engineering agent tools | Gemini 2.5 Pro |
| **genmedia-veo** | Video generation | Veo 2, Veo 3, Veo 3.1 |
| **genmedia-nanobanana** | Image generation | Gemini image models |
| **genmedia-lyria** | Music generation | Lyria |
| **genmedia-chirp3** | Speech synthesis | Chirp3 HD voices |
| **genmedia-gemini** | TTS + image generation with style control | Gemini multi-modal |
| **genmedia-avtool** | AV compositing & editing | FFmpeg wrapper |

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- Google Cloud SDK (`gcloud`)
- Access to GCP project `casey-genmedia`

### Deploy in 5 Minutes

```bash
# 1. Clone the repository
git clone https://github.com/your-org/genmedia-hub.git
cd genmedia-hub

# 2. Authenticate with Firebase
firebase login

# 3. Select the project
firebase use casey-genmedia

# 4. Install dependencies
npm install
cd functions && npm install && cd ..

# 5. Set environment configuration
firebase functions:config:set \
  auth.allowed_domains="criticalasset.com,insuremep.com" \
  gcp.project="casey-genmedia" \
  gcp.region="us-central1"

# 6. Build the frontend
npm run build

# 7. Deploy everything (hosting + functions + rules)
firebase deploy

# 8. Verify
firebase open hosting:site
```

Your GenMedia Hub is now live at `https://casey-genmedia.web.app`.

---

## Environment Setup

### Required Environment Variables

Create a `.env` file in the project root:

```env
# GCP Configuration
GCP_PROJECT_ID=casey-genmedia
GCP_REGION=us-central1

# Firebase Configuration
FIREBASE_API_KEY=<your-firebase-api-key>
FIREBASE_AUTH_DOMAIN=casey-genmedia.firebaseapp.com
FIREBASE_PROJECT_ID=casey-genmedia
FIREBASE_STORAGE_BUCKET=casey-genmedia.appspot.com

# Cloud Run Service URLs
CLOUD_RUN_GSTACK=https://gstack-mcp-<hash>-uc.a.run.app
CLOUD_RUN_VEO=https://mcp-veo-<hash>-uc.a.run.app
CLOUD_RUN_NANOBANANA=https://mcp-nanobanana-<hash>-uc.a.run.app
CLOUD_RUN_LYRIA=https://mcp-lyria-<hash>-uc.a.run.app
CLOUD_RUN_AVTOOL=https://mcp-avtool-<hash>-uc.a.run.app

# Output Storage
GCS_OUTPUT_BUCKET=casey-genmedia-output

# Access Control
ALLOWED_DOMAINS=criticalasset.com,insuremep.com
```

### Local Development

```bash
# Start Firebase emulators for local development
firebase emulators:start --only hosting,functions,auth

# In a separate terminal, start the frontend dev server
npm run dev
```

---

## Configuration

### Firebase Configuration (`firebase.json`)

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "mcpProxy"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**",
        "headers": [
          { "key": "X-Frame-Options", "value": "DENY" },
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
        ]
      }
    ]
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs18"
  }
}
```

### Domain Restriction

To restrict access to specific email domains, update the Firebase Functions config:

```bash
firebase functions:config:set auth.allowed_domains="criticalasset.com,insuremep.com"
firebase deploy --only functions
```

---

## Security Model

GenMedia Hub implements defense-in-depth security:

### Layer 1: Google Sign-In (Client)
- Users authenticate via Google Sign-In (OAuth 2.0)
- Only `@criticalasset.com` and `@insuremep.com` email domains are permitted
- Firebase Auth issues an ID token upon successful authentication

### Layer 2: Firebase Auth (Token Verification)
- Every API request includes the Firebase ID token in the `Authorization` header
- Cloud Functions verify the token's validity and expiration
- Domain allowlist is enforced server-side (not just client-side)

### Layer 3: Cloud Function Proxy
- All MCP server requests are proxied through a Cloud Function
- The function validates auth, checks domain, and forwards to Cloud Run
- No direct client → Cloud Run communication is possible
- Cloud Run services require IAM authentication (service account only)

### Layer 4: Cloud Run IAM
- Cloud Run services are deployed with `--no-allow-unauthenticated`
- Only the Cloud Function's service account has `roles/run.invoker`
- Network egress is restricted to Vertex AI endpoints and GCS

### Layer 5: GCS Output Security
- Generated media is stored in `gs://casey-genmedia-output/`
- Signed URLs with time-limited access are generated for downloads
- Bucket-level IAM prevents unauthorized direct access

```
User ─── Google Sign-In ──▶ Firebase Auth ──▶ Cloud Function ──▶ Cloud Run ──▶ Vertex AI
  │                              │                   │                │
  │        ✓ OAuth 2.0           │  ✓ Token verify   │  ✓ IAM auth    │  ✓ SA auth
  │        ✓ Domain check        │  ✓ Domain check   │  ✓ No public   │  ✓ Project scope
  └──────────────────────────────┴───────────────────┴────────────────┘
```

---

## Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** with conventional commits: `feat: add new MCP server integration`
4. **Test** locally with Firebase emulators
5. **Submit** a pull request with a clear description

### Code Standards

- TypeScript for all Cloud Functions
- React + TypeScript for the frontend
- ESLint + Prettier for code formatting
- Jest for unit tests, Cypress for E2E

### Adding a New MCP Server

1. Deploy the MCP server to Cloud Run in `us-central1`
2. Grant the proxy function's service account `roles/run.invoker`
3. Add the service URL to the environment configuration
4. Register the server in `src/config/mcp-servers.ts`
5. Add UI components for the server's capabilities
6. Update documentation

### Reporting Issues

Use GitHub Issues with the appropriate label:
- `bug` — Something isn't working
- `enhancement` — Feature request
- `documentation` — Docs improvement
- `security` — Security concern (use private disclosure)

---

## License

Copyright © 2026 Critical Asset / InsureMeP. All rights reserved.

This software is proprietary. Unauthorized copying, distribution, or modification is strictly prohibited.

---

<p align="center">
  <strong>GenMedia Hub</strong> — Built with ❤️ on Google Cloud Platform
</p>
