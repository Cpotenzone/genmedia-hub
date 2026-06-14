import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  Copy,
  Check,
  Download,
  Terminal,
  Github,
  Boxes,
  FolderDown,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { mcpServers } from "../lib/mcpServers";
import {
  SERVER_IDS,
  exportTargets,
  getTarget,
  serializeConfig,
  serverLaunch,
} from "../lib/exportConfig";

const REPO_URL = "https://github.com/Cpotenzone/genmedia-hub";

/* Lightweight JSON syntax highlighter → React spans (content is fully trusted). */
function highlightJson(json) {
  const tokenRe =
    /("(?:[^"\\]|\\.)*"(?=\s*:))|("(?:[^"\\]|\\.)*")|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?)|([{}[\],:])/g;
  const nodes = [];
  let lastIndex = 0;
  let m;
  let k = 0;
  while ((m = tokenRe.exec(json)) !== null) {
    if (m.index > lastIndex) nodes.push(json.slice(lastIndex, m.index));
    let cls = "tok-punct";
    if (m[1]) cls = "tok-key";
    else if (m[2]) cls = "tok-str";
    else if (m[3]) cls = "tok-lit";
    else if (m[4]) cls = "tok-num";
    nodes.push(
      <span key={k++} className={cls}>
        {m[0]}
      </span>
    );
    lastIndex = tokenRe.lastIndex;
  }
  if (lastIndex < json.length) nodes.push(json.slice(lastIndex));
  return nodes;
}

export default function ExportConfig({ open, onClose, initialServerId = null }) {
  const [target, setTarget] = useState("claude");
  const [selectedId, setSelectedId] = useState(null); // null = all servers
  const [copied, setCopied] = useState(false);

  // Reset state each time the modal opens (respecting a preselected server).
  useEffect(() => {
    if (open) {
      setSelectedId(initialServerId);
      setCopied(false);
    }
  }, [open, initialServerId]);

  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const ids = useMemo(() => (selectedId ? [selectedId] : SERVER_IDS), [selectedId]);
  const json = useMemo(() => serializeConfig(ids), [ids]);
  const targetInfo = getTarget(target);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [json]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = targetInfo.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [json, targetInfo.filename]);

  if (!open) return null;

  const serverMeta = (id) => mcpServers.find((s) => s.id === id);

  return (
    <div className="export-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Export MCP configuration">
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="export-header">
          <div className="export-title">
            <span className="export-title-icon"><FolderDown size={18} /></span>
            <div>
              <h2>Export MCP Config</h2>
              <p>Install these servers into Claude Desktop, Kiro, or Antigravity.</p>
            </div>
          </div>
          <button className="export-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Target tabs */}
        <div className="export-tabs" role="tablist">
          {exportTargets.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={target === t.id}
              className={`export-tab ${target === t.id ? "active" : ""}`}
              onClick={() => setTarget(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="export-body">
          {/* Server selector */}
          <div className="export-servers">
            <button
              className={`export-server-btn export-all ${!selectedId ? "active" : ""}`}
              onClick={() => setSelectedId(null)}
            >
              <span className="esb-icon"><Boxes size={16} /></span>
              <span className="esb-text">
                <span className="esb-name">Export All</span>
                <span className="esb-sub">{SERVER_IDS.length} servers</span>
              </span>
              {!selectedId && <Check size={15} className="esb-check" />}
            </button>

            {SERVER_IDS.map((id) => {
              const meta = serverMeta(id);
              const active = selectedId === id;
              return (
                <button
                  key={id}
                  className={`export-server-btn ${active ? "active" : ""}`}
                  onClick={() => setSelectedId(id)}
                >
                  <span className="esb-text">
                    <span className="esb-name">{meta?.name || id}</span>
                    <span className="esb-sub esb-mono">{serverLaunch[id]?.command}</span>
                  </span>
                  {active ? <Check size={15} className="esb-check" /> : <ChevronRight size={14} className="esb-chevron" />}
                </button>
              );
            })}
          </div>

          {/* Code + instructions */}
          <div className="export-main">
            <div className="export-code-head">
              <span className="export-filename">
                <Terminal size={13} /> {targetInfo.filename}
              </span>
              <div className="export-code-actions">
                <button className={`export-mini-btn ${copied ? "copied" : ""}`} onClick={handleCopy}>
                  {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
                <button className="export-mini-btn primary" onClick={handleDownload}>
                  <Download size={14} /> Download .json
                </button>
              </div>
            </div>

            <pre className="export-code"><code>{highlightJson(json)}</code></pre>

            {/* Instructions */}
            <div className="export-instructions">
              <h4>Install instructions</h4>
              <ol>
                <li>
                  <span className="ins-step">1</span>
                  <div>
                    Authenticate to Google Cloud:
                    <code className="ins-code">gcloud auth application-default login</code>
                  </div>
                </li>
                <li>
                  <span className="ins-step">2</span>
                  <div>
                    Ensure the MCP binaries are installed and on your PATH (e.g.
                    <code className="ins-code">~/.local/bin/</code>).
                  </div>
                </li>
                <li>
                  <span className="ins-step">3</span>
                  <div>
                    Save the config above to:
                    <code className="ins-code">{targetInfo.path}</code>
                  </div>
                </li>
                <li>
                  <span className="ins-step">4</span>
                  <div>{targetInfo.reload}</div>
                </li>
              </ol>

              <div className="export-foot">
                <span className="export-secure">
                  <ShieldCheck size={14} /> Credentials use your local gcloud ADC — no keys are stored in this file.
                </span>
                <a className="export-repo" href={REPO_URL} target="_blank" rel="noreferrer">
                  <Github size={14} /> Source &amp; binaries
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
