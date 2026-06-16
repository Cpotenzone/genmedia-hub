import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, MessageSquare, Trash2 } from "lucide-react";
import { auth } from "../lib/firebase";
import { formatSessionDate, getDateGroup } from "../lib/dateUtils";

function SkeletonItems() {
  return (
    <div className="p-3 space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl">
          <div className="skeleton h-3.5 w-3/4 rounded-md" />
          <div className="skeleton h-2.5 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function SessionSidebar({ activeSessionId, onSelectSession, onNewSession }) {
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchDebounced, setSearchDebounced] = useState("");

  const fetchSessions = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/sessions?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.warn("Failed to fetch sessions:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (e) {
      console.warn("Delete failed:", e);
    }
  };

  const filtered = useMemo(() => {
    if (!searchDebounced) return sessions;
    const q = searchDebounced.toLowerCase();
    return sessions.filter(
      (s) => s.title?.toLowerCase().includes(q) || s.lastMessage?.toLowerCase().includes(q)
    );
  }, [sessions, searchDebounced]);

  const groups = useMemo(() => {
    const g = { Today: [], Yesterday: [], "This Week": [], Older: [] };
    filtered.forEach((s) => {
      const group = getDateGroup(s.updatedAt || s.createdAt);
      g[group].push(s);
    });
    return g;
  }, [filtered]);

  return (
    <aside className="w-[280px] bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0 max-lg:hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <button
          onClick={onNewSession}
          aria-label="Start new session"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-navy border-2 border-dashed border-gray-300 rounded-xl hover:border-tech-blue hover:text-tech-blue hover:bg-tech-blue/5 transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> New Session
        </button>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            aria-label="Search sessions"
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/20 transition-all duration-200"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <SkeletonItems />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-400 mb-1">
              {search ? "No matching sessions" : "Start your first conversation"}
            </p>
            <p className="text-xs text-gray-300 mb-4">
              {search ? "Try different keywords" : "Select a tool and send a message"}
            </p>
            {!search && (
              <button
                onClick={onNewSession}
                className="text-xs text-tech-blue font-medium hover:underline"
              >
                Get started →
              </button>
            )}
          </div>
        ) : (
          Object.entries(groups).map(
            ([label, items]) =>
              items.length > 0 && (
                <div key={label} className="px-3 pt-3 pb-1">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.08em] px-2 mb-1.5">
                    {label}
                  </h3>
                  {items.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => onSelectSession(session)}
                      aria-label={`Open session: ${session.title || "Untitled"}`}
                      className={`w-full text-left px-3 py-2.5 rounded-xl mb-0.5 group transition-all duration-200 ${
                        activeSessionId === session.id
                          ? "bg-blue-50/80 border-l-[3px] border-l-tech-blue shadow-sm"
                          : "hover:bg-gray-50 border-l-[3px] border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-navy truncate">
                            {session.title || "Untitled"}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">
                            {session.lastMessage || session.toolId}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[9px] text-gray-400">
                            {formatSessionDate(session.updatedAt || session.createdAt)}
                          </span>
                          <button
                            onClick={(e) => handleDelete(e, session.id)}
                            aria-label={`Delete session: ${session.title || "Untitled"}`}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all duration-200"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )
          )
        )}
      </div>
    </aside>
  );
}
