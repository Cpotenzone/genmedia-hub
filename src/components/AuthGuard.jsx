import React from "react";
import { ShieldAlert, MailWarning, Ban, LogOut } from "lucide-react";
import { isAllowedDomain, ALLOWED_DOMAINS } from "../lib/firebase";

function GuardScreen({ icon: Icon, title, message, children }) {
  return (
    <div className="guard-screen view-fade">
      <div className="guard-card">
        <div className="guard-icon"><Icon size={28} /></div>
        <h2>{title}</h2>
        <p>{message}</p>
        {children}
      </div>
    </div>
  );
}

/**
 * Renders children only for an authenticated, authorized user.
 * Handles: still-resolving auth, disallowed domain, unverified email,
 * and disabled accounts. When there's no user at all, renders nothing so
 * the parent can show the public landing page.
 */
export default function AuthGuard({ user, loading, onSignOut, children }) {
  if (loading) {
    return (
      <div className="loading-screen brand">
        <div className="spinner" />
        <span className="loading-msg">Checking your session…</span>
      </div>
    );
  }

  if (!user) return null;

  if (user.disabled) {
    return (
      <GuardScreen
        icon={Ban}
        title="Account disabled"
        message="This account has been disabled. Please contact your administrator for access."
      >
        <button className="guard-btn" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
      </GuardScreen>
    );
  }

  if (!isAllowedDomain(user.email)) {
    return (
      <GuardScreen
        icon={ShieldAlert}
        title="Access restricted"
        message={`Access is limited to ${ALLOWED_DOMAINS.map((d) => "@" + d).join(" and ")} accounts. The account ${user.email || "you used"} isn't authorized.`}
      >
        <button className="guard-btn" onClick={onSignOut}><LogOut size={16} /> Use a different account</button>
      </GuardScreen>
    );
  }

  // Google identities are email-verified by default; this guards any future
  // provider that isn't.
  if (user.emailVerified === false) {
    return (
      <GuardScreen
        icon={MailWarning}
        title="Verify your email"
        message="Your email address hasn't been verified yet. Verify it, then sign in again."
      >
        <button className="guard-btn" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
      </GuardScreen>
    );
  }

  return children;
}
