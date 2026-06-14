import React from "react";
import { LogIn, LogOut, User } from "lucide-react";
import { auth, googleProvider } from "../lib/firebase";
import { signInWithPopup, signOut } from "firebase/auth";

export default function AuthButton({ user }) {
  const handleSignIn = async () => {
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
              className="w-8 h-8 rounded-full ring-2 ring-white/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-tech-blue flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="text-sm text-white/80 hidden sm:block">
            {user.displayName?.split(" ")[0]}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/80 hover:text-white
                     border border-white/20 rounded-lg hover:border-white/40
                     transition-all duration-200 hover:bg-white/10"
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
      className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-navy
                 bg-white hover:bg-gray-100
                 rounded-lg transition-all duration-200 shadow-md"
    >
      <LogIn className="w-4 h-4" />
      Sign In with Google
    </button>
  );
}
