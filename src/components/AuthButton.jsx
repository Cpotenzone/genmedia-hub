import React from "react";
import { LogIn, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import UserMenu from "./UserMenu";

/**
 * Auth control for the nav bar.
 *  - Signed in  → UserMenu dropdown
 *  - Signing in → spinner
 *  - Error      → friendly message + retry
 *  - Signed out → "Sign In with Google"
 */
export default function AuthButton({ user, onSignIn, onSignOut, signingIn, authError }) {
  if (user) {
    return <UserMenu user={user} onSignOut={onSignOut} />;
  }

  if (signingIn) {
    return (
      <button className="auth-btn auth-btn-loading" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
        Signing in…
      </button>
    );
  }

  if (authError) {
    return (
      <div className="auth-error">
        <span className="auth-error-msg" title={authError}>
          <AlertCircle className="w-4 h-4" />
          <span className="auth-error-text">{authError}</span>
        </span>
        <button className="auth-btn auth-btn-retry" onClick={onSignIn}>
          <RotateCcw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <button className="auth-btn auth-btn-primary" onClick={onSignIn}>
      <LogIn className="w-4 h-4" />
      Sign In with Google
    </button>
  );
}
