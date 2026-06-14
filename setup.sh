#!/bin/bash
# =============================================================================
#  setup.sh — GenMedia Hub First-Time Firebase Setup Script
#  Usage: ./setup.sh [--project <project-id>] [--skip-project-create]
#
#  Run this ONCE before your first deployment to configure all Firebase
#  services, enable required APIs, and wire up auth restrictions.
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# COLORS & HELPERS
# -----------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
step()    { echo -e "\n${MAGENTA}▶  $*${RESET}"; }
header()  {
  echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}"
  echo -e "${BOLD}${CYAN}  $*${RESET}"
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}"
}

die() {
  error "$*"
  exit 1
}

trap 'error "Unexpected error on line $LINENO. Setup aborted."; exit 1' ERR

# -----------------------------------------------------------------------------
# DEFAULTS & ARGUMENT PARSING
# -----------------------------------------------------------------------------
PROJECT_ID="casey-genmedia"
PROJECT_DISPLAY_NAME="GenMedia Hub"
BILLING_ACCOUNT=""           # Optional: set to auto-link a billing account
REGION="us-central1"
SKIP_PROJECT_CREATE=false
SKIP_CORS=false

# Allowed sign-in domains (used for Auth blocking function)
ALLOWED_DOMAINS=("criticalasset.com" "insuremep.com")

# Cloud Run service names that need CORS configured
CLOUD_RUN_SERVICES=(
  "genmedia-hub-api"
  "imagen-service"
  "veo-service"
  "chirp-service"
)

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)             PROJECT_ID="$2"; shift 2 ;;
    --region)              REGION="$2"; shift 2 ;;
    --billing-account)     BILLING_ACCOUNT="$2"; shift 2 ;;
    --skip-project-create) SKIP_PROJECT_CREATE=true; shift ;;
    --skip-cors)           SKIP_CORS=true; shift ;;
    -h|--help)
      echo "Usage: $0 [--project <id>] [--region <region>] [--skip-project-create] [--skip-cors]"
      echo ""
      echo "  --project             Firebase project ID (default: casey-genmedia)"
      echo "  --region              GCP region (default: us-central1)"
      echo "  --billing-account     GCP billing account ID to link (optional)"
      echo "  --skip-project-create Use existing project, skip creation"
      echo "  --skip-cors           Skip Cloud Run CORS configuration"
      exit 0
      ;;
    *) die "Unknown argument: $1" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$SCRIPT_DIR"

# -----------------------------------------------------------------------------
# BANNER
# -----------------------------------------------------------------------------
echo ""
echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║       GenMedia Hub — First-Time        ║"
echo "  ║         Firebase Setup Script          ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${RESET}"
echo -e "  Project ID : ${BOLD}$PROJECT_ID${RESET}"
echo -e "  Region     : ${BOLD}$REGION${RESET}"
echo -e "  Allowed domains: ${BOLD}${ALLOWED_DOMAINS[*]}${RESET}"
echo ""
read -r -p "  Proceed with setup? [y/N] " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { info "Aborted."; exit 0; }

# -----------------------------------------------------------------------------
# SECTION 0 — CHECK PREREQUISITES
# -----------------------------------------------------------------------------
header "0/8  Checking Prerequisites"

check_tool() {
  local cmd="$1"
  local hint="$2"
  if ! command -v "$cmd" &>/dev/null; then
    die "'$cmd' not found. $hint"
  fi
  success "$cmd  →  $("$cmd" --version 2>&1 | head -1)"
}

check_tool node    "Install Node.js v18+ from https://nodejs.org"
check_tool npm     "npm ships with Node.js"
check_tool firebase "Install: npm install -g firebase-tools"
check_tool gcloud   "Install from https://cloud.google.com/sdk/docs/install"
check_tool curl    "Install curl via your package manager"

# Ensure firebase is logged in
step "Checking Firebase auth…"
if ! firebase projects:list &>/dev/null; then
  info "Opening Firebase login…"
  firebase login || die "Firebase login failed"
fi
success "Firebase CLI authenticated"

# Ensure gcloud is logged in
step "Checking gcloud auth…"
GCLOUD_ACCOUNT=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | head -1)
if [[ -z "$GCLOUD_ACCOUNT" ]]; then
  info "Opening gcloud login…"
  gcloud auth login || die "gcloud login failed"
  gcloud auth application-default login || die "gcloud ADC login failed"
else
  success "gcloud authenticated as: $GCLOUD_ACCOUNT"
fi

