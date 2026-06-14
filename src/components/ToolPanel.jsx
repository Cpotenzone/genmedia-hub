import React, { useState } from "react";
import {
  Play,
  Loader2,
  X,
  ArrowLeft,
  Download,
  Copy,
  Check,
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

function ResultDisplay({ result, resultType }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!result) return null;

  if (result.error) {
    return (
      <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  switch (resultType) {
    case "image":
      return (
        <div className="mt-6 space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-gray-200">
            <img src={result.url || result.data} alt="Generated" className="w-full h-auto" />
          </div>
          {result.url && (
            <a href={result.url} download className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-steel hover:text-navy border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          )}
        </div>
      );

    case "video":
      return (
        <div className="mt-6 rounded-xl overflow-hidden border border-gray-200">
          <video controls className="w-full" src={result.url}>
            Your browser does not support the video tag.
          </video>
        </div>
      );

    case "audio":
      return (
        <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200">
          <audio controls className="w-full" src={result.url}>
            Your browser does not support the audio tag.
          </audio>
        </div>
      );

    case "text":
      return (
        <div className="mt-6 relative">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 max-h-96 overflow-y-auto">
            <pre className="text-sm text-navy whitespace-pre-wrap font-sans leading-relaxed">{result.text}</pre>
          </div>
          <button onClick={handleCopy} className="absolute top-3 right-3 p-1.5 rounded-md bg-white hover:bg-gray-100 border border-gray-200 transition-all">
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-steel" />}
          </button>
        </div>
      );

    default:
      return (
        <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200">
          <pre className="text-sm text-navy whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      );
  }
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

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || ""}/api/mcp/${server.id}/${tool.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed (${response.status})`);
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

        {loading && (
          <div className="mt-8 flex flex-col items-center gap-4 py-8">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-tech-blue/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-tech-blue animate-spin" />
            </div>
            <p className="text-sm text-steel animate-pulse">Generating your content...</p>
          </div>
        )}

        <ResultDisplay result={result} resultType={tool.resultType} />
      </div>
    </div>
  );
}
