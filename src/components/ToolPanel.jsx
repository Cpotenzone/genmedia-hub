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
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all duration-200";

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
            <option key={opt} value={opt} className="bg-gray-900">
              {opt}
            </option>
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
            className="flex-1 h-2 rounded-full appearance-none bg-white/[0.08] accent-purple-500 cursor-pointer"
          />
          <span className="text-sm text-gray-400 min-w-[3ch] text-right font-mono">
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
      <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <p className="text-sm text-red-400">{result.error}</p>
      </div>
    );
  }

  switch (resultType) {
    case "image":
      return (
        <div className="mt-6 space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-white/[0.08]">
            <img
              src={result.url || result.data}
              alt="Generated"
              className="w-full h-auto"
            />
          </div>
          {result.url && (
            <a
              href={result.url}
              download
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-white/[0.08] rounded-lg hover:bg-white/5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          )}
        </div>
      );

    case "video":
      return (
        <div className="mt-6 rounded-xl overflow-hidden border border-white/[0.08]">
          <video
            controls
            className="w-full"
            src={result.url}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );

    case "audio":
      return (
        <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
          <audio controls className="w-full" src={result.url}>
            Your browser does not support the audio tag.
          </audio>
        </div>
      );

    case "text":
      return (
        <div className="mt-6 relative">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] max-h-96 overflow-y-auto">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
              {result.text}
            </pre>
          </div>
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>
        </div>
      );

    default:
      return (
        <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      );
  }
}

export default function ToolPanel({ tool, server, onClose }) {
  const [formData, setFormData] = useState(() => {
    const defaults = {};
    tool.parameters.forEach((p) => {
      if (p.default !== undefined) {
        defaults[p.name] = p.default;
      }
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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">{tool.name}</h2>
            <p className="text-xs text-gray-500">{server.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-sm text-gray-400 mb-6">{tool.description}</p>

        <form onSubmit={handleExecute} className="space-y-5">
          {tool.parameters.map((param) => (
            <div key={param.name}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {param.label}
                {param.required && (
                  <span className="text-purple-400 ml-1">*</span>
                )}
              </label>
              <FormField
                param={param}
                value={formData[param.name]}
                onChange={handleChange}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white
                       bg-gradient-to-r from-purple-600 to-blue-600
                       hover:from-purple-500 hover:to-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed
                       rounded-xl transition-all duration-200
                       shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Execute
              </>
            )}
          </button>
        </form>

        {/* Loading animation */}
        {loading && (
          <div className="mt-8 flex flex-col items-center gap-4 py-8">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 animate-spin" />
              <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
            </div>
            <p className="text-sm text-gray-500 animate-pulse">
              Generating your content...
            </p>
          </div>
        )}

        {/* Results */}
        <ResultDisplay result={result} resultType={tool.resultType} />
      </div>
    </div>
  );
}
