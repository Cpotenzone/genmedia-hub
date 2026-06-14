import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./lib/firebase";
import AuthButton from "./components/AuthButton";
import Landing from "./components/Landing";
import Dashboard from "./components/Dashboard";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { console.error("Sign in error:", e); }
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  );

  return (
    <div>
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-brand">GenMedia Hub</span>
          <AuthButton user={user} />
        </div>
      </nav>
      {user ? <Dashboard user={user} /> : <Landing onSignIn={handleSignIn} />}
    </div>
  );
}
