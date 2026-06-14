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
              className="w-8 h-8 rounded-full ring-2 ring-purple-500/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="text-sm text-gray-300 hidden sm:block">
            {user.displayName?.split(" ")[0]}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white
                     border border-white/10 rounded-lg hover:border-white/20
                     transition-all duration-200 hover:bg-white/5"
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
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white
                 bg-gradient-to-r from-purple-600 to-blue-600
                 hover:from-purple-500 hover:to-blue-500
                 rounded-lg transition-all duration-200
                 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
    >
      <LogIn className="w-4 h-4" />
      Sign In with Google
    </button>
  );
}
