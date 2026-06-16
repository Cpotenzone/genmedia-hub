import React, { useState, useEffect, useCallback } from "react";
import { Layers } from "lucide-react";
import {
  onAuthChange,
  onTokenChange,
  signInWithGoogle,
  handleRedirectResult,
  logout,
  friendlyAuthError,
} from "./lib/firebase";
import AuthButton from "./components/AuthButton";
import AuthGuard from "./components/AuthGuard";
import Landing from "./components/Landing";
import Dashboard from "./components/Dashboard";
import { ToastProvider } from "./components/Toast";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Complete any redirect-based sign-in (mobile / popup-blocked fallback).
  useEffect(() => {
    handleRedirectResult().catch((e) => setAuthError(friendlyAuthError(e)));
  }, []);

  // Track auth state on load + token refreshes (keeps the session fresh).
  useEffect(() => {
    const unsubAuth = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        setSigningIn(false);
        setAuthError(null);
      }
    });
    const unsubToken = onTokenChange(() => {
      // Token refreshed/expired — Firebase auto-refreshes; onAuthChange fires
      // null if the session is fully revoked, dropping the user to Landing.
    });
    return () => {
      unsubAuth();
      unsubToken();
    };
  }, []);

  const handleSignIn = useCallback(async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      const u = await signInWithGoogle();
      if (!u) return; // redirect flow in progress; resolves after reload
      // Success → onAuthChange flips `user` and auto-routes to the dashboard.
    } catch (e) {
      console.error("Sign in error:", e);
      setAuthError(friendlyAuthError(e));
      setSigningIn(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Sign out error:", e);
    }
  }, []);

  if (loading) {
    return (
      <div className="loading-screen brand">
        <div className="spinner" />
        <span className="loading-msg">Loading GenMedia Hub…</span>
      </div>
    );
  }

  // Branded transition while the popup completes (avoids a jarring swap).
  if (signingIn && !user) {
    return (
      <div className="loading-screen brand">
        <div className="spinner" />
        <span className="loading-msg">Signing you in…</span>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div>
        <nav className="nav">
          <div className="nav-inner">
            <span className="nav-brand">
              <span className="nav-brand-mark"><Layers size={17} /></span>
              GenMedia Hub
            </span>
            <AuthButton
              user={user}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              signingIn={signingIn}
              authError={authError}
            />
          </div>
        </nav>

        {user ? (
          <AuthGuard user={user} loading={false} onSignOut={handleSignOut}>
            <div className="view-fade" key="dashboard">
              <Dashboard user={user} />
            </div>
          </AuthGuard>
        ) : (
          <Landing onSignIn={handleSignIn} />
        )}
      </div>
    </ToastProvider>
  );
}
