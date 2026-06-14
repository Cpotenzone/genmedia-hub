/**
 * GenMedia Hub — Firebase auth & data layer
 * Google sign-in (popup → redirect fallback), domain restriction,
 * session persistence, token handling, and Firestore helpers.
 */
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  onIdTokenChanged,
  signOut,
  setPersistence,
  browserLocalPersistence,
  reauthenticateWithPopup,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit as fbLimit,
  getDocs,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyChr3m4mnVkYwVm5ZnC8BhEAqWO74rR5W4",
  authDomain: "casey-genmedia.firebaseapp.com",
  projectId: "casey-genmedia",
  storageBucket: "casey-genmedia.firebasestorage.app",
  messagingSenderId: "128509221012",
  appId: "1:128509221012:web:5bd73a95aea4b7a2837c81",
};

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.error("Firebase init failed:", e);
}

export const auth = app ? getAuth(app) : null;

let _db = null;
export function getDb() {
  if (!_db && app) {
    try {
      _db = getFirestore(app);
    } catch (e) {
      console.warn("Firestore not available:", e?.code || e);
    }
  }
  return _db;
}
// Legacy export for backward compat — lazy getter
export const db = new Proxy({}, {
  get(_, prop) {
    const real = getDb();
    if (!real) {
      console.warn("Firestore accessed but not available");
      return undefined;
    }
    return real[prop];
  }
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");
googleProvider.setCustomParameters({ prompt: "select_account" });

// Keep users signed in across reloads/tabs. Best-effort (private mode can reject).
if (auth) {
  setPersistence(auth, browserLocalPersistence).catch((e) =>
    console.warn("Auth persistence unavailable:", e?.code || e)
  );
}

/* ─── Domain restriction ─────────────────────────────────────────── */
export const ALLOWED_DOMAINS = ["criticalasset.com", "insuremep.com"];
export const DOMAIN_ERROR_MESSAGE =
  "Access restricted to @criticalasset.com and @insuremep.com accounts.";

export function getEmailDomain(email) {
  return (email || "").split("@")[1]?.toLowerCase() || "";
}
export function isAllowedDomain(email) {
  return ALLOWED_DOMAINS.includes(getEmailDomain(email));
}

/* ─── Errors ─────────────────────────────────────────────────────── */
export class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export function friendlyAuthError(error) {
  switch (error?.code) {
    case "auth/domain-restricted":
      return DOMAIN_ERROR_MESSAGE;
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup — retrying with a redirect.";
    case "auth/popup-closed-by-user":
      return "Sign-in window was closed before completing. Please try again.";
    case "auth/cancelled-popup-request":
      return "Another sign-in is already in progress.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment, then try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact your administrator.";
    case "auth/unauthorized-domain":
      return "This site isn't authorized for sign-in. Contact your administrator.";
    case "auth/internal-error":
      return "Something went wrong during sign-in. Please try again.";
    default:
      return error?.message || "Sign-in failed. Please try again.";
  }
}

function enforceDomain(user) {
  if (user && !isAllowedDomain(user.email)) {
    signOut(auth).catch(() => {});
    throw new AuthError("auth/domain-restricted", DOMAIN_ERROR_MESSAGE);
  }
  return user;
}

/* ─── Sign-in / out ──────────────────────────────────────────────── */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    enforceDomain(result.user);
    await ensureUserDocument(result.user);
    return result.user;
  } catch (error) {
    // Mobile / blocked-popup fallback → full-page redirect.
    if (
      error?.code === "auth/popup-blocked" ||
      error?.code === "auth/operation-not-supported-in-environment"
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null; // Completes via handleRedirectResult() after reload.
    }
    throw error;
  }
}

export async function handleRedirectResult() {
  const result = await getRedirectResult(auth);
  if (result?.user) {
    enforceDomain(result.user);
    await ensureUserDocument(result.user);
    return result.user;
  }
  return null;
}

export async function logout() {
  await signOut(auth);
}

/** Re-prompt Google auth for sensitive operations. */
export async function reauthenticate() {
  const user = auth.currentUser;
  if (!user) throw new AuthError("auth/no-current-user", "No signed-in user to re-authenticate.");
  const result = await reauthenticateWithPopup(user, googleProvider);
  return result.user;
}

/* ─── Listeners ──────────────────────────────────────────────────── */
export function onAuthChange(cb) {
  return onAuthStateChanged(auth, cb);
}
/** Fires on sign-in/out AND token refresh — used to track session freshness. */
export function onTokenChange(cb) {
  return onIdTokenChanged(auth, cb);
}

/* ─── Tokens & profile ───────────────────────────────────────────── */
export async function getIdToken(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

/** Returns null/expiry info so the UI can prompt re-auth before requests fail. */
export async function getTokenInfo() {
  const user = auth.currentUser;
  if (!user) return null;
  const result = await user.getIdTokenResult();
  return {
    token: result.token,
    issuedAt: result.issuedAtTime,
    expiresAt: result.expirationTime,
    expired: new Date(result.expirationTime).getTime() <= Date.now(),
  };
}

export function getUserProfile(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    displayName: user.displayName || "Anonymous",
    email: user.email || "",
    photoURL: user.photoURL || null,
    emailVerified: !!user.emailVerified,
    domain: getEmailDomain(user.email),
    provider: user.providerData?.[0]?.providerId || "google.com",
    lastSignIn: user.metadata?.lastSignInTime || null,
    createdAt: user.metadata?.creationTime || null,
  };
}

/* ─── Firestore ──────────────────────────────────────────────────── */
async function ensureUserDocument(user) {
  try {
    const firestore = getDb();
    if (!firestore) return;
    const ref = doc(firestore, "users", user.uid);
    await setDoc(
      ref,
      {
        email: user.email,
        displayName: user.displayName || "Anonymous",
        photoURL: user.photoURL || null,
        lastLogin: serverTimestamp(),
        ...(user.metadata.creationTime === user.metadata.lastSignInTime
          ? { createdAt: serverTimestamp() }
          : {}),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("ensureUserDocument failed:", e?.code || e);
  }
}

/** Recent generation history for the signed-in user. */
export async function fetchGenerations(uid, max = 25) {
  if (!uid) return [];
  try {
    const firestore = getDb();
    if (!firestore) return [];
    const q = query(
      collection(firestore, "generations"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      fbLimit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("fetchGenerations failed:", e?.code || e);
    return [];
  }
}

export { app };
export default app;