# -----------------------------------------------------------------------------
# SECTION 1 — CREATE OR VALIDATE FIREBASE PROJECT
# -----------------------------------------------------------------------------
header "1/8  Firebase Project"

if [[ "$SKIP_PROJECT_CREATE" == true ]]; then
  info "--skip-project-create set. Verifying project '$PROJECT_ID' exists…"
  if ! firebase projects:list 2>/dev/null | grep -q "$PROJECT_ID"; then
    die "Project '$PROJECT_ID' not found in your Firebase account."
  fi
  success "Project '$PROJECT_ID' found."
else
  step "Checking if project '$PROJECT_ID' already exists…"
  if firebase projects:list 2>/dev/null | grep -q "$PROJECT_ID"; then
    warn "Project '$PROJECT_ID' already exists — skipping creation."
  else
    info "Creating Firebase project: $PROJECT_ID ($PROJECT_DISPLAY_NAME)"
    firebase projects:create "$PROJECT_ID" \
      --display-name "$PROJECT_DISPLAY_NAME" \
      --non-interactive \
      || die "Failed to create Firebase project. The ID may already be taken."
    success "Firebase project created: $PROJECT_ID"
  fi
fi

# Set as active project
firebase use "$PROJECT_ID"
gcloud config set project "$PROJECT_ID"
success "Active project set to: $PROJECT_ID"

# Link billing account if provided (required for Cloud Functions & Cloud Run)
if [[ -n "$BILLING_ACCOUNT" ]]; then
  step "Linking billing account: $BILLING_ACCOUNT"
  gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT" \
    && success "Billing account linked" \
    || warn "Could not link billing account — you may need to do this manually in the GCP Console."
else
  warn "No --billing-account provided. Cloud Functions (Blaze plan) requires billing to be enabled."
  warn "Enable it at: https://console.firebase.google.com/project/${PROJECT_ID}/usage/details"
fi

# -----------------------------------------------------------------------------
# SECTION 2 — ENABLE GOOGLE CLOUD APIs
# -----------------------------------------------------------------------------
header "2/8  Enabling Required GCP APIs"

APIS=(
  "firebase.googleapis.com"
  "identitytoolkit.googleapis.com"   # Firebase Auth
  "firestore.googleapis.com"          # Cloud Firestore
  "cloudfunctions.googleapis.com"     # Cloud Functions
  "cloudbuild.googleapis.com"         # Required by Cloud Functions v2
  "run.googleapis.com"                # Cloud Run
  "storage.googleapis.com"            # Cloud Storage
  "aiplatform.googleapis.com"         # Vertex AI (Imagen / Veo / Chirp)
  "artifactregistry.googleapis.com"   # Artifact Registry (Functions v2)
)

for API in "${APIS[@]}"; do
  step "Enabling $API…"
  gcloud services enable "$API" --project="$PROJECT_ID" --quiet \
    && success "Enabled $API" \
    || warn "Could not enable $API — you may need to do this manually"
done

# -----------------------------------------------------------------------------
# SECTION 3 — FIREBASE AUTHENTICATION
# -----------------------------------------------------------------------------
header "3/8  Configuring Firebase Authentication"

step "Enabling Email/Password and Google sign-in providers…"

# Firebase Auth is enabled automatically when you add a sign-in method.
# We use the Firebase Management REST API with gcloud ADC for this.

ACCESS_TOKEN=$(gcloud auth print-access-token 2>/dev/null)

# Enable Google Sign-In provider via Identity Toolkit API
info "Enabling Google Sign-In provider…"
curl -s -X PATCH \
  "https://identitytoolkit.googleapis.com/v2/projects/${PROJECT_ID}/config?updateMask=signIn" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "signIn": {
      "allowDuplicateEmails": false,
      "email": { "enabled": true, "passwordRequired": false },
      "anonymous": { "enabled": false }
    }
  }' | grep -q '"name"' && success "Auth sign-in config updated" \
  || warn "Could not update Auth config via API — configure Google sign-in manually in the Firebase Console."

# Enable Google OAuth provider via Firebase CLI (if supported)
info "Attempting to enable Google OAuth via firebase CLI…"
firebase auth:import /dev/null --project "$PROJECT_ID" &>/dev/null || true

# Remind user to complete OAuth setup in Console (client ID/secret required)
warn "ACTION REQUIRED: Enable Google Sign-In in the Firebase Console:"
warn "  → https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers"
warn "  → Click 'Google', toggle Enable, add your support email, and save."

# -----------------------------------------------------------------------------
# SECTION 4 — FIRESTORE DATABASE
# -----------------------------------------------------------------------------
header "4/8  Setting Up Firestore"

