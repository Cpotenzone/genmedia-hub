import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { Layers } from "lucide-react";
import { auth, googleProvider } from "./lib/firebase";
import AuthButton from "./components/AuthButton";
import Landing from "./components/Landing";
import Dashboard from "./components/Dashboard";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) setSigningIn(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will flip `user` and clear `signingIn`.
    } catch (e) {
      console.error("Sign in error:", e);
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen brand">
        <div className="spinner" />
        <span className="loading-msg">Loading GenMedia Hub…</span>
      </div>
    );
  }

  if (signingIn && !user) {
    return (
      <div className="loading-screen brand">
        <div className="spinner" />
        <span className="loading-msg">Signing you in…</span>
      </div>
    );
  }

  return (
    <div>
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-brand">
            <span className="nav-brand-mark"><Layers size={17} /></span>
            GenMedia Hub
          </span>
          <AuthButton user={user} onSignIn={handleSignIn} />
        </div>
      </nav>
      {user ? (
        <div className="view-fade" key="dashboard">
          <Dashboard user={user} />
        </div>
      ) : (
        <Landing onSignIn={handleSignIn} />
      )}
    </div>
  );
}
