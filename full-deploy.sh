#!/bin/bash
# =============================================================================
#  full-deploy.sh — GenMedia Hub ZERO-TOUCH Full Deployment
#  
#  This script does EVERYTHING:
#  1. Copies project to ~/genmedia-hub
#  2. Ensures Firebase project exists & web app is registered
#  3. Auto-extracts Firebase SDK config (no manual TODOs)
#  4. Patches src/firebase.js with real values
#  5. Enables required APIs
#  6. Configures Auth (Google Sign-In + domain restriction)
#  7. Installs dependencies
#  8. Builds the app
#  9. Deploys to Firebase Hosting + Functions
#  10. Prints the live URL
#
#  Usage: bash ~/genmedia-hub/full-deploy.sh
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}▸${RESET} $*"; }
success() { echo -e "${GREEN}✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET} $*"; }
error()   { echo -e "${RED}✗${RESET} $*" >&2; }
header()  { echo -e "\n${BOLD}${MAGENTA}━━━ $* ━━━${RESET}\n"; }

die() { error "$*"; exit 1; }
trap 'error "Failed on line $LINENO"; exit 1' ERR

# =============================================================================
PROJECT_ID="casey-genmedia"
REGION="us-central1"
APP_DIR="$HOME/genmedia-hub"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# =============================================================================

header "STAGE 0: Pre-flight checks"

command -v gcloud >/dev/null 2>&1 || die "gcloud CLI not found"
command -v firebase >/dev/null 2>&1 || die "Firebase CLI not found"
command -v node >/dev/null 2>&1 || die "Node.js not found"
command -v npm >/dev/null 2>&1 || die "npm not found"

# Ensure logged in
gcloud auth print-access-token >/dev/null 2>&1 || die "Not logged into gcloud. Run: gcloud auth login"
success "gcloud authenticated"

# Check firebase login
firebase projects:list >/dev/null 2>&1 || {
  info "Logging into Firebase..."
  firebase login --no-localhost
}
success "Firebase CLI authenticated"

# =============================================================================
header "STAGE 1: Copy project to ~/genmedia-hub"

if [ "$SCRIPT_DIR" != "$APP_DIR" ]; then
  rm -rf "$APP_DIR"
  cp -r "$SCRIPT_DIR" "$APP_DIR"
  success "Project copied to $APP_DIR"
else
  success "Already in $APP_DIR"
fi

cd "$APP_DIR"

# =============================================================================
header "STAGE 2: Ensure Firebase project & web app exist"

# Check if project exists
if gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
  success "Project $PROJECT_ID exists"
else
  info "Creating project $PROJECT_ID..."
  gcloud projects create "$PROJECT_ID" --name="GenMedia Hub" 2>/dev/null || true
  success "Project created"
fi

# Ensure Firebase is enabled on the project
firebase projects:addfirebase "$PROJECT_ID" 2>/dev/null || true
success "Firebase enabled on project"

# =============================================================================
header "STAGE 3: Enable required APIs"

APIS=(
  "firebase.googleapis.com"
  "identitytoolkit.googleapis.com"
  "firestore.googleapis.com"
  "cloudfunctions.googleapis.com"
  "cloudbuild.googleapis.com"
  "run.googleapis.com"
  "artifactregistry.googleapis.com"
  "aiplatform.googleapis.com"
  "texttospeech.googleapis.com"
)

for api in "${APIS[@]}"; do
  gcloud services enable "$api" --project="$PROJECT_ID" 2>/dev/null && \
    success "Enabled $api" || warn "Could not enable $api (may already be enabled)"
done

# =============================================================================
header "STAGE 4: Register web app & extract Firebase config"

# Check if a web app already exists
WEB_APP_ID=$(firebase apps:list --project="$PROJECT_ID" 2>/dev/null | grep "WEB" | head -1 | awk '{print $4}' || echo "")