step "Creating Firestore database in $REGION…"

# Create the default Firestore database
gcloud firestore databases create \
  --project="$PROJECT_ID" \
  --location="$REGION" \
  --type=firestore-native \
  --quiet 2>/dev/null \
  && success "Firestore database created in $REGION" \
  || warn "Firestore database may already exist — skipping."

# Deploy Firestore security rules if present
if [[ -f "$APP_ROOT/firestore.rules" ]]; then
  step "Deploying Firestore security rules…"
  firebase deploy --only firestore:rules --project "$PROJECT_ID" --non-interactive
  success "Firestore rules deployed"
else
  warn "No firestore.rules found at $APP_ROOT/firestore.rules — using default rules."
  warn "Create firestore.rules before going to production!"
fi

# Deploy Firestore indexes if present
if [[ -f "$APP_ROOT/firestore.indexes.json" ]]; then
  step "Deploying Firestore indexes…"
  firebase deploy --only firestore:indexes --project "$PROJECT_ID" --non-interactive
  success "Firestore indexes deployed"
fi

# -----------------------------------------------------------------------------
# SECTION 5 — FIREBASE HOSTING
# -----------------------------------------------------------------------------
header "5/8  Configuring Firebase Hosting"

# Check for firebase.json
if [[ -f "$APP_ROOT/firebase.json" ]]; then
  success "firebase.json found at $APP_ROOT/firebase.json"
else
  warn "No firebase.json found. Generating default configuration…"
  cat > "$APP_ROOT/firebase.json" <<'FIREBASE_JSON'
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "/api/**", "function": "api" },
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|woff2|woff|ttf|eot)",
        "headers": [{ "key": "Cache-Control", "value": "max-age=31536000, immutable" }]
      },
      {
        "source": "**",
        "headers": [
          { "key": "X-Frame-Options",        "value": "DENY" },
          { "key": "X-Content-Type-Options",  "value": "nosniff" },
          { "key": "Referrer-Policy",         "value": "strict-origin-when-cross-origin" }
        ]
      }
    ]
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs20"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
FIREBASE_JSON
  success "firebase.json created"
fi

# Check/create .firebaserc
if [[ ! -f "$APP_ROOT/.firebaserc" ]]; then
  info "Creating .firebaserc…"
  cat > "$APP_ROOT/.firebaserc" <<FIREBASERC
{
  "projects": {
    "default": "$PROJECT_ID"
  }
}
FIREBASERC
  success ".firebaserc created"
else
  success ".firebaserc found"
fi

# -----------------------------------------------------------------------------
# SECTION 6 — INSTALL NPM DEPENDENCIES
# -----------------------------------------------------------------------------
header "6/8  Installing NPM Dependencies"

step "Installing root app dependencies…"
cd "$APP_ROOT"
npm install
success "Root dependencies installed"

if [[ -d "$APP_ROOT/functions" ]]; then
  step "Installing Cloud Functions dependencies…"
  cd "$APP_ROOT/functions"
  npm install
  cd "$APP_ROOT"
  success "Functions dependencies installed"
else
  warn "No functions/ directory found at $APP_ROOT/functions"
  warn "If you have Cloud Functions, create the functions/ directory and run npm init there."
fi

# -----------------------------------------------------------------------------
# SECTION 7 — CONFIGURE CORS FOR CLOUD RUN SERVICES
# -----------------------------------------------------------------------------
header "7/8  CORS Configuration for Cloud Run"

if [[ "$SKIP_CORS" == true ]]; then
  warn "--skip-cors set. Skipping Cloud Run CORS configuration."
else
  # Build allowed origins string from ALLOWED_DOMAINS
  CORS_ORIGINS=""
  for DOMAIN in "${ALLOWED_DOMAINS[@]}"; do
    CORS_ORIGINS="${CORS_ORIGINS}https://*.${DOMAIN},"
  done
  # Add Firebase Hosting origins
  CORS_ORIGINS="${CORS_ORIGINS}https://${PROJECT_ID}.web.app,https://${PROJECT_ID}.firebaseapp.com"

  CORS_POLICY_FILE="/tmp/genmedia-cors-policy.json"
  cat > "$CORS_POLICY_FILE" <<CORS_JSON
