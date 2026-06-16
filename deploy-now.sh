#!/bin/bash
set -euo pipefail

PROJECT="casey-genmedia"
REGION="us-central1"
SA="128509221012-compute@developer.gserviceaccount.com"

echo "Opening browser for Google auth..."
gcloud auth login --project "$PROJECT" --quiet

echo "Opening browser for Firebase auth..."
firebase login --reauth

echo "Granting permissions..."
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:${SA}" --role="roles/aiplatform.admin" --quiet >/dev/null 2>&1
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:${SA}" --role="roles/datastore.user" --quiet >/dev/null 2>&1
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:${SA}" --role="roles/logging.viewer" --quiet >/dev/null 2>&1

for SERVICE in gstack-mcp mcp-veo mcp-nanobanana mcp-lyria mcp-avtool; do
  gcloud run services add-iam-policy-binding "$SERVICE" --project "$PROJECT" --region "$REGION" --member="serviceAccount:${SA}" --role="roles/run.invoker" --quiet >/dev/null 2>&1
done
echo "✓ Permissions set"

echo "Deploying..."
cd ~/genmedia-hub
firebase deploy --only hosting,functions --project "$PROJECT"

echo "✓ Done. Live at https://casey-genmedia.web.app"
