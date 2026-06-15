#!/bin/bash
# =============================================================================
#  setup-kiro-creds.sh — Set up persistent GCP/Firebase credentials for Kiro
#  AND fix IAM permissions on Cloud Run MCP services
#
#  Run this ONCE from a terminal where you're logged into gcloud.
#  After this, Kiro will always have credentials.
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}▸${RESET} $*"; }
success() { echo -e "${GREEN}✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET} $*"; }
header()  { echo -e "\n${BOLD}${CYAN}━━━ $* ━━━${RESET}\n"; }

PROJECT_ID="casey-genmedia"
REGION="us-central1"
SA_NAME="kiro-deploy"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_PATH="$HOME/.config/gcloud/kiro-sa-key.json"

header "STEP 1: Fix Cloud Run IAM (MCP services)"
info "Granting allUsers invoker on MCP Cloud Run services..."
for SERVICE in gstack-mcp mcp-veo mcp-nanobanana mcp-lyria mcp-avtool; do
  gcloud run services add-iam-policy-binding "$SERVICE" \
    --project "$PROJECT_ID" --region "$REGION" \
    --member="allUsers" --role="roles/run.invoker" \
    --quiet 2>/dev/null && success "$SERVICE" || warn "$SERVICE (not found or already set)"
done

header "STEP 2: Create Service Account for Kiro"
if gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT_ID" >/dev/null 2>&1; then
  success "Service account already exists"
else
  gcloud iam service-accounts create "$SA_NAME" --project "$PROJECT_ID" --display-name "Kiro Deploy Agent"
  success "Created $SA_EMAIL"
fi

header "STEP 3: Grant Roles"
for ROLE in roles/firebase.admin roles/run.admin roles/cloudfunctions.admin roles/aiplatform.user roles/iam.serviceAccountUser roles/storage.admin; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" --role="$ROLE" --quiet >/dev/null 2>&1 && success "$ROLE" || warn "$ROLE"
done

header "STEP 4: Create Key File"
if [ -f "$KEY_PATH" ]; then
  warn "Key exists at $KEY_PATH — skipping"
else
  mkdir -p "$(dirname "$KEY_PATH")"
  gcloud iam service-accounts keys create "$KEY_PATH" --iam-account "$SA_EMAIL" --project "$PROJECT_ID"
  success "Key → $KEY_PATH"
fi

header "STEP 5: Add to Shell Profile"
SHELL_RC="$HOME/.zshrc"; [ -f "$SHELL_RC" ] || SHELL_RC="$HOME/.bashrc"
if grep -q "kiro-sa-key" "$SHELL_RC" 2>/dev/null; then
  success "Already in $SHELL_RC"
else
  echo -e "\n# Kiro GCP credentials\nexport GOOGLE_APPLICATION_CREDENTIALS=\"$KEY_PATH\"" >> "$SHELL_RC"
  success "Added to $SHELL_RC"
fi

header "STEP 6: Firebase CI Token"
echo -e "  Run: ${BOLD}firebase login:ci${RESET}"
echo -e "  Then add to $SHELL_RC:"
echo -e "  export FIREBASE_TOKEN=\"<paste-token>\""
echo ""
echo -e "  Finally: ${BOLD}source $SHELL_RC${RESET}"
echo ""
success "Done! Kiro will have persistent credentials after sourcing your shell."
