import React, { useState, useEffect, useRef, memo } from "react";
import { Play, Loader2, X, ArrowLeft, Download, RotateCcw, Clock, ChevronDown, CheckCircle2 } from "lucide-react";
import { auth } from "../lib/firebase";
import { useToast } from "./Toast";

function FormField({ param, value, onChange }) {
  const base = "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy placeholder-gray-400 focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/20 transition-all duration-200";
  switch (param.type) {
    case "textarea":
      return <textarea value={value || ""} onChange={(e) => onChange(param.name, e.target.value)} placeholder={param.placeholder} rows={4} className={`${base} resize-y min-h-[100px] max-h-[300px]`} required={param.required} />;
    case "select":
      return (
        <select value={value || param.default || ""} onChange={(e) => onChange(param.name, e.target.value)} className={`${base} appearance-none cursor-pointer`}>
          {param.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    case "range":
      return (
        <div className="flex items-center gap-4">
          <input type="range" min={param.min} max={param.max} step={param.step} value={value || param.default || param.min} onChange={(e) => onChange(param.name, parseFloat(e.target.value))} className="flex-1 accent-tech-blue" />
          <span className="text-sm text-steel min-w-[3ch] text-right font-mono">{value || param.default || param.min}</span>
        </div>
      );
    default:
      return <input type="text" value={value || ""} onChange={(e) => onChange(param.name, e.target.value)} placeholder={param.placeholder} className={base} required={param.required} />;
  }
}

function ResultContent({ result }) {
  if (!result) return null;
  if (result.error) return <p className="text-sm text-red-600">{result.error}</p>;
  const content = result?.result?.content || result?.content || [];
  const isError = result?.result?.isError;
  if (!content.length) return <pre className="text-xs text-navy whitespace-pre-wrap font-mono bg-[#1E293B] text-gray-200 rounded-xl p-4">{JSON.stringify(result, null, 2)}</pre>;
  return (
    <div className="space-y-3">
      {content.map((block, i) => {
        if (block.type === "image") return (
          <div key={i} className="relative rounded-xl overflow-hidden border border-gray-200 result-image-enter">
            <img src={`data:${block.mimeType};base64,${block.data}`} alt="Generated" className="w-full h-auto" loading="lazy" />
          </div>
        );
        if (block.type === "text") {
          if (isError) return <div key={i} className="text-sm text-red-600 whitespace-pre-wrap">{block.text}</div>;
          return <div key={i} className="text-sm text-steel whitespace-pre-wrap leading-relaxed">{block.text}</div>;
        }
        if (block.type === "resource") return <audio key={i} controls className="w-full rounded-xl" src={block.uri}>Audio not supported.</audio>;
        return <pre key={i} className="text-xs text-navy whitespace-pre-wrap font-mono">{JSON.stringify(block, null, 2)}</pre>;
      })}
    </div>
  );
}

function getDownloadData(result) {
  const content = result?.result?.content || result?.content || [];
  const img = content.find((b) => b.type === "image");
  if (img) return { href: `data:${img.mimeType};base64,${img.data}`, name: "generated-image.png" };
  const res = content.find((b) => b.type === "resource");
  if (res) return { href: res.uri, name: res.name || "download" };
  return null;
}

function ThinkingCard() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="result-card result-card-featured card-enter">
      <div className="flex items-center gap-3 p-5">
        <Loader2 className="w-5 h-5 text-tech-blue animate-spin" />
        <span className="text-sm font-medium text-navy">Generating...</span>
        <span className="text-xs text-steel ml-auto font-mono">{elapsed}s</span>
      </div>
      <div className="px-5 pb-5">
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-tech-blue to-indigo rounded-full animate-pulse" style={{ width: "60%" }} />
        </div>
      </div>
    </div>
  );
}

