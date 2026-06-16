import React, { useState, useEffect, useCallback } from "react";
import { X, Image, Video, Music, FileText, Filter, RotateCcw, Clock } from "lucide-react";
import { auth } from "../lib/firebase";

function MediaIcon({ type }) {
  switch (type) {
    case 'image': return <Image className="w-4 h-4 text-pink-500" />;
    case 'video': return <Video className="w-4 h-4 text-purple-500" />;
    case 'audio': return <Music className="w-4 h-4 text-green-500" />;
    default: return <FileText className="w-4 h-4 text-blue-500" />;
  }
}

function GenerationCard({ gen, onRerun }) {
  const content = gen.result?.content || [];
  const imgBlock = content.find(b => b.type === 'image');
  const textBlock = content.find(b => b.type === 'text');
  const timestamp = gen.createdAt?.toDate?.() || new Date(gen.createdAt?.seconds * 1000 || 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
      {imgBlock && (
        <div className="aspect-video bg-gray-100 overflow-hidden">
          <img src={`data:${imgBlock.mimeType};base64,${imgBlock.data}`} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <MediaIcon type={gen.mediaType} />
          <span className="text-[10px] font-semibold text-gray-500 uppercase">{gen.serverId}</span>
          <span className="text-[10px] text-gray-400 ml-auto">{timestamp.toLocaleDateString()}</span>
        </div>
        <p className="text-xs text-navy font-medium line-clamp-2 mb-2">"{gen.prompt}"</p>
        {textBlock && !imgBlock && (
          <p className="text-[11px] text-gray-500 line-clamp-3">{textBlock.text?.slice(0, 150)}</p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[9px] px-2 py-0.5 rounded bg-gray-100 text-gray-500">{gen.toolId}</span>
          <button
            onClick={() => onRerun(gen)}
            className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-tech-blue hover:bg-tech-blue/10 px-2 py-1 rounded transition-all"
          >
            <RotateCcw className="w-3 h-3" /> Re-run
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GenerationHistory({ open, onClose, onRerun }) {
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterServer, setFilterServer] = useState('');
  const [filterType, setFilterType] = useState('');

  const fetchGenerations = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams({ limit: '100' });
      if (filterServer) params.set('server', filterServer);
      const res = await fetch(`/api/generations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGenerations(data.generations || []);
      }
    } catch (e) {
      console.warn('Failed to fetch generations:', e);
    } finally {
      setLoading(false);
    }
  }, [filterServer]);

  useEffect(() => { if (open) fetchGenerations(); }, [open, fetchGenerations]);

  if (!open) return null;

  const filtered = filterType
    ? generations.filter(g => g.mediaType === filterType)
    : generations;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-5xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-tech-blue" />
            <h2 className="text-lg font-bold text-navy">Generation History</h2>
            <span className="text-xs text-gray-400">{filtered.length} items</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-navy transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={filterServer}
            onChange={e => setFilterServer(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-tech-blue"
          >
            <option value="">All Servers</option>
            <option value="gstack-mcp">AI Agents</option>
            <option value="mcp-nanobanana">NanoBanana</option>
            <option value="mcp-veo">Veo</option>
            <option value="mcp-lyria">Lyria</option>
            <option value="mcp-avtool">AV Tool</option>
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-tech-blue"
          >
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
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Clock className="w-10 h-10 mb-3" />
              <p className="text-sm">No generations yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(gen => (
                <GenerationCard key={gen.id} gen={gen} onRerun={onRerun} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