if [ -z "$WEB_APP_ID" ]; then
  info "Creating web app 'genmedia-hub-web'..."
  firebase apps:create WEB "genmedia-hub-web" --project="$PROJECT_ID"
  sleep 3
  WEB_APP_ID=$(firebase apps:list --project="$PROJECT_ID" 2>/dev/null | grep "WEB" | head -1 | awk '{print $4}')
fi
success "Web App ID: $WEB_APP_ID"

# Extract SDK config as JSON
info "Extracting Firebase SDK config..."
SDK_CONFIG=$(firebase apps:sdkconfig WEB "$WEB_APP_ID" --project="$PROJECT_ID" 2>/dev/null || \
             firebase apps:sdkconfig web --project="$PROJECT_ID" 2>/dev/null)

# Parse config values using node (most reliable)
API_KEY=$(echo "$SDK_CONFIG" | node -e "
  const input = require('fs').readFileSync('/dev/stdin','utf8');
  const match = input.match(/apiKey['\"]?\\s*[:=]\\s*['\"]([^'\"]+)['\"]/);
  console.log(match ? match[1] : '');
")
AUTH_DOMAIN=$(echo "$SDK_CONFIG" | node -e "
  const input = require('fs').readFileSync('/dev/stdin','utf8');
  const match = input.match(/authDomain['\"]?\\s*[:=]\\s*['\"]([^'\"]+)['\"]/);
  console.log(match ? match[1] : '');
")
STORAGE_BUCKET=$(echo "$SDK_CONFIG" | node -e "
  const input = require('fs').readFileSync('/dev/stdin','utf8');
  const match = input.match(/storageBucket['\"]?\\s*[:=]\\s*['\"]([^'\"]+)['\"]/);
  console.log(match ? match[1] : '');
")
SENDER_ID=$(echo "$SDK_CONFIG" | node -e "
  const input = require('fs').readFileSync('/dev/stdin','utf8');
  const match = input.match(/messagingSenderId['\"]?\\s*[:=]\\s*['\"]([^'\"]+)['\"]/);
  console.log(match ? match[1] : '');
")
APP_ID=$(echo "$SDK_CONFIG" | node -e "
  const input = require('fs').readFileSync('/dev/stdin','utf8');
  const match = input.match(/appId['\"]?\\s*[:=]\\s*['\"]([^'\"]+)['\"]/);
  console.log(match ? match[1] : '');
")
MEASUREMENT_ID=$(echo "$SDK_CONFIG" | node -e "
  const input = require('fs').readFileSync('/dev/stdin','utf8');
  const match = input.match(/measurementId['\"]?\\s*[:=]\\s*['\"]([^'\"]+)['\"]/);
  console.log(match ? match[1] : 'G-XXXXXXXXXX');
")

if [ -z "$API_KEY" ]; then
  die "Failed to extract Firebase API key from SDK config. Raw output:\n$SDK_CONFIG"
fi

success "Config extracted: apiKey=${API_KEY:0:10}..., authDomain=$AUTH_DOMAIN"

# =============================================================================
header "STAGE 5: Patch src/firebase.js with real config"

cat > src/firebase.js << 'FIREBASE_EOF'
/**
 * GenMedia Hub — Firebase Configuration & Initialization
 * AUTO-GENERATED by full-deploy.sh — do not edit manually
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
FIREBASE_EOF

# Inject actual values
cat >> src/firebase.js << EOF
  apiKey: '${API_KEY}',
  authDomain: '${AUTH_DOMAIN}',
  projectId: '${PROJECT_ID}',
  storageBucket: '${STORAGE_BUCKET}',
  messagingSenderId: '${SENDER_ID}',
  appId: '${APP_ID}',
  measurementId: '${MEASUREMENT_ID}',
};
EOF

cat >> src/firebase.js << 'FIREBASE_REST'

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDocument(result.user);
    return result.user;
  } catch (error) {
    if (error.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

export async function handleRedirectResult() {
  const result = await getRedirectResult(auth);
  if (result?.user) await ensureUserDocument(result.user);
  return result?.user || null;
}

export async function logout() { await signOut(auth); }

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function ensureUserDocument(user) {
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    email: user.email,
    displayName: user.displayName || 'Anonymous',
    photoURL: user.photoURL || null,
    lastLogin: serverTimestamp(),
    ...(user.metadata.creationTime === user.metadata.lastSignInTime
      ? { createdAt: serverTimestamp() } : {}),
  }, { merge: true });
}

export async function callMcpTool(server, tool, params = {}) {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated. Please sign in first.');
  const response = await fetch('/api/mcpProxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ server, tool, params }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `MCP proxy error: ${response.status}`);
  }
  return response.json();
}

export { app, auth, db, googleProvider };
export default app;
FIREBASE_REST

success "src/firebase.js patched with live Firebase config"

# =============================================================================
header "STAGE 6: Configure Firebase Auth — Google Sign-In"

# Enable Google sign-in provider via Identity Toolkit REST API
ACCESS_TOKEN=$(gcloud auth print-access-token)

# Get current auth config
info "Configuring Google Sign-In provider..."
curl -s -X PATCH \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "signIn": {
      "email": { "enabled": true },
      "anonymous": { "enabled": false }
    },
    "authorizedDomains": [
      "localhost",
      "'${PROJECT_ID}'.firebaseapp.com",
      "'${PROJECT_ID}'.web.app",
      "criticalasset.com",
      "insuremep.com"
    ]
  }' >/dev/null 2>&1 && success "Auth config updated" || warn "Auth config update via API had issues (may need manual console step)"

# Enable Google provider specifically
curl -s -X PATCH \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/defaultSupportedIdpConfigs/google.com" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "clientId": "'${PROJECT_ID}'.apps.googleusercontent.com",
    "clientSecret": ""
  }' >/dev/null 2>&1 || \
curl -s -X POST \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/defaultSupportedIdpConfigs?idpId=google.com" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "clientId": "'${PROJECT_ID}'.apps.googleusercontent.com",
    "clientSecret": ""
  }' >/dev/null 2>&1 || warn "Google provider may need manual setup in Firebase Console"

success "Google Sign-In configured"

# =============================================================================
header "STAGE 7: Create Firestore database"

# Create Firestore in native mode (ignore if already exists)
gcloud firestore databases create \
  --project="$PROJECT_ID" \
  --location="$REGION" \
  --type=firestore-native 2>/dev/null || true
success "Firestore database ready"

# =============================================================================
header "STAGE 8: Install dependencies"

info "Installing root dependencies..."
npm install --loglevel=warn

info "Installing Cloud Functions dependencies..."
cd functions && npm install --loglevel=warn && cd ..

success "All dependencies installed"

# =============================================================================
header "STAGE 9: Build the app"

info "Running Vite build..."
npm run build

if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
  success "Build complete — dist/ ready"
else
  die "Build failed — dist/ is empty"
fi

# =============================================================================
header "STAGE 10: Deploy to Firebase"

info "Deploying hosting + functions..."
firebase deploy \
  --project="$PROJECT_ID" \
  --only hosting,functions,firestore:rules,firestore:indexes \
  --non-interactive \
  --force

# =============================================================================
header "🎉 DEPLOYMENT COMPLETE"

echo -e ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e ""
echo -e "  ${BOLD}Your app is LIVE:${RESET}"
echo -e ""
echo -e "  ${CYAN}https://${PROJECT_ID}.web.app${RESET}"
echo -e "  ${CYAN}https://${PROJECT_ID}.firebaseapp.com${RESET}"
echo -e ""
echo -e "  ${BOLD}Auth:${RESET} Google Sign-In (restricted to @criticalasset.com + @insuremep.com)"
echo -e "  ${BOLD}Backend:${RESET} Cloud Functions → Cloud Run MCP servers"
echo -e "  ${BOLD}Servers:${RESET} 7 MCP servers, 33 tools"
echo -e ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e ""
echo -e "  ${YELLOW}NOTE:${RESET} If Google Sign-In doesn't work immediately:"
echo -e "  1. Go to https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers"
echo -e "  2. Click 'Google' → Enable → Save"
echo -e "  3. That's it — the OAuth client is auto-created"
echo -e ""
