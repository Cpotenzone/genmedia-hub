import React from "react";
import { LogIn, LogOut, User } from "lucide-react";
import { auth, googleProvider } from "../lib/firebase";
import { signInWithPopup, signOut } from "firebase/auth";

export default function AuthButton({ user, onSignIn }) {
  const handleSignIn = async () => {
    if (onSignIn) return onSignIn();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-8 h-8 rounded-full ring-2 ring-tech-blue/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy to-indigo flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="text-sm font-medium text-navy hidden sm:block">
            {user.displayName?.split(" ")[0]}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-steel hover:text-navy
                     border border-gray-200 rounded-lg hover:border-tech-blue/40
                     transition-all duration-300 hover:bg-gray-50"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white
                 bg-gradient-to-br from-navy to-indigo hover:shadow-lg hover:-translate-y-0.5
                 rounded-lg transition-all duration-300 shadow-md
                 shadow-navy/20 hover:shadow-indigo/40"
    >
      <LogIn className="w-4 h-4" />
      Sign In with Google
    </button>
  );
}
