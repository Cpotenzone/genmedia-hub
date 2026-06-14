# GenMedia Hub — Technical Architecture

A detailed technical reference for the GenMedia Hub platform architecture, data flows, security model, and infrastructure components.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [System Diagram](#2-system-diagram)
3. [Data Flow](#3-data-flow)
4. [Security Layers](#4-security-layers)
5. [Authentication Flow](#5-authentication-flow)
6. [MCP Protocol](#6-mcp-protocol)
7. [Cloud Run Services](#7-cloud-run-services)
8. [GCS Storage Architecture](#8-gcs-storage-architecture)
9. [Infrastructure as Code](#9-infrastructure-as-code)
10. [Performance Considerations](#10-performance-considerations)

---

## 1. System Overview

GenMedia Hub is a serverless, fully managed platform built on Google Cloud Platform. The architecture follows a layered security model with clear separation of concerns:

| Layer | Component | Technology | Purpose |
|-------|-----------|-----------|---------|
| Presentation | Web App | React + TypeScript | User interface |
| Hosting | Static Assets | Firebase Hosting | CDN-backed delivery |
| Gateway | API Proxy | Cloud Functions (Node.js 18) | Auth validation + routing |
| Compute | MCP Servers | Cloud Run (containerized) | AI service orchestration |
| AI | Models | Vertex AI | Inference (Gemini, Veo, Lyria, etc.) |
| Storage | Output | Google Cloud Storage | Generated media artifacts |
| Auth | Identity | Firebase Auth + Google Sign-In | User authentication |
| Observability | Monitoring | Cloud Logging + Monitoring | Operations |

**Key Design Principles:**
- **Serverless-first:** No VMs to manage, auto-scaling from zero
- **Zero-trust security:** Every hop is authenticated
- **Pay-per-use:** No cost when idle
- **Single-project isolation:** All resources in one GCP project

---

## 2. System Diagram

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                          │
│                                                                                │
│    ┌────────────┐          ┌──────────────┐                                   │
│    │   Client   │─────────▶│  Firebase    │                                   │
│    │  (Browser) │◀─────────│  Hosting     │                                   │
│    └─────┬──────┘          │  (CDN)       │                                   │
│          │                 └──────────────┘                                   │
│          │ API Requests (Bearer Token)                                         │
│          │                                                                     │
└──────────┼─────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         GOOGLE CLOUD PLATFORM                                  │
│                         Project: casey-genmedia                                │
│                         Region: us-central1                                    │
│                                                                                │
│  ┌─────────────────────────────────────────────────────┐                      │
│  │              Cloud Functions (2nd Gen)                │                      │
│  │                                                       │                      │
│  │  ┌─────────────────────────────────────────────────┐ │                      │
│  │  │ mcpProxy                                         │ │                      │
│  │  │  ├── Verify Firebase ID Token                    │ │                      │
│  │  │  ├── Check domain allowlist                      │ │                      │
│  │  │  ├── Rate limiting                               │ │                      │
│  │  │  ├── Request routing                             │ │                      │
│  │  │  └── Generate Cloud Run auth token               │ │                      │
│  │  └─────────────────────────────────────────────────┘ │                      │
│  └──────────────────────────┬──────────────────────────┘                      │
│                              │                                                  │
│                              │ Authenticated (Service Account)                  │
│                              ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                        Cloud Run Services                                 │  │
│  │                                                                            │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │  │
│  │  │ gstack   │ │ mcp-veo  │ │ mcp-nano │ │ mcp-lyria│ │ mcp-avt  │       │  │
│  │  │ -mcp     │ │          │ │ banana   │ │          │ │ ool      │       │  │
│  │  │          │ │          │ │          │ │          │ │          │       │  │
│  │  │ Gemini   │ │ Veo 2/3  │ │ Gemini   │ │ Lyria    │ │ FFmpeg   │       │  │
│  │  │ 2.5 Pro  │ │ /3.1     │ │ Imagen   │ │          │ │          │       │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │  │
│  │       │             │            │            │            │              │  │
│  └───────┼─────────────┼────────────┼────────────┼────────────┼──────────────┘  │
│          │             │            │            │            │                  │
│          ▼             ▼            ▼            ▼            │                  │
│  ┌──────────────────────────────────────────────────────┐    │                  │
│  │                    Vertex AI APIs                      │    │                  │
│  │                                                        │    │                  │
│  │  • Gemini 2.5 Pro (text, code, reasoning)             │    │                  │
│  │  • Veo 2, 3, 3.1 (video generation)                  │    │                  │
│  │  • Imagen (image generation/editing)                  │    │                  │
│  │  • Lyria (music generation)                           │    │                  │
│  │  • Chirp3 HD (speech synthesis)                       │    │                  │
│  └──────────────────────────────────────────────────────┘    │                  │
│                              │                                │                  │
│                              ▼                                ▼                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                  Google Cloud Storage                                      │  │
│  │                  gs://casey-genmedia-output/                               │  │
│  │                                                                            │  │
│  │  ├── videos/          (Veo-generated videos)                              │  │
│  │  ├── images/          (Generated images)                                  │  │
│  │  ├── music/           (Lyria compositions)                                │  │
│  │  ├── speech/          (Chirp3 audio)                                      │  │
│  │  ├── composites/      (AV tool output)                                    │  │
│  │  └── temp/            (Intermediate processing files)                     │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Network Topology

```
                    Internet
                       │
                       ▼
            ┌─────────────────────┐
            │  Cloud CDN /        │
            │  Firebase Hosting   │
            │  (Global Edge)      │
            └─────────┬───────────┘
                      │
                      ▼
            ┌─────────────────────┐
            │  Cloud Functions     │
            │  (us-central1)      │
            │  VPC Connector      │──────┐
            └─────────┬───────────┘      │
                      │                   │
              ┌───────┼───────┐           │
              ▼       ▼       ▼           │
         Cloud Run Services               │
         (us-central1)                    │
         No public ingress                │
              │       │       │           │
              └───────┼───────┘           │
                      │                   │
                      ▼                   ▼
            ┌─────────────────────────────────┐
            │     Google Internal Network      │
            │  (Vertex AI + GCS)              │
            └─────────────────────────────────┘
```

---

## 3. Data Flow

### Request Lifecycle

```
Step 1: User Interaction
┌────────┐
│Browser │──▶ User clicks "Generate Video"
└────────┘

Step 2: Authentication
┌────────┐     ┌─────────────┐
│Browser │────▶│ Firebase Auth│──▶ Validates Google ID Token
└────────┘     └─────────────┘    Returns Firebase ID Token

Step 3: API Request
┌────────┐     ┌──────────────────┐
│Browser │────▶│ Firebase Hosting  │──▶ Rewrite rule matches /api/*
└────────┘     └──────────────────┘    Forwards to Cloud Function

Step 4: Auth Proxy (Cloud Function)
┌───────────────┐
│ Cloud Function│
│               │──▶ 1. Extract Bearer token from Authorization header
│ mcpProxy      │──▶ 2. Verify token with Firebase Admin SDK
│               │──▶ 3. Check email domain against allowlist
│               │──▶ 4. Generate service-to-service auth token
│               │──▶ 5. Forward request to appropriate Cloud Run service
└───────────────┘

Step 5: MCP Server Processing (Cloud Run)
┌──────────────┐
│  Cloud Run   │
│              │──▶ 1. Validate service-to-service token
│  mcp-veo    │──▶ 2. Parse MCP request
│              │──▶ 3. Call Vertex AI API (Veo 3.1)
│              │──▶ 4. Wait for generation (async polling)
│              │──▶ 5. Store output in GCS
│              │──▶ 6. Return GCS URI + signed URL
└──────────────┘

Step 6: Response to Client
┌──────────────┐     ┌────────┐
│Cloud Function│────▶│Browser │──▶ Display result + download link
└──────────────┘     └────────┘

Step 7: Media Download
┌────────┐     ┌─────┐
│Browser │────▶│ GCS │──▶ Signed URL direct download (bypasses function)
└────────┘     └─────┘
```

### Async Generation Flow (Long-Running)

For operations that exceed HTTP timeout (video generation, etc.):

```
┌────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│Browser │────▶│ Function │────▶│Cloud Run │────▶│Vertex AI │
│        │     │          │     │          │     │          │
│        │     │  Submit  │     │  Start   │     │  Queue   │
│        │◀────│  Job ID  │◀────│  Job     │     │  Job     │
│        │     └──────────┘     └──────────┘     └──────────┘
│        │                                              │
│        │     ┌──────────┐     ┌──────────┐           │
│  Poll  │────▶│ Function │────▶│Cloud Run │◀──────────┘
│ Status │     │          │     │  Check   │     Generation Complete
│        │◀────│  Status  │◀────│  Status  │
│        │     └──────────┘     └──────────┘
│        │                           │
│        │                           ▼
│        │                      ┌──────────┐
│  Done  │◀─────────────────────│   GCS    │  Signed URL returned
└────────┘                      └──────────┘
```

---

## 4. Security Layers

### Defense-in-Depth Model

```
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 5: Network Security                                            │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Layer 4: IAM & Service Account Isolation                         │ │
│ │ ┌─────────────────────────────────────────────────────────────┐ │ │
│ │ │ Layer 3: Cloud Function Gateway (Auth + Domain Validation)   │ │ │
│ │ │ ┌─────────────────────────────────────────────────────────┐ │ │ │
│ │ │ │ Layer 2: Firebase Auth (Token Verification)              │ │ │ │
│ │ │ │ ┌─────────────────────────────────────────────────────┐ │ │ │ │
│ │ │ │ │ Layer 1: Google Sign-In (OAuth 2.0)                  │ │ │ │ │
│ │ │ │ │                                                       │ │ │ │ │
│ │ │ │ │           User Identity                              │ │ │ │ │
│ │ │ │ └─────────────────────────────────────────────────────┘ │ │ │ │
│ │ │ └─────────────────────────────────────────────────────────┘ │ │ │
│ │ └─────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Layer Details

| Layer | Control | Enforcement Point | What It Prevents |
|-------|---------|-------------------|------------------|
| 1 | Google OAuth 2.0 | Client (browser) | Unauthenticated access |
| 2 | Firebase ID Token | Cloud Function | Token forgery, expired sessions |
| 3 | Domain Allowlist | Cloud Function | Unauthorized organizations |
| 4 | IAM Roles | Cloud Run / GCS | Privilege escalation |
| 5 | VPC / Firewall | Network | Direct service access bypass |

### Principle of Least Privilege

```
Service Account: casey-genmedia@appspot.gserviceaccount.com (Cloud Functions)
├── roles/run.invoker          → Can invoke Cloud Run services
├── roles/storage.objectViewer → Can generate signed URLs for GCS
└── roles/firebase.admin       → Can verify auth tokens

Service Account: casey-genmedia-compute@developer.gserviceaccount.com (Cloud Run)
├── roles/aiplatform.user      → Can call Vertex AI APIs
├── roles/storage.objectCreator → Can write to GCS output bucket
└── roles/storage.objectViewer  → Can read from GCS (for avtool inputs)
```

---

## 5. Authentication Flow

### Detailed Sequence Diagram

```
┌──────┐          ┌────────────┐      ┌────────────┐      ┌──────────┐
│Client│          │Google OAuth│      │Firebase Auth│      │Cloud Func│
└──┬───┘          └─────┬──────┘      └─────┬──────┘      └────┬─────┘
   │                     │                    │                   │
   │ 1. signInWithPopup()│                    │                   │
   │────────────────────▶│                    │                   │
   │                     │                    │                   │
   │ 2. Google Sign-In UI│                    │                   │
   │◀────────────────────│                    │                   │
   │                     │                    │                   │
   │ 3. User selects     │                    │                   │
   │    account + consent│                    │                   │
   │────────────────────▶│                    │                   │
   │                     │                    │                   │
   │ 4. OAuth code       │                    │                   │
   │◀────────────────────│                    │                   │
   │                     │                    │                   │
   │ 5. Exchange code ───────────────────────▶│                   │
   │    for Firebase token│                   │                   │
   │                     │                    │                   │
   │ 6. Firebase ID Token◀────────────────────│                   │
   │    (JWT, 1hr expiry)│                    │                   │
   │◀─────────────────────────────────────────│                   │
   │                     │                    │                   │
   │ 7. API Request + Bearer Token ──────────────────────────────▶│
   │    Authorization: Bearer <firebase_id_token>                 │
   │                     │                    │                   │
   │                     │                    │   8. Verify token │
   │                     │                    │◀──────────────────│
   │                     │                    │                   │
   │                     │                    │   9. Token valid  │
   │                     │                    │   + claims        │
   │                     │                    │──────────────────▶│
   │                     │                    │                   │
   │                     │                    │   10. Check domain│
   │                     │                    │   email.split('@')│
   │                     │                    │   ∈ allowlist?    │
   │                     │                    │                   │
   │ 11. API Response ◀──────────────────────────────────────────│
   │     (or 403 if denied)                   │                   │
   │                     │                    │                   │
└──┴───┘          └─────┴──────┘      └─────┴──────┘      └────┴─────┘
```

### Token Lifecycle

| Token | Issued By | Lifetime | Storage | Refresh |
|-------|-----------|----------|---------|---------|
| Google OAuth Token | Google | 1 hour | Firebase SDK (memory) | Automatic |
| Firebase ID Token | Firebase Auth | 1 hour | Client (memory) | `getIdToken(true)` |
| Service-to-Service Token | GCP IAM | ~1 hour | Cloud Function (runtime) | Metadata server |
| GCS Signed URL | Cloud Function | 15 minutes | Response body | New request |

---

## 6. MCP Protocol

### What is MCP?

The **Model Context Protocol (MCP)** is an open protocol that standardizes how applications provide context to AI models and how AI models interact with external tools and services.

### MCP in GenMedia Hub

Each Cloud Run service implements the MCP server specification:

```
┌─────────────────────────────────────────────────────┐
│                   MCP Server                         │
│                                                      │
│  ┌───────────────┐    ┌──────────────────────────┐  │
│  │  Transport     │    │  Tool Registry            │  │
│  │  (HTTP/SSE)    │    │                           │  │
│  │                │    │  • tool_1: description    │  │
│  │  Receives MCP  │───▶│  • tool_2: description    │  │
│  │  requests      │    │  • tool_n: description    │  │
│  └───────────────┘    └────────────┬─────────────┘  │
│                                     │                │
│                                     ▼                │
│  ┌──────────────────────────────────────────────┐   │
│  │  Tool Execution Engine                        │   │
│  │                                                │   │
│  │  1. Validate input parameters                 │   │
│  │  2. Call underlying service (Vertex AI, etc.) │   │
│  │  3. Process response                          │   │
│  │  4. Store artifacts (GCS)                     │   │
│  │  5. Return MCP-formatted result               │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### MCP Request Format

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "tools/call",
  "params": {
    "name": "generate_video",
    "arguments": {
      "prompt": "A cat playing piano in a jazz club",
      "model": "veo-3.1",
      "duration": "8s",
      "aspect_ratio": "16:9"
    }
  }
}
```

### MCP Response Format

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Video generated successfully."
      },
      {
        "type": "resource",
        "resource": {
          "uri": "gs://casey-genmedia-output/videos/gen-20260613-abc123.mp4",
          "mimeType": "video/mp4",
          "name": "generated-video.mp4"
        }
      }
    ],
    "isError": false
  }
}
```

### MCP Tool Discovery

Clients can discover available tools via the `tools/list` method:

```json
{
  "jsonrpc": "2.0",
  "id": "discovery-001",
  "method": "tools/list"
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": "discovery-001",
  "result": {
    "tools": [
      {
        "name": "generate_video",
        "description": "Generate a video from a text prompt using Veo models",
        "inputSchema": {
          "type": "object",
          "properties": {
            "prompt": { "type": "string", "description": "Text description of the video to generate" },
            "model": { "type": "string", "enum": ["veo-2", "veo-3", "veo-3.1"] },
            "duration": { "type": "string", "enum": ["5s", "8s", "10s", "15s"] },
            "aspect_ratio": { "type": "string", "enum": ["16:9", "9:16", "1:1"] }
          },
          "required": ["prompt"]
        }
      }
    ]
  }
}
```

---

## 7. Cloud Run Services

### Service Inventory

| Service Name | Cloud Run URL | Container | Memory | CPU | Concurrency | Min Instances |
|-------------|---------------|-----------|--------|-----|-------------|---------------|
| gstack-mcp | `gstack-mcp-*.run.app` | Node.js 18 | 1 GiB | 2 | 80 | 0 |
| mcp-veo | `mcp-veo-*.run.app` | Python 3.11 | 2 GiB | 2 | 10 | 0 |
| mcp-nanobanana | `mcp-nanobanana-*.run.app` | Python 3.11 | 1 GiB | 1 | 40 | 0 |
| mcp-lyria | `mcp-lyria-*.run.app` | Python 3.11 | 1 GiB | 1 | 20 | 0 |
| mcp-avtool | `mcp-avtool-*.run.app` | Python 3.11 + FFmpeg | 4 GiB | 4 | 5 | 0 |

### Service Configuration

Each service is deployed with:

```bash
gcloud run deploy SERVICE_NAME \
  --project casey-genmedia \
  --region us-central1 \
  --image gcr.io/casey-genmedia/SERVICE_NAME:latest \
  --no-allow-unauthenticated \
  --service-account casey-genmedia-compute@developer.gserviceaccount.com \
  --set-env-vars "GCP_PROJECT=casey-genmedia,GCS_BUCKET=casey-genmedia-output" \
  --memory 1Gi \
  --cpu 2 \
  --timeout 540 \
  --max-instances 10
```

### Auto-Scaling Behavior

```
Requests/sec    Instances
    0       →      0          (scale to zero when idle)
    1-10    →      1          (single instance handles low traffic)
   10-100   →      2-5        (auto-scale based on concurrency)
  100+      →      5-10       (max instances cap)
```

### Health Checks

Each service exposes:
- `GET /health` — Liveness probe (returns 200 if process is running)
- `GET /ready` — Readiness probe (returns 200 if service can accept requests)

---

## 8. GCS Storage Architecture

### Bucket Structure

```
gs://casey-genmedia-output/
├── videos/
│   ├── {user_id}/
│   │   ├── gen-20260613-{hash}.mp4
│   │   └── gen-20260613-{hash}-metadata.json
│   └── shared/
├── images/
│   ├── {user_id}/
│   │   ├── gen-20260613-{hash}.png
│   │   └── gen-20260613-{hash}-metadata.json
│   └── shared/
├── music/
│   ├── {user_id}/
│   │   ├── gen-20260613-{hash}.wav
│   │   └── gen-20260613-{hash}-metadata.json
│   └── shared/
├── speech/
│   ├── {user_id}/
│   │   ├── gen-20260613-{hash}.wav
│   │   └── gen-20260613-{hash}-metadata.json
│   └── shared/
├── composites/
│   ├── {user_id}/
│   │   └── gen-20260613-{hash}.mp4
│   └── shared/
└── temp/
    └── {job_id}/
        └── (intermediate files, auto-deleted after 24h)
```

### Object Naming Convention

```
{media_type}/gen-{date}-{8-char-hash}.{extension}

Example: videos/gen-20260613-a1b2c3d4.mp4
```

### Lifecycle Policies

| Path | Retention | Action |
|------|-----------|--------|
| `temp/` | 24 hours | Auto-delete |
| `*/shared/` | 90 days | Move to Nearline |
| `*/{user_id}/` | Indefinite | User-managed |

### Access Control

```bash
# Bucket-level IAM (no public access)
gsutil iam get gs://casey-genmedia-output/

# Object access via signed URLs only
# Generated by Cloud Function with 15-minute expiry
```

### Metadata Schema

Each generated file has a companion metadata JSON:

```json
{
  "generated_at": "2026-06-13T10:30:00Z",
  "user_id": "firebase-uid-abc123",
  "user_email": "user@criticalasset.com",
  "server": "genmedia-veo",
  "tool": "generate_video",
  "model": "veo-3.1",
  "prompt": "A cat playing piano in a jazz club",
  "parameters": {
    "duration": "8s",
    "aspect_ratio": "16:9"
  },
  "output": {
    "uri": "gs://casey-genmedia-output/videos/gen-20260613-a1b2c3d4.mp4",
    "mime_type": "video/mp4",
    "size_bytes": 15728640,
    "duration_seconds": 8
  },
  "cost_estimate": {
    "vertex_ai_cost": 0.35,
    "storage_cost": 0.0003
  }
}
```

---

## 9. Infrastructure as Code

### Terraform Structure (Recommended)

```
terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── modules/
│   ├── cloud-run/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── firebase/
│   │   ├── main.tf
│   │   └── variables.tf
│   ├── iam/
│   │   ├── main.tf
│   │   └── variables.tf
│   └── storage/
│       ├── main.tf
│       └── variables.tf
└── environments/
    ├── prod.tfvars
    └── dev.tfvars
```

### Key Terraform Resources

```hcl
# Cloud Run Service
resource "google_cloud_run_service" "mcp_veo" {
  name     = "mcp-veo"
  location = var.region
  project  = var.project_id

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/mcp-veo:latest"
        resources {
          limits = {
            memory = "2Gi"
            cpu    = "2"
          }
        }
        env {
          name  = "GCP_PROJECT"
          value = var.project_id
        }
        env {
          name  = "GCS_BUCKET"
          value = var.output_bucket
        }
      }
      service_account_name = google_service_account.cloud_run_sa.email
      timeout_seconds      = 540
    }
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "10"
        "run.googleapis.com/cpu-throttling" = "false"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# No public access
resource "google_cloud_run_service_iam_member" "invoker" {
  service  = google_cloud_run_service.mcp_veo.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.functions_sa.email}"
}
```

---

## 10. Performance Considerations

### Latency Budget

| Step | Target Latency | Notes |
|------|---------------|-------|
| Firebase Hosting → CDN | < 50ms | Edge-cached static assets |
| Client → Cloud Function | < 100ms | Regional function |
| Auth verification | < 50ms | Cached token verification |
| Function → Cloud Run | < 100ms | Same-region, internal network |
| Cloud Run processing | Varies | Depends on AI model |
| GCS upload | < 500ms | Same-region bucket |
| Signed URL generation | < 50ms | — |
| **Total overhead** | **< 850ms** | Excludes AI generation time |

### AI Generation Times (Approximate)

| Service | Operation | Typical Duration |
|---------|-----------|-----------------|
| gstack-mcp | Text generation | 2-15 seconds |
| mcp-veo (Veo 2) | Video generation | 30-90 seconds |
| mcp-veo (Veo 3.1) | Video generation | 60-180 seconds |
| mcp-nanobanana | Image generation | 5-20 seconds |
| mcp-lyria | Music generation | 10-45 seconds |
| genmedia-chirp3 | Speech synthesis | 2-10 seconds |
| mcp-avtool | AV compositing | 10-60 seconds (depends on input size) |

### Optimization Strategies

1. **Cold Start Mitigation:** Use CPU boost on Cloud Run; consider min-instances=1 for critical services
2. **Connection Pooling:** Reuse HTTP/2 connections to Vertex AI
3. **Async Processing:** Long-running generations use job polling, not synchronous HTTP
4. **CDN Caching:** Static assets cached at edge; API responses are never cached
5. **Regional Co-location:** All services in `us-central1` to minimize inter-service latency

### Scaling Limits

| Resource | Limit | Can Be Increased |
|----------|-------|-----------------|
| Cloud Run max instances (per service) | 10 | Yes (quota request) |
| Cloud Function invocations | 2M/month (free), unlimited (paid) | N/A |
| Vertex AI Gemini QPM | 60 | Yes (quota request) |
| Vertex AI Veo QPM | 5 | Yes (waitlist/quota) |
| GCS operations | 5,000 writes/sec | Yes |
| Firebase Auth | 10K users (free) | Unlimited (Blaze plan) |

---

## Appendix: Technology Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend | React + TypeScript + Vite | React 18, Vite 5 |
| Styling | Tailwind CSS | 3.x |
| Auth | Firebase Auth + Google Sign-In | Firebase 10.x |
| API Gateway | Cloud Functions (2nd Gen) | Node.js 18 |
| Backend Services | Cloud Run | Managed |
| AI Platform | Vertex AI | Latest |
| Storage | Google Cloud Storage | Standard |
| Monitoring | Cloud Logging + Cloud Monitoring | — |
| CI/CD | Cloud Build + GitHub Actions | — |
| IaC | Terraform (optional) | 1.5+ |

---

*Architecture Document — GenMedia Hub v1.0 — Last Updated: June 2026*