function PromptHistory({ history, onSelect, isOpen, onToggle }) {
  if (!history.length) return null;
  return (
    <div className="relative">
      <button type="button" onClick={onToggle} className="flex items-center gap-2 text-xs text-steel hover:text-navy transition-colors duration-200">
        <Clock className="w-3.5 h-3.5" /> Recent prompts
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute top-7 left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto animate-fadeIn">
          {history.map((item, i) => (
            <button key={i} type="button" onClick={() => { onSelect(item); onToggle(); }} className="w-full text-left px-4 py-2.5 text-sm text-steel hover:bg-gray-50 hover:text-navy border-b border-gray-100 last:border-0 transition-colors duration-200 truncate">
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const ASYNC_SERVERS = new Set(["genmedia-veo", "genmedia-nanobanana", "genmedia-lyria", "genmedia-avtool"]);

export default function ToolPanel({ tool, server, onClose }) {
  const [formData, setFormData] = useState(() => {
    const defaults = {};
    tool.parameters.forEach((p) => { if (p.default !== undefined) defaults[p.name] = p.default; });
    return defaults;
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [promptHistory, setPromptHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [waitForResult, setWaitForResult] = useState(!ASYNC_SERVERS.has(server.id));
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch(`/api/generations?server=${server.id}&tool=${tool.id}&limit=20`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          const pastResults = (data.generations || []).map((g) => ({
            id: g.id, prompt: g.prompt || "", result: g.result || {},
            timestamp: new Date((g.createdAt?.seconds || g.createdAt?._seconds || 0) * 1000),
          }));
          if (pastResults.length) setResults(pastResults);
        }
      } catch (e) { console.warn("Failed to load generation history:", e); }
    })();
  }, [tool.id, server.id]);

  const handleChange = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));
  const promptField = tool.parameters.find((p) => p.type === "textarea") || tool.parameters.find((p) => p.required) || tool.parameters[0];

  const handleExecute = async (e) => {
    e.preventDefault();
    setLoading(true);
    const promptVal = formData[promptField?.name];
    if (promptVal && !promptHistory.includes(promptVal)) setPromptHistory((prev) => [promptVal, ...prev].slice(0, 10));
    const mode = waitForResult ? "sync" : "async";
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const cleanParams = {};
      const requiredFields = new Set(tool.parameters.filter((p) => p.required).map((p) => p.name));
      for (const [key, val] of Object.entries(formData)) {
        if (val !== "" && val !== null && val !== undefined) cleanParams[key] = val;
        else if (requiredFields.has(key)) cleanParams[key] = val;
      }
      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ server: server.id, tool: tool.id, params: cleanParams, mode }),
      });
      if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || `Request failed (${response.status})`); }
      const data = await response.json();
      if (data.mode === "async" || data.status === "queued") {
        if (toast) toast("Job queued ✓", "success");
        setLoading(false);
        return;
      }
      setResults((prev) => [{ id: Date.now(), prompt: promptVal || JSON.stringify(cleanParams), result: data, timestamp: new Date() }, ...prev]);
      if (toast) toast("Generation complete", "success");
    } catch (err) {
      setResults((prev) => [{ id: Date.now(), prompt: promptVal || "", result: { error: err.message }, timestamp: new Date() }, ...prev]);
      if (toast) toast(err.message, "error");
    } finally { setLoading(false); }
  };

  const handleRemix = (prompt) => { if (promptField) setFormData((prev) => ({ ...prev, [promptField.name]: prompt })); };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={onClose} aria-label="Go back" className="p-2 rounded-xl hover:bg-gray-100 text-steel hover:text-navy transition-all duration-200 active:scale-[0.95]">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-navy">{tool.name}</h2>
            <p className="text-xs text-gray-400">{server.name}</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close panel" className="p-2 rounded-xl hover:bg-gray-100 text-steel hover:text-navy transition-all duration-200 active:scale-[0.95]">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-steel mb-4">{tool.description}</p>
          <PromptHistory history={promptHistory} onSelect={handleRemix} isOpen={historyOpen} onToggle={() => setHistoryOpen(!historyOpen)} />
          <form onSubmit={handleExecute} className="space-y-4 mt-3">
            {tool.parameters.map((param) => (
              <div key={param.name}>
                <label className="block text-sm font-medium text-navy mb-1.5">
                  {param.label}{param.required && <span className="text-indigo ml-1">*</span>}
                </label>
                <FormField param={param} value={formData[param.name]} onChange={handleChange} />
              </div>
            ))}
            <button type="submit" disabled={loading} aria-label="Execute tool"
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-navy rounded-xl shadow-md hover:bg-navy/90 hover:shadow-lg hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <><Play className="w-4 h-4" />Execute</>}
            </button>
            {ASYNC_SERVERS.has(server.id) && (
              <label className="flex items-center gap-2 text-xs text-steel cursor-pointer select-none mt-2">
                <input type="checkbox" checked={waitForResult} onChange={(e) => setWaitForResult(e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-tech-blue focus:ring-tech-blue/30" />
                Wait for result (slower, shows inline)
              </label>
            )}
          </form>
        </div>

        {/* Results */}
        {(loading || results.length > 0) && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-steel uppercase tracking-[0.1em]">Results</h3>
            {loading && <ThinkingCard />}
            {results.length > 0 && (
              <div className="result-card result-card-featured card-enter" key={results[0].id}>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400">{results[0].timestamp.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" })}</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleRemix(results[0].prompt)} aria-label="Remix" className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-tech-blue bg-tech-blue/10 rounded-lg hover:bg-tech-blue/20 transition-all duration-200 active:scale-[0.96]">
                        <RotateCcw className="w-3 h-3" /> Remix
                      </button>
                      {getDownloadData(results[0].result) && (
                        <a href={getDownloadData(results[0].result).href} download={getDownloadData(results[0].result).name} aria-label="Download" className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-navy bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200">
                          <Download className="w-3 h-3" /> Download
                        </a>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-navy/70 mb-3 line-clamp-2 italic">"{results[0].prompt}"</p>
                  <ResultContent result={results[0].result} />
                </div>
              </div>
            )}
            {results.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.slice(1).map((item, idx) => (
                  <div key={item.id} className="result-card card-enter" style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-gray-400">{item.timestamp.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" })}</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleRemix(item.prompt)} className="p-1 text-tech-blue hover:bg-tech-blue/10 rounded-md transition-colors" title="Remix" aria-label="Remix">
                            <RotateCcw className="w-3 h-3" />
                          </button>
                          {getDownloadData(item.result) && (
                            <a href={getDownloadData(item.result).href} download={getDownloadData(item.result).name} className="p-1 text-navy hover:bg-gray-100 rounded-md transition-colors" title="Download" aria-label="Download">
                              <Download className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-navy/60 mb-2 line-clamp-1 italic">"{item.prompt}"</p>
                      <div className="text-xs max-h-40 overflow-hidden"><ResultContent result={item.result} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
