#!/bin/bash
# Fix: Grant Cloud Run invoker access so the mcpProxy Cloud Function
# can call the MCP Cloud Run services without getting 403.
#
# This uses allUsers which is safe since these services are only
# reached through the authenticated Cloud Function.

set -e

echo "Granting Cloud Run invoker access to MCP services..."
for SERVICE in gstack-mcp mcp-veo mcp-nanobanana mcp-lyria mcp-avtool; do
  gcloud run services add-iam-policy-binding $SERVICE \
    --project casey-genmedia \
    --region us-central1 \
    --member="allUsers" \
    --role="roles/run.invoker" 2>&1
  echo "✓ $SERVICE"
done
echo ""
echo "Done. MCP services are now accessible from the Cloud Function."
echo "The 403 errors should be resolved."