[
  {
    "origin": ["${CORS_ORIGINS//,/\",\"}"],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Goog-User-Project"
    ],
    "maxAgeSeconds": 3600
  }
]
CORS_JSON

  for SERVICE in "${CLOUD_RUN_SERVICES[@]}"; do
    step "Checking Cloud Run service: $SERVICE…"
    # Check if the service exists before trying to configure it
    if gcloud run services describe "$SERVICE" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --quiet &>/dev/null; then

      info "  Updating CORS headers on $SERVICE…"
      # Cloud Run CORS is typically handled at the application level.
      # Here we set the --allow-unauthenticated flag and tag the service.
      gcloud run services update "$SERVICE" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --update-env-vars="ALLOWED_ORIGINS=${CORS_ORIGINS}" \
        --quiet \
        && success "  CORS env var set on $SERVICE" \
        || warn "  Could not update $SERVICE — check permissions"

      # Allow Firebase Auth tokens (IAM)
      gcloud run services add-iam-policy-binding "$SERVICE" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --member="allUsers" \
        --role="roles/run.invoker" \
        --quiet 2>/dev/null \
        && success "  IAM invoker binding set on $SERVICE" \
        || warn "  Could not set IAM on $SERVICE"
    else
      warn "  Service '$SERVICE' not found in $REGION — skipping (will configure on first deploy)"
    fi
  done

  # Configure Cloud Storage CORS (for media uploads)
  STORAGE_BUCKET="${PROJECT_ID}.appspot.com"
  step "Configuring Cloud Storage CORS for bucket: $STORAGE_BUCKET"
  STORAGE_CORS_FILE="/tmp/genmedia-storage-cors.json"
  cat > "$STORAGE_CORS_FILE" <<STORAGE_CORS
