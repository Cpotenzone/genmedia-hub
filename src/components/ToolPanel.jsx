import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Loader2,
  X,
  ArrowLeft,
  Download,
} from "lucide-react";
import { auth } from "../lib/firebase";

function FormField({ param, value, onChange }) {
  const baseInputClasses =
    "w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-navy placeholder-gray-400 focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/20 transition-all duration-200";

  switch (param.type) {
    case "textarea":
      return (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(param.name, e.target.value)}
          placeholder={param.placeholder}
          rows={4}
          className={`${baseInputClasses} resize-none`}
          required={param.required}
        />
      );

    case "select":
      return (
        <select
          value={value || param.default || ""}
          onChange={(e) => onChange(param.name, e.target.value)}
          className={`${baseInputClasses} appearance-none cursor-pointer`}
        >
          {param.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case "range":
      return (
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={param.min}
            max={param.max}
            step={param.step}
            value={value || param.default || param.min}
            onChange={(e) => onChange(param.name, parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-steel min-w-[3ch] text-right font-mono">
            {value || param.default || param.min}
          </span>
        </div>
      );

    default:
      return (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(param.name, e.target.value)}
          placeholder={param.placeholder}
          className={baseInputClasses}
          required={param.required}
        />
      );
  }
}

function ResultDisplay({ result }) {
  if (!result) return null;

  if (result.error) {
    return (
      <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  // Navigate to MCP content blocks
  const content = result?.result?.content || result?.content || [];

  if (!content.length) {
    return (
      <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200">
        <pre className="text-sm text-navy whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
      </div>
    );
  }

  const isError = result?.result?.isError;

  return (
    <div className="mt-6 space-y-3">
      {content.map((block, i) => {
        if (block.type === "image") {
          const src = `data:${block.mimeType};base64,${block.data}`;
          return (
            <div key={i} className="relative rounded-xl overflow-hidden border border-gray-200">
              <img src={src} alt="Generated" className="w-full h-auto" />
              <a href={src} download="generated-image.png" className="absolute bottom-3 right-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-black/60 rounded-lg hover:bg-black/80 transition-all">
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
            </div>
          );
        }
        if (block.type === "text") {
          if (isError) {
            return <div key={i} className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 whitespace-pre-wrap">{block.text}</div>;
          }
          const text = block.text;
          const gcsPattern = /(gs:\/\/[^\s]+)/g;
          if (gcsPattern.test(text)) {
            const parts = text.split(/(gs:\/\/[^\s]+)/g);
            return (
              <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-steel whitespace-pre-wrap">
                {parts.map((part, j) =>
                  part.startsWith("gs://") ? (
                    <a key={j} href={`https://storage.cloud.google.com/${part.slice(5)}`} target="_blank" rel="noopener noreferrer" className="text-tech-blue underline break-all">{part}</a>
                  ) : (
                    <span key={j}>{part}</span>
                  )
                )}
              </div>
            );
          }
          return <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-steel whitespace-pre-wrap">{text}</div>;
        }
        if (block.type === "resource") {
          return (
            <a key={i} href={block.uri || "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-steel hover:text-navy border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
              <Download className="w-3.5 h-3.5" />
              {block.name || "Download Resource"}
            </a>
          );
        }
        return <pre key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-navy whitespace-pre-wrap">{JSON.stringify(block, null, 2)}</pre>;
      })}
    </div>
  );
}

function ThinkingUI({ server, tool }) {
  const [steps, setSteps] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const timers = [
      setTimeout(() => setSteps((s) => [...s, { text: `Connecting to ${server.id}...`, status: "pending" }]), 0),
      setTimeout(() => setSteps((s) => s.map((st, i) => i === 0 ? { ...st, status: "done" } : st).concat({ text: "Session established ✓", status: "done" })), 1000),
      setTimeout(() => setSteps((s) => [...s, { text: `Sending prompt to ${tool.parameters.find(p => p.name === "model")?.default || tool.name}...`, status: "pending" }]), 2000),
      setTimeout(() => setSteps((s) => s.map((st, i) => i === s.length - 1 ? { ...st, status: "done" } : st).concat({ text: "Generating...", status: "active" })), 4000),
    ];
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => { timers.forEach(clearTimeout); clearInterval(interval); };
  }, []);

  return (
    <div className="mt-6 rounded-xl overflow-hidden border border-gray-700 bg-[#1E293B] p-4 font-mono text-xs leading-6">
      {steps.map((step, i) => (
        <div key={i} className={step.status === "done" ? "text-green-400" : step.status === "active" ? "text-yellow-300" : "text-gray-400"}>
          {step.status === "active" && <span className="inline-block w-2 h-2 rounded-full bg-yellow-300 animate-pulse mr-2" />}
          {step.text}
        </div>
      ))}
      <div className="mt-2 text-gray-500">{elapsed}s elapsed<span className="animate-pulse">▋</span></div>
    </div>
  );
}

export default function ToolPanel({ tool, server, onClose }) {
  const [formData, setFormData] = useState(() => {
    const defaults = {};
    tool.parameters.forEach((p) => {
      if (p.default !== undefined) defaults[p.name] = p.default;
    });
    return defaults;
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleExecute = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      // Filter out empty optional fields so MCP server doesn't get confused
      const requiredFields = new Set(tool.parameters.filter(p => p.required).map(p => p.name));
      const cleanParams = {};
      for (const [key, val] of Object.entries(formData)) {
        if (val !== "" && val !== null && val !== undefined) {
          cleanParams[key] = val;
        } else if (requiredFields.has(key)) {
          cleanParams[key] = val;
        }
      }

      const response = await fetch(
        "/api/mcp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ server: server.id, tool: tool.id, params: cleanParams }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Request failed (${response.status})`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-steel hover:text-navy transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-navy">{tool.name}</h2>
            <p className="text-xs text-steel">{server.name}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-steel hover:text-navy transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-sm text-steel mb-6">{tool.description}</p>

        <form onSubmit={handleExecute} className="space-y-5">
          {tool.parameters.map((param) => (
            <div key={param.name}>
              <label className="block text-sm font-medium text-navy mb-2">
                {param.label}
                {param.required && <span className="text-indigo ml-1">*</span>}
              </label>
              <FormField param={param} value={formData[param.name]} onChange={handleChange} />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white
                       bg-navy hover:bg-navy/90
                       disabled:opacity-50 disabled:cursor-not-allowed
                       rounded-lg transition-all duration-200 shadow-md"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Processing...</>
            ) : (
              <><Play className="w-4 h-4" />Execute</>
            )}
          </button>
        </form>

        {loading && <ThinkingUI server={server} tool={tool} />}

        <ResultDisplay result={result} />
      </div>
    </div>
  );
}
