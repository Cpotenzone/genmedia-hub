import React, { useState, useEffect, memo } from "react";
import { ChevronRight, Menu, X, Wrench, Sparkles, Terminal, FolderDown, Clock, Zap, Shield } from "lucide-react";
import { mcpServers } from "../lib/mcpServers";
import ToolPanel from "./ToolPanel";
import ConversationPanel from "./ConversationPanel";
import ExportConfig from "./ExportConfig";
import SessionSidebar from "./SessionSidebar";
import GenerationHistory from "./GenerationHistory";
import JobQueue, { JobQueuePanel, useJobs } from "./JobQueue";
import AdminPanel, { isAdminUser } from "./AdminPanel";

const SERVER_ALIASES_FE = {
  "gstack-mcp": "gstack-mcp",
  "mcp-veo": "genmedia-veo",
  "mcp-nanobanana": "genmedia-nanobanana",
  "mcp-lyria": "genmedia-lyria",
  "mcp-avtool": "genmedia-avtool",
};

function ToolGridSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex items-start gap-4 mb-8">
        <div className="skeleton w-14 h-14 rounded-2xl" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="skeleton h-5 w-56 rounded-md" />
          <div className="skeleton h-3.5 w-80 max-w-full rounded-md" />
        </div>
      </div>
      <div className="skeleton h-3 w-32 mb-4 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="skeleton w-9 h-9 rounded-xl" />
              <div className="skeleton w-4 h-4 rounded" />
            </div>
            <div className="skeleton h-4 w-3/4 mb-2.5 rounded" />
            <div className="skeleton h-3 w-full mb-1.5 rounded" />
            <div className="skeleton h-3 w-5/6 rounded" />
            <div className="mt-4 flex gap-2">
              <div className="skeleton h-5 w-16 rounded-md" />
              <div className="skeleton h-5 w-14 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sidebar({ servers, activeServer, onSelectServer, isOpen, onClose, onExport, onHistory, onQueue, pendingJobCount, isAdmin, onAdmin }) {
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-navy flex flex-col
                    transform transition-transform duration-300 lg:transform-none
                    ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        role="navigation"
        aria-label="Server navigation"
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-white/50 uppercase tracking-[0.1em]">MCP Servers</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/60 lg:hidden" aria-label="Close navigation">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {servers.map((server) => {
            const Icon = server.icon;
            const isActive = activeServer?.id === server.id;
            return (
              <button
                key={server.id}
                onClick={() => { onSelectServer(server); onClose(); }}
                aria-label={`Select ${server.name}`}
                aria-current={isActive ? "page" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200
                  ${isActive ? "bg-tech-blue/20 border border-tech-blue/30" : "hover:bg-white/5 border border-transparent"}`}
              >
                <div className="w-9 h-9 rounded-xl bg-tech-blue/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? "text-white" : "text-white/70"}`}>{server.name}</p>
                  <p className="text-xs text-white/40 truncate">{server.tools.length} tool{server.tools.length !== 1 && "s"}</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_rgba(16,185,129,0.6)] flex-shrink-0" title="Live" />
                {isActive && <ChevronRight className="w-4 h-4 text-tech-blue flex-shrink-0" />}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-2">
          <button
            onClick={() => { onQueue(); onClose(); }}
            aria-label="View job queue"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-amber-400/40 hover:text-white transition-all duration-200 active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span className="text-sm font-medium">Job Queue</span>
            {pendingJobCount > 0 && (
              <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 text-[10px] font-bold bg-amber-400 text-navy rounded-full px-1.5 animate-pulse">
                {pendingJobCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { onHistory(); onClose(); }}
            aria-label="View generation history"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-tech-blue/40 hover:text-white transition-all duration-200 active:scale-[0.98]"
          >
            <Clock className="w-4 h-4 text-tech-blue" />
            <span className="text-sm font-medium">Generation History</span>
          </button>
          <button
            onClick={() => { onExport(); onClose(); }}
            aria-label="Export MCP configuration"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-tech-blue/40 hover:text-white transition-all duration-200 active:scale-[0.98]"
          >
            <FolderDown className="w-4 h-4 text-tech-blue" />
            <span className="text-sm font-medium">Export MCP Config</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-success/10 border border-success/20">
            <Sparkles className="w-4 h-4 text-success" />
            <span className="text-xs text-success font-medium">All servers operational</span>
          </div>
          {isAdmin && (
            <button
              onClick={() => { onAdmin(); onClose(); }}
              aria-label="Admin panel"
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left bg-indigo/10 border border-indigo/30 text-white/90 hover:bg-indigo/20 hover:border-indigo/50 hover:text-white transition-all duration-200 active:scale-[0.98]"
            >
              <Shield className="w-4 h-4 text-indigo" />
              <span className="text-sm font-medium">Admin</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

const ServerView = memo(function ServerView({ server, onSelectTool, onExport }) {
  const Icon = server.icon;
  return (
    <div className="p-6 lg:p-8 max-w-4xl animate-fadeInUp">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy to-indigo flex items-center justify-center shadow-lg shadow-indigo/20 flex-shrink-0">
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-navy tracking-tight">{server.name}</h1>
              {server.featured && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-tech-blue to-indigo">
                  <Sparkles className="w-3 h-3" /> Featured
                </span>
              )}
            </div>
            <p className="text-sm text-steel mt-1.5 max-w-lg leading-relaxed">{server.description}</p>
          </div>
        </div>
        <button
          onClick={() => onExport(server.id)}
          aria-label="Export server config"
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-navy bg-white border border-gray-200 rounded-xl flex-shrink-0 hover:border-tech-blue/40 hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 active:scale-[0.97]"
        >
          <Terminal className="w-4 h-4 text-tech-blue" /> Export
        </button>
      </div>
      <h2 className="text-xs font-bold text-steel uppercase tracking-[0.1em] mb-4">Available Tools · {server.tools.length}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {server.tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool)}
            aria-label={`Open tool: ${tool.name}`}
            className="group text-left p-5 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-tech-blue/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center group-hover:border-tech-blue/30 group-hover:bg-tech-blue/5 group-hover:scale-105 transition-all duration-200">
                <Wrench className="w-4 h-4 text-steel group-hover:text-tech-blue transition-colors duration-200" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-tech-blue group-hover:translate-x-0.5 transition-all duration-200" />
            </div>
            {tool.role && <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-indigo mb-1">{tool.role}</span>}
            <h3 className="text-sm font-bold text-navy mb-1.5">{tool.name}</h3>
            <p className="text-xs text-steel leading-relaxed">{tool.description}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-gray-50 text-steel border border-gray-100">{tool.parameters.length} params</span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-tech-blue/10 text-tech-blue border border-tech-blue/20">{tool.resultType}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

export default function Dashboard({ user }) {
  const [activeServer, setActiveServer] = useState(mcpServers[0]);
  const [activeTool, setActiveTool] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportServerId, setExportServerId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);
  const { pendingCount } = useJobs();
  const admin = isAdminUser(user);

  useEffect(() => {
    const lastSessionId = localStorage.getItem("genmedia-last-session");
    if (lastSessionId) setActiveSession({ id: lastSessionId });
  }, []);

  const openExport = (serverId = null) => { setExportServerId(serverId); setExportOpen(true); };

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, [activeServer]);

  const handleSelectSession = (session) => {
    setActiveSession(session);
    setQueueOpen(false);
    localStorage.setItem("genmedia-last-session", session.id);
    const srv = mcpServers.find((s) => s.id === session.serverId || SERVER_ALIASES_FE[session.serverId] === s.id);
    if (srv) {
      setActiveServer(srv);
      const t = srv.tools.find((t) => t.id === session.toolId);
      if (t) setActiveTool(t);
    }
  };

  const handleNewSession = () => {
    setActiveSession(null);
    setActiveTool(null);
    localStorage.removeItem("genmedia-last-session");
  };

  const handleRerun = (gen) => {
    const srv = mcpServers.find((s) => s.id === gen.serverId || SERVER_ALIASES_FE[gen.serverId] === s.id);
    if (srv) {
      setActiveServer(srv);
      const t = srv.tools.find((t) => t.id === gen.toolId);
      if (t) setActiveTool(t);
    }
    setHistoryOpen(false);
  };

  const renderMainContent = () => {
    if (queueOpen) {
      return <JobQueuePanel onViewJob={(job) => {}} />;
    }
    if (activeTool && activeSession) {
      if (activeServer.id === "gstack-mcp") {
        return <ConversationPanel tool={activeTool} server={activeServer} onClose={() => { setActiveTool(null); setActiveSession(null); }} resumeSession={activeSession} onSessionCreated={() => setSessionRefreshKey(k => k + 1)} />;
      }
      return <ToolPanel tool={activeTool} server={activeServer} onClose={() => { setActiveTool(null); setActiveSession(null); }} />;
    }
    if (activeTool) {
      if (activeServer.id === "gstack-mcp") {
        return <ConversationPanel tool={activeTool} server={activeServer} onClose={() => setActiveTool(null)} onSessionCreated={() => setSessionRefreshKey(k => k + 1)} />;
      }
      return <ToolPanel tool={activeTool} server={activeServer} onClose={() => setActiveTool(null)} />;
    }
    if (loading) return <ToolGridSkeleton />;
    return <ServerView key={activeServer.id} server={activeServer} onSelectTool={(t) => { setActiveTool(t); setQueueOpen(false); }} onExport={openExport} />;
  };

  return (
    <div className="flex h-[calc(100vh-68px)]">
      <Sidebar
        servers={mcpServers}
        activeServer={activeServer}
        onSelectServer={(server) => { setActiveServer(server); setActiveTool(null); setActiveSession(null); setQueueOpen(false); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onExport={() => { openExport(null); setSidebarOpen(false); }}
        onHistory={() => setHistoryOpen(true)}
        onQueue={() => { setQueueOpen(true); setActiveTool(null); setActiveSession(null); }}
        pendingJobCount={pendingCount}
        isAdmin={admin}
        onAdmin={() => setAdminOpen(true)}
      />
      <SessionSidebar activeSessionId={activeSession?.id} onSelectSession={handleSelectSession} onNewSession={handleNewSession} refreshKey={sessionRefreshKey} />
      <main className="flex-1 overflow-y-auto bg-[#F9FAFB]">
        <div className="lg:hidden flex items-center gap-3 p-4 border-b border-gray-200 bg-white sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="p-2 rounded-xl hover:bg-gray-100 text-steel hover:text-navy transition-all duration-200">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-navy truncate">{activeServer.name}</span>
        </div>
        {renderMainContent()}
      </main>
      <ExportConfig open={exportOpen} onClose={() => setExportOpen(false)} initialServerId={exportServerId} />
      <GenerationHistory open={historyOpen} onClose={() => setHistoryOpen(false)} onRerun={handleRerun} />
      <JobQueue onViewJob={(job) => {}} />
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  );
}