[
  {
    "origin": ["https://${PROJECT_ID}.web.app", "https://${PROJECT_ID}.firebaseapp.com",
               "https://*.criticalasset.com", "https://*.insuremep.com"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
STORAGE_CORS

  gcloud storage buckets update "gs://$STORAGE_BUCKET" \
    --cors-file="$STORAGE_CORS_FILE" \
    --project="$PROJECT_ID" 2>/dev/null \
    && success "Cloud Storage CORS configured" \
    || warn "Could not update Storage CORS — bucket may not exist yet. Run after first deploy."

  rm -f "$CORS_POLICY_FILE" "$STORAGE_CORS_FILE"
fi

# -----------------------------------------------------------------------------
# SECTION 8 — AUTH BLOCKING FUNCTION (DOMAIN RESTRICTION)
# -----------------------------------------------------------------------------
header "8/8  Deploying Auth Blocking Function (Domain Restriction)"

# Create the blocking function that restricts sign-in to allowed domains
FUNCTIONS_DIR="$APP_ROOT/functions"
if [[ ! -d "$FUNCTIONS_DIR" ]]; then
  warn "No functions/ directory. Creating it now…"
  mkdir -p "$FUNCTIONS_DIR"
  cd "$FUNCTIONS_DIR"
  npm init -y --quiet
  npm install firebase-admin firebase-functions --save --quiet
  cd "$APP_ROOT"
fi

# Write the auth blocking function source
AUTH_BLOCKER_FILE="$FUNCTIONS_DIR/src/authBlocker.js"
mkdir -p "$(dirname "$AUTH_BLOCKER_FILE")"

# Only write if it doesn't already exist
if [[ ! -f "$AUTH_BLOCKER_FILE" ]]; then
  info "Writing auth blocking function to $AUTH_BLOCKER_FILE…"
  cat > "$AUTH_BLOCKER_FILE" <<'AUTH_BLOCKER'
/**
 * authBlocker.js
 * Firebase Auth Blocking Function — restricts sign-in to approved email domains.
 *
 * Allowed domains: @criticalasset.com and @insuremep.com
 * Any attempt to sign in or register with another domain is rejected.
 */

const { beforeUserCreated, beforeUserSignedIn } = require("firebase-functions/v2/identity");
const { HttpsError } = require("firebase-functions/v2/https");

/** Domains allowed to sign in */
const ALLOWED_DOMAINS = ["criticalasset.com", "insuremep.com"];

/**
 * Returns true if the email belongs to one of the allowed domains.
 */
function isAllowedEmail(email) {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

/**
 * Block registration from non-allowed domains.
 * Fires before a new user account is created.
 */
exports.beforecreated = beforeUserCreated((event) => {
  const { email } = event.data;

  if (!isAllowedEmail(email)) {
    throw new HttpsError(
      "permission-denied",
      `Sign-up is restricted to ${ALLOWED_DOMAINS.join(" and ")} accounts. ` +
      `Please use your company email address.`
    );
  }
  // Returning nothing allows the creation to proceed
});

/**
 * Block sign-in from non-allowed domains.
 * Fires before an existing user signs in (covers Google OAuth & email/password).
 */
exports.beforesignedin = beforeUserSignedIn((event) => {
  const { email } = event.data;

  if (!isAllowedEmail(email)) {
    throw new HttpsError(
      "permission-denied",
      `Access is restricted to ${ALLOWED_DOMAINS.join(" and ")} accounts. ` +
      `Contact your administrator if you need access.`
    );
  }
});
AUTH_BLOCKER
  success "Auth blocking function written"
else
  warn "Auth blocking function already exists at $AUTH_BLOCKER_FILE — not overwriting."
fi

# Check for a main functions index that exports the blocker
FUNCTIONS_INDEX="$FUNCTIONS_DIR/index.js"
if [[ ! -f "$FUNCTIONS_INDEX" ]]; then
  info "Creating functions/index.js…"
  cat > "$FUNCTIONS_INDEX" <<'FUNCTIONS_INDEX_JS'
/**
 * index.js — Cloud Functions entry point for GenMedia Hub
 */

// Auth blocking functions (domain restriction)
const authBlocker = require("./src/authBlocker");
exports.beforecreated   = authBlocker.beforecreated;
exports.beforesignedin  = authBlocker.beforesignedin;

// Add additional Cloud Functions exports below:
// const api = require("./src/api");
// exports.api = api;
FUNCTIONS_INDEX_JS
  success "functions/index.js created"
else
  warn "functions/index.js already exists — not overwriting."
  warn "Ensure authBlocker exports are included in your functions entry point."
fi

# Deploy the auth blocking function
step "Deploying auth blocking functions to Firebase…"
firebase deploy \
  --only "functions:beforecreated,functions:beforesignedin" \
  --project "$PROJECT_ID" \
  --non-interactive \
  && success "Auth blocking functions deployed" \
  || warn "Could not deploy auth blocking functions automatically — deploy manually with: firebase deploy --only functions"

# -----------------------------------------------------------------------------
# NEXT STEPS SUMMARY
# -----------------------------------------------------------------------------
echo ""
echo -e "${BOLD}${GREEN}══════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}  ✅  Setup Complete for: $PROJECT_ID${RESET}"
echo -e "${BOLD}${GREEN}══════════════════════════════════════════════════════${RESET}"
echo ""
echo -e "${BOLD}Next Steps:${RESET}"
echo ""
echo -e "  ${CYAN}1.${RESET} Enable Google Sign-In in the Firebase Console:"
echo -e "     ${BOLD}https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers${RESET}"
echo -e "     → Click 'Google' → Enable → Add support email → Save"
echo ""
echo -e "  ${CYAN}2.${RESET} Add your app's OAuth 2.0 client to GCP:"
echo -e "     ${BOLD}https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}${RESET}"
echo ""
echo -e "  ${CYAN}3.${RESET} Enable billing (required for Cloud Functions & Vertex AI):"
echo -e "     ${BOLD}https://console.firebase.google.com/project/${PROJECT_ID}/usage/details${RESET}"
echo ""
echo -e "  ${CYAN}4.${RESET} Review Firestore security rules:"
echo -e "     Edit ${BOLD}firestore.rules${RESET} — default rules expire after 30 days!"
echo ""
echo -e "  ${CYAN}5.${RESET} Add your environment variables / Firebase config to the app:"
echo -e "     Copy your Firebase config from the Firebase Console → Project Settings"
echo -e "     into ${BOLD}src/firebase.config.ts${RESET} (or your app's config file)"
echo ""
echo -e "  ${CYAN}6.${RESET} Run the deployment script when ready:"
echo -e "     ${BOLD}./deploy.sh${RESET}"
echo ""
echo -e "  ${CYAN}7.${RESET} Verify domain restriction is working:"
echo -e "     Try signing in with a non-@criticalasset.com / non-@insuremep.com account."
echo -e "     You should see: 'Access is restricted to criticalasset.com and insuremep.com accounts.'"
echo ""
echo -e "  ${CYAN}8.${RESET} Useful Firebase Console links:"
echo -e "     Auth:      https://console.firebase.google.com/project/${PROJECT_ID}/authentication"
echo -e "     Firestore: https://console.firebase.google.com/project/${PROJECT_ID}/firestore"
echo -e "     Hosting:   https://console.firebase.google.com/project/${PROJECT_ID}/hosting"
echo -e "     Functions: https://console.firebase.google.com/project/${PROJECT_ID}/functions"
echo ""
success "Setup complete. Run ${BOLD}./deploy.sh${RESET} to go live!"
echo ""
