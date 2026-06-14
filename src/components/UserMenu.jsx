import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronDown,
  User,
  Images,
  FolderDown,
  LogOut,
  X,
  ShieldCheck,
  Mail,
  Clock,
  Loader2,
  Inbox,
} from "lucide-react";
import { getUserProfile, fetchGenerations } from "../lib/firebase";
import ExportConfig from "./ExportConfig";

function Avatar({ user, size = 32 }) {
  const initial = (user.displayName || user.email || "?").trim().charAt(0).toUpperCase();
  if (user.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt={user.displayName || "User"}
        className="um-avatar-img"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span className="um-avatar-fallback" style={{ width: size, height: size }}>
      {initial}
    </span>
  );
}

/* ─── Profile modal ──────────────────────────────────────────────── */
function ProfileModal({ user, open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const p = getUserProfile(user);
  const rows = [
    { icon: Mail, label: "Email", value: p.email },
    { icon: ShieldCheck, label: "Domain", value: "@" + (p.domain || "—") },
    { icon: User, label: "User ID", value: p.uid, mono: true },
    { icon: Clock, label: "Last sign-in", value: p.lastSignIn ? new Date(p.lastSignIn).toLocaleString() : "—" },
  ];

  return (
    <div className="app-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="app-modal" onClick={(e) => e.stopPropagation()}>
        <div className="app-modal-head">
          <h3>Your profile</h3>
          <button className="export-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="profile-hero">
          <Avatar user={user} size={64} />
          <div>
            <div className="profile-name">{p.displayName}</div>
            <span className="profile-verified">
              <ShieldCheck size={13} /> {p.emailVerified ? "Verified" : "Unverified"} · {p.provider.replace(".com", "")}
            </span>
          </div>
        </div>
        <dl className="profile-rows">
          {rows.map((r) => (
            <div key={r.label} className="profile-row">
              <dt><r.icon size={14} /> {r.label}</dt>
              <dd className={r.mono ? "mono" : ""}>{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/* ─── Generations modal ──────────────────────────────────────────── */
const STATUS_CLASS = {
  completed: "gen-status completed",
  processing: "gen-status processing",
  pending: "gen-status pending",
  failed: "gen-status failed",
};

function GenerationsModal({ user, open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    fetchGenerations(user.uid).then((rows) => {
      if (alive) {
        setItems(rows);
        setLoading(false);
      }
    });
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, user.uid, onClose]);

  if (!open) return null;

  const fmtDate = (ts) => {
    const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    return d ? d.toLocaleString() : "";
  };

  return (
    <div className="app-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="app-modal" onClick={(e) => e.stopPropagation()}>
        <div className="app-modal-head">
          <h3>My Generations</h3>
          <button className="export-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="gen-body">
          {loading ? (
            <div className="gen-loading"><Loader2 size={22} className="spin-inline" /> Loading your history…</div>
          ) : items.length === 0 ? (
            <div className="gen-empty">
              <span className="gen-empty-icon"><Inbox size={26} /></span>
              <p className="gen-empty-title">No generations yet</p>
              <p className="gen-empty-sub">Run a tool from the dashboard and your results will show up here.</p>
            </div>
          ) : (
            <ul className="gen-list">
              {items.map((g) => (
                <li key={g.id} className="gen-item">
                  <div className="gen-item-main">
                    <span className="gen-tool">{g.tool}</span>
                    <span className="gen-server">{g.server}</span>
                  </div>
                  <div className="gen-item-meta">
                    <span className={STATUS_CLASS[g.status] || "gen-status"}>{g.status}</span>
                    <span className="gen-date">{fmtDate(g.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── User menu dropdown ─────────────────────────────────────────── */
export default function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [generationsOpen, setGenerationsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const ref = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setConfirmSignOut(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close();
    };
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const firstName = user.displayName?.split(" ")[0] || "Account";

  return (
    <div className="um-root" ref={ref}>
      <button
        className={`um-trigger ${open ? "active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar user={user} size={32} />
        <span className="um-trigger-name">{firstName}</span>
        <ChevronDown size={15} className={`um-chevron ${open ? "rot" : ""}`} />
      </button>

      {open && (
        <div className="um-dropdown" role="menu">
          <div className="um-head">
            <Avatar user={user} size={40} />
            <div className="um-head-text">
              <span className="um-name">{user.displayName || "Anonymous"}</span>
              <span className="um-email">{user.email}</span>
            </div>
          </div>

          <div className="um-items">
            <button className="um-item" role="menuitem" onClick={() => { setProfileOpen(true); close(); }}>
              <User size={16} /> View Profile
            </button>
            <button className="um-item" role="menuitem" onClick={() => { setGenerationsOpen(true); close(); }}>
              <Images size={16} /> My Generations
            </button>
            <button className="um-item" role="menuitem" onClick={() => { setExportOpen(true); close(); }}>
              <FolderDown size={16} /> Export MCP Config
            </button>
          </div>

          <div className="um-footer">
            {confirmSignOut ? (
              <div className="um-confirm">
                <span>Sign out?</span>
                <div className="um-confirm-actions">
                  <button className="um-confirm-cancel" onClick={() => setConfirmSignOut(false)}>Cancel</button>
                  <button className="um-confirm-yes" onClick={() => { close(); onSignOut(); }}>
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </div>
            ) : (
              <button className="um-item um-signout" role="menuitem" onClick={() => setConfirmSignOut(true)}>
                <LogOut size={16} /> Sign Out
              </button>
            )}
          </div>
        </div>
      )}

      <ProfileModal user={user} open={profileOpen} onClose={() => setProfileOpen(false)} />
      <GenerationsModal user={user} open={generationsOpen} onClose={() => setGenerationsOpen(false)} />
      <ExportConfig open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
