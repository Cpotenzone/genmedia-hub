#!/bin/bash
# =============================================================================
#  deploy.sh — GenMedia Hub Firebase Deployment Script
#  Usage: ./deploy.sh [--project <project-id>] [--skip-build] [--functions-only]
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# COLORS & HELPERS
# -----------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
header()  { echo -e "\n${BOLD}${CYAN}══════════════════════════════════════${RESET}"; \
             echo -e "${BOLD}${CYAN}  $*${RESET}"; \
             echo -e "${BOLD}${CYAN}══════════════════════════════════════${RESET}"; }

die() {
  error "$*"
  exit 1
}

# Trap unexpected errors
trap 'error "Unexpected error on line $LINENO. Deployment aborted."; exit 1' ERR

# -----------------------------------------------------------------------------
# DEFAULTS & ARGUMENT PARSING
# -----------------------------------------------------------------------------
PROJECT_ID="casey-genmedia"
SKIP_BUILD=false
FUNCTIONS_ONLY=false
HOSTING_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)    PROJECT_ID="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --functions-only) FUNCTIONS_ONLY=true; shift ;;
    --hosting-only)   HOSTING_ONLY=true; shift ;;
    -h|--help)
      echo "Usage: $0 [--project <id>] [--skip-build] [--functions-only] [--hosting-only]"
      exit 0
      ;;
    *) die "Unknown argument: $1" ;;
  esac
done

# -----------------------------------------------------------------------------
# SCRIPT DIRECTORY (so it works regardless of cwd)
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$SCRIPT_DIR"

# -----------------------------------------------------------------------------
# SECTION 1 — PRE-FLIGHT: CHECK REQUIRED TOOLS
# -----------------------------------------------------------------------------
header "1/5  Pre-flight Checks"

check_tool() {
  local cmd="$1"
  local install_hint="$2"
  if ! command -v "$cmd" &>/dev/null; then
    die "'$cmd' not found. $install_hint"
  fi
  local version
  version="$("$cmd" --version 2>&1 | head -1)"
  success "$cmd found  →  $version"
}

check_tool node   "Install Node.js from https://nodejs.org (v18+ recommended)"
check_tool npm    "npm ships with Node.js"
check_tool firebase "Install with: npm install -g firebase-tools"
check_tool gcloud   "Install from https://cloud.google.com/sdk/docs/install"

# Verify Firebase CLI is logged in
info "Checking Firebase login status…"
if ! firebase projects:list &>/dev/null; then
  warn "Not logged in to Firebase. Attempting login…"
  firebase login || die "Firebase login failed."
fi
success "Firebase CLI authenticated"

# Verify gcloud is authenticated
info "Checking gcloud auth…"
GCLOUD_ACCOUNT=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | head -1)
if [[ -z "$GCLOUD_ACCOUNT" ]]; then
  warn "No active gcloud account. Attempting login…"
  gcloud auth login || die "gcloud login failed."
else
  success "gcloud authenticated as: $GCLOUD_ACCOUNT"
fi

# Verify project exists & is accessible
info "Verifying Firebase project: $PROJECT_ID"
if ! firebase use "$PROJECT_ID" --project "$PROJECT_ID" &>/dev/null; then
  die "Cannot access Firebase project '$PROJECT_ID'. Run ./setup.sh first or check your permissions."
fi
success "Using project: $PROJECT_ID"

# -----------------------------------------------------------------------------
# SECTION 2 — INSTALL DEPENDENCIES
# -----------------------------------------------------------------------------
header "2/5  Installing Dependencies"

# Root app dependencies
info "Installing root app dependencies…"
cd "$APP_ROOT"
npm install --prefer-offline 2>&1 | tail -5
success "Root dependencies installed"

# Functions dependencies
if [[ -d "$APP_ROOT/functions" ]]; then
  info "Installing Cloud Functions dependencies…"
  cd "$APP_ROOT/functions"
  npm install --prefer-offline 2>&1 | tail -5
  success "Functions dependencies installed"
  cd "$APP_ROOT"
else
  warn "No functions/ directory found — skipping functions dependency install"
fi

# -----------------------------------------------------------------------------
# SECTION 3 — BUILD (Vite)
# -----------------------------------------------------------------------------
header "3/5  Building Application"

if [[ "$SKIP_BUILD" == true ]]; then
  warn "--skip-build flag set. Skipping Vite build."
elif [[ "$FUNCTIONS_ONLY" == true ]]; then
  warn "--functions-only flag set. Skipping Vite build."
else
  info "Running: npm run build"
  cd "$APP_ROOT"

  # Show a spinner while building
  npm run build 2>&1 | tee /tmp/genmedia-build.log
  BUILD_EXIT=${PIPESTATUS[0]}

  if [[ $BUILD_EXIT -ne 0 ]]; then
    error "Build failed. Last 20 lines of output:"
    tail -20 /tmp/genmedia-build.log >&2
    die "npm run build exited with code $BUILD_EXIT"
  fi

  # Confirm dist/ was produced
  if [[ ! -d "$APP_ROOT/dist" ]]; then
    die "Build appeared to succeed but dist/ directory not found."
  fi

  DIST_SIZE=$(du -sh "$APP_ROOT/dist" 2>/dev/null | cut -f1)
  success "Build complete → dist/  (${DIST_SIZE})"
fi

# -----------------------------------------------------------------------------
# SECTION 4 — FIREBASE DEPLOY
# -----------------------------------------------------------------------------
header "4/5  Deploying to Firebase"

cd "$APP_ROOT"
firebase use "$PROJECT_ID"

if [[ "$FUNCTIONS_ONLY" == true ]]; then
  info "Deploying Firebase Functions only…"
  firebase deploy --only functions --project "$PROJECT_ID" --non-interactive
  success "Functions deployed"

elif [[ "$HOSTING_ONLY" == true ]]; then
  info "Deploying Firebase Hosting only…"
  firebase deploy --only hosting --project "$PROJECT_ID" --non-interactive
  success "Hosting deployed"

else
  info "Deploying Firebase Hosting + Functions…"
  firebase deploy --only hosting,functions --project "$PROJECT_ID" --non-interactive
  success "Hosting + Functions deployed"
fi

# -----------------------------------------------------------------------------
# SECTION 5 — POST-DEPLOY SUMMARY
# -----------------------------------------------------------------------------
header "5/5  Deployment Complete 🚀"

# Extract hosting URL from Firebase project config
HOSTING_URL="https://${PROJECT_ID}.web.app"
ALT_URL="https://${PROJECT_ID}.firebaseapp.com"

echo ""
echo -e "  ${BOLD}Live URL:${RESET}       ${GREEN}${HOSTING_URL}${RESET}"
echo -e "  ${BOLD}Alternate URL:${RESET}  ${GREEN}${ALT_URL}${RESET}"
echo ""

# Fetch the actual deployed URL via Firebase CLI if available
DEPLOYED_URL=$(firebase hosting:channel:list --project "$PROJECT_ID" 2>/dev/null \
  | grep -E "live" | awk '{print $NF}' | head -1 || true)
if [[ -n "$DEPLOYED_URL" ]]; then
  echo -e "  ${BOLD}Confirmed URL:${RESET}  ${GREEN}${DEPLOYED_URL}${RESET}"
fi

echo ""
info "Deployment timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
info "Project: $PROJECT_ID"
info "To view logs: firebase functions:log --project $PROJECT_ID"
info "To rollback:  firebase hosting:clone ${PROJECT_ID}:live ${PROJECT_ID}:live --project $PROJECT_ID"
echo ""
success "All done! GenMedia Hub is live."
echo ""
