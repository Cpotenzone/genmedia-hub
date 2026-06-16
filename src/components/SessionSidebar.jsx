import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, MessageSquare, Clock, Trash2 } from "lucide-react";
import { auth, getDb } from "../lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";

function groupByDate(sessions) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today - 86400000);
  const weekAgo = new Date(today - 7 * 86400000);

  const groups = { Today: [], Yesterday: [], 'This Week': [], Older: [] };
  sessions.forEach(s => {
    const d = s.createdAt?.toDate?.() || new Date(s.createdAt?.seconds * 1000 || 0);
    if (d >= today) groups.Today.push(s);
    else if (d >= yesterday) groups.Yesterday.push(s);
    else if (d >= weekAgo) groups['This Week'].push(s);
    else groups.Older.push(s);
  });
  return groups;
}

export default function SessionSidebar({ activeSessionId, onSelectSession, onNewSession }) {
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/sessions?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.warn('Failed to fetch sessions:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (e) {
      console.warn('Delete failed:', e);
    }
  };

  const filtered = search
    ? sessions.filter(s => s.title?.toLowerCase().includes(search.toLowerCase()) || s.lastMessage?.toLowerCase().includes(search.toLowerCase()))
    : sessions;

  const groups = groupByDate(filtered);

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts.toDate?.() || new Date(ts.seconds * 1000 || 0);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <aside className="w-[280px] bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-navy rounded-lg hover:bg-navy/90 transition-all"
        >
          <Plus className="w-4 h-4" /> New Session
        </button>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search sessions..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-tech-blue focus:ring-1 focus:ring-tech-blue/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No sessions yet</p>
          </div>
        ) : (
          Object.entries(groups).map(([label, items]) => items.length > 0 && (
            <div key={label} className="px-3 py-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">{label}</p>
              {items.map(session => (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 group transition-all duration-200 ${
                    activeSessionId === session.id
                      ? 'bg-blue-50 border-l-[3px] border-l-tech-blue'
                      : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-navy truncate">{session.title || 'Untitled'}</p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{session.lastMessage || session.toolId}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[9px] text-gray-400">{formatTime(session.updatedAt || session.createdAt)}</span>
                      <button
                        onClick={(e) => handleDelete(e, session.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
