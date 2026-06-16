import React, { useState, useEffect, useCallback, memo } from "react";
import { X, Image, Video, Music, FileText, Filter, RotateCcw, Clock, Sparkles, Play, Download, Trash2 } from "lucide-react";
import { auth } from "../lib/firebase";
import { formatSessionDate } from "../lib/dateUtils";
import MediaPlayer from "./MediaPlayer";

function MediaIcon({ type }) {
  switch (type) {
    case "image": return <Image className="w-4 h-4 text-pink-500" />;
    case "video": return <Video className="w-4 h-4 text-purple-500" />;
    case "audio": return <Music className="w-4 h-4 text-emerald-500" />;
    default: return <FileText className="w-4 h-4 text-blue-500" />;
  }
}

function getMediaSrc(gen) {
  const content = gen.result?.content || [];
  const imgBlock = content.find((b) => b.type === "image");
  if (imgBlock) return { base64: imgBlock.data, mime: imgBlock.mimeType || "image/png" };
  const resBlock = content.find((b) => b.type === "resource" && (b.resource?.blob || b.blob));
  if (resBlock) return { base64: resBlock.resource?.blob || resBlock.blob, mime: resBlock.mimeType || "application/octet-stream" };
  return null;
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatPDT(createdAt) {
  if (!createdAt) return "";
  const ts = createdAt?.toDate ? createdAt.toDate() : (createdAt?.seconds ? new Date(createdAt.seconds * 1000) : new Date(createdAt));
  return ts.toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" });
}

// ─── Detail Modal ────────────────────────────────────────────────────────────

function GenerationDetail({ gen, onClose, onRerun, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mediaSrc = getMediaSrc(gen);
  const content = gen.result?.content || [];
  const textBlock = content.find((b) => b.type === "text");
  const mediaTypeNorm = gen.mediaType?.includes("/") ? gen.mediaType.split("/")[0] : gen.mediaType;

  const handleDownload = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/media/${gen.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, "_blank");
      } else if (mediaSrc) {
        const a = document.createElement("a");
        a.href = `data:${mediaSrc.mime};base64,${mediaSrc.base64}`;
        a.download = `${gen.id}.${mediaSrc.mime.split("/")[1] || "bin"}`;
        a.click();
      }
    } catch {
      if (mediaSrc) {
        const a = document.createElement("a");
        a.href = `data:${mediaSrc.mime};base64,${mediaSrc.base64}`;
        a.download = `${gen.id}.${mediaSrc.mime.split("/")[1] || "bin"}`;
        a.click();
      }
    }
  };

  const handleDelete = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch(`/api/generations/${gen.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      onDelete(gen.id);
      onClose();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-fadeInUp" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MediaIcon type={mediaTypeNorm} />
            <span className="text-sm font-bold text-navy">Generation Detail</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-navy transition" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Media player */}
          {mediaSrc && (
            <MediaPlayer mediaType={mediaTypeNorm} base64Data={mediaSrc.base64} mimeType={mediaSrc.mime} alt={gen.prompt} />
          )}
          {!mediaSrc && textBlock && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">{textBlock.text}</div>
          )}

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-gray-400">Prompt:</span><p className="text-navy font-medium mt-0.5">"{gen.prompt}"</p></div>
            <div><span className="text-gray-400">Server / Tool:</span><p className="text-navy mt-0.5">{gen.serverId} → {gen.toolId}</p></div>
            <div><span className="text-gray-400">Created (PDT):</span><p className="text-navy mt-0.5">{formatPDT(gen.createdAt)}</p></div>
            <div><span className="text-gray-400">File size:</span><p className="text-navy mt-0.5">{formatBytes(gen.mediaSizeBytes)}</p></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-4 border-t border-gray-100">
          <button onClick={() => { onRerun(gen); onClose(); }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-tech-blue bg-tech-blue/10 rounded-lg hover:bg-tech-blue/20 transition">
            <RotateCcw className="w-3.5 h-3.5" /> Re-run with this prompt
          </button>
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            <Download className="w-3.5 h-3.5" /> Download original
          </button>
          <div className="ml-auto">
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition">
                <Trash2 className="w-3.5 h-3.5" /> Delete from library
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500">Are you sure?</span>
                <button onClick={handleDelete} className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 rounded-lg hover:bg-red-600 transition">Yes, delete</button>
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generation Card ─────────────────────────────────────────────────────────

const GenerationCard = memo(function GenerationCard({ gen, onRerun, onClick }) {
  const content = gen.result?.content || [];
  const imgBlock = content.find((b) => b.type === "image");
  const textBlock = content.find((b) => b.type === "text");
  const mediaTypeNorm = gen.mediaType?.includes("/") ? gen.mediaType.split("/")[0] : gen.mediaType;
  const isPlayable = mediaTypeNorm === "audio" || mediaTypeNorm === "video";

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer" onClick={() => onClick(gen)}>
      {imgBlock && (
        <div className="aspect-video bg-gray-100 overflow-hidden relative">
          <img
            src={`data:${imgBlock.mimeType || "image/png"};base64,${imgBlock.data}`}
            alt={gen.prompt || "Generated media"}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}
      {!imgBlock && isPlayable && (
        <div className="aspect-video bg-gradient-to-br from-[#1E293B] to-[#0F172A] flex items-center justify-center relative">
          <div className="w-14 h-14 rounded-full bg-[#3B82F6]/80 flex items-center justify-center group-hover:bg-[#3B82F6] transition">
            <Play className="w-6 h-6 text-white ml-0.5" />
          </div>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <MediaIcon type={mediaTypeNorm} />
          <span className="text-[10px] font-semibold text-gray-500 uppercase">{gen.serverId}</span>
          <span className="text-[10px] text-gray-400 ml-auto">{formatSessionDate(gen.createdAt)}</span>
        </div>
        <p className="text-xs text-navy font-medium line-clamp-2 mb-2">"{gen.prompt}"</p>
        {textBlock && !imgBlock && !isPlayable && (
          <p className="text-[11px] text-gray-500 line-clamp-3">{textBlock.text?.slice(0, 150)}</p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">{gen.toolId}</span>
          {gen.mediaSizeBytes && <span className="text-[9px] text-gray-400">{formatBytes(gen.mediaSizeBytes)}</span>}
          <button
            onClick={(e) => { e.stopPropagation(); onRerun(gen); }}
            aria-label="Re-run this generation"
            className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-tech-blue hover:bg-tech-blue/10 px-2 py-1 rounded-md transition-all duration-200 active:scale-[0.96]"
          >
            <RotateCcw className="w-3 h-3" /> Re-run
          </button>
        </div>
      </div>
    </div>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GenerationHistory({ open, onClose, onRerun }) {
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterServer, setFilterServer] = useState("");
  const [filterType, setFilterType] = useState("");
  const [selectedGen, setSelectedGen] = useState(null);

  const fetchGenerations = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams({ limit: "100" });
      if (filterServer) params.set("server", filterServer);
      const res = await fetch(`/api/generations?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setGenerations(data.generations || []);
      }
    } catch (e) {
      console.warn("Failed to fetch generations:", e);
    } finally {
      setLoading(false);
    }
  }, [filterServer]);

  useEffect(() => { if (open) fetchGenerations(); }, [open, fetchGenerations]);

  const handleDelete = (genId) => {
    setGenerations((prev) => prev.filter((g) => g.id !== genId));
  };

  if (!open) return null;

  const filtered = filterType
    ? generations.filter((g) => {
        const norm = g.mediaType?.includes("/") ? g.mediaType.split("/")[0] : g.mediaType;
        return norm === filterType;
      })
    : generations;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-5xl h-[80vh] flex flex-col animate-fadeInUp" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="gen-history-title">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-tech-blue" />
              <h2 id="gen-history-title" className="text-lg font-bold text-navy">Generation History</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">{filtered.length} items</span>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-navy transition-all duration-200" aria-label="Close history">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-50">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select value={filterServer} onChange={(e) => setFilterServer(e.target.value)} aria-label="Filter by server" className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/20 transition-all duration-200">
              <option value="">All Servers</option>
              <option value="gstack-mcp">AI Agents</option>
              <option value="mcp-nanobanana">NanoBanana</option>
              <option value="mcp-veo">Veo</option>
              <option value="mcp-lyria">Lyria</option>
              <option value="mcp-avtool">AV Tool</option>
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} aria-label="Filter by media type" className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/20 transition-all duration-200">
              <option value="">All Types</option>
              <option value="image">Images</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="text">Text</option>
            </select>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (<div key={i} className="h-48 skeleton rounded-xl" />))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Sparkles className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-400 mb-1">No generations yet</p>
                <p className="text-xs text-gray-300">Generate your first image, video, or music</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((gen) => (
                  <GenerationCard key={gen.id} gen={gen} onRerun={onRerun} onClick={setSelectedGen} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selectedGen && (
        <GenerationDetail gen={selectedGen} onClose={() => setSelectedGen(null)} onRerun={onRerun} onDelete={handleDelete} />
      )}
    </>
  );
}
