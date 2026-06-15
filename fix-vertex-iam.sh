#!/bin/bash
set -euo pipefail

PROJECT_ID="casey-genmedia"
SA="128509221012-compute@developer.gserviceaccount.com"

echo "Granting ALL Vertex AI permissions to: $SA"
echo ""

for ROLE in roles/aiplatform.user roles/ml.developer roles/ml.admin; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA}" \
    --role="$ROLE" \
    --quiet >/dev/null 2>&1
  echo "✓ Granted $ROLE"
done

echo ""
echo "Checking env vars on Cloud Run MCP services..."
echo ""

for SERVICE in mcp-nanobanana mcp-veo mcp-lyria mcp-avtool gstack-mcp; do
  echo "--- $SERVICE ---"
  gcloud run services describe $SERVICE \
    --project $PROJECT_ID \
    --region us-central1 \
    --format="yaml(spec.template.spec.containers[0].env)" 2>/dev/null | head -20
  echo ""
done

echo ""
echo "If GOOGLE_CLOUD_LOCATION is missing or set to 'global', fix each service with:"
echo "  gcloud run services update SERVICE --project casey-genmedia --region us-central1 --update-env-vars GOOGLE_CLOUD_LOCATION=us-central1"
echo ""
echo "Wait 60s for IAM propagation, then retry."
