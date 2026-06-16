import React, { useState, useEffect } from "react";
import {
  ChevronRight,
  Menu,
  X,
  Wrench,
  Sparkles,
  Terminal,
  FolderDown,
} from "lucide-react";
import { mcpServers } from "../lib/mcpServers";
import ToolPanel from "./ToolPanel";
import ExportConfig from "./ExportConfig";

/* Shimmer skeleton shown while a server's tools "load" */
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
              <div className="skeleton w-9 h-9 rounded-lg" />
              <div className="skeleton w-4 h-4 rounded" />
            </div>
            <div className="skeleton h-4 w-3/4 mb-2.5 rounded" />
            <div className="skeleton h-3 w-full mb-1.5 rounded" />
            <div className="skeleton h-3 w-5/6 rounded" />
            <div className="mt-4 flex gap-2">
              <div className="skeleton h-4 w-16 rounded-md" />
              <div className="skeleton h-4 w-14 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sidebar({ servers, activeServer, onSelectServer, isOpen, onClose, onExport }) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-navy flex flex-col
                    transform transition-transform duration-300 lg:transform-none
                    ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              MCP Servers
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/60 lg:hidden">
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200
                  ${isActive ? "bg-tech-blue/20 border border-tech-blue/30" : "hover:bg-white/5 border border-transparent"}`}
              >
                <div className={`w-9 h-9 rounded-lg bg-tech-blue/20 flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? "text-white" : "text-white/70"}`}>
                    {server.name}
                  </p>
                  <p className="text-xs text-white/40 truncate">
                    {server.tools.length} tool{server.tools.length !== 1 && "s"}
                  </p>
                </div>
                <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_rgba(16,185,129,0.6)] flex-shrink-0" title="Live" />
                {isActive && <ChevronRight className="w-4 h-4 text-tech-blue flex-shrink-0" />}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-2">
          <button
            onClick={onExport}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left
                       bg-white/5 border border-white/10 text-white/80
                       hover:bg-white/10 hover:border-tech-blue/40 hover:text-white
                       transition-all duration-300"
          >
            <FolderDown className="w-4 h-4 text-tech-blue" />
            <span className="text-sm font-medium">Export MCP Config</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20">
            <Sparkles className="w-4 h-4 text-success" />
            <span className="text-xs text-success">All servers operational</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function ServerView({ server, onSelectTool, onExport }) {
  const Icon = server.icon;

  return (
    <div className="p-6 lg:p-8 max-w-4xl view-fade-up">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy to-indigo flex items-center justify-center shadow-lg shadow-indigo/20 flex-shrink-0">
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-navy tracking-tight">{server.name}</h1>
              {server.featured && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-tech-blue to-indigo">
                  <Sparkles className="w-3 h-3" /> Featured
                </span>
              )}
            </div>
            <p className="text-sm text-steel mt-1.5 max-w-lg leading-relaxed">{server.description}</p>
          </div>
        </div>
        <button
          onClick={() => onExport(server.id)}
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-navy
                     bg-white border border-gray-200 rounded-lg flex-shrink-0
                     hover:border-tech-blue/40 hover:bg-gray-50 hover:-translate-y-0.5
                     transition-all duration-300"
        >
          <Terminal className="w-4 h-4 text-tech-blue" /> Export
        </button>
      </div>

      <h2 className="text-xs font-semibold text-steel uppercase tracking-[0.1em] mb-4">
        Available Tools · {server.tools.length}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {server.tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool)}
            className="group text-left p-5 rounded-xl bg-white border border-gray-200
                       hover:border-tech-blue/40 hover:shadow-md hover:-translate-y-1
                       transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center group-hover:border-tech-blue/30 group-hover:bg-tech-blue/5 group-hover:scale-105 transition-all duration-300">
                <Wrench className="w-4 h-4 text-steel group-hover:text-tech-blue transition-colors" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-tech-blue group-hover:translate-x-0.5 transition-all duration-300" />
            </div>
            {tool.role && (
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-indigo mb-1">
                {tool.role}
              </span>
            )}
            <h3 className="text-sm font-bold text-navy mb-1.5">{tool.name}</h3>
            <p className="text-xs text-steel leading-relaxed">{tool.description}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-50 text-steel border border-gray-100">
                {tool.parameters.length} params
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-tech-blue/10 text-tech-blue border border-tech-blue/20">
                {tool.resultType}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ user }) {
  const [activeServer, setActiveServer] = useState(mcpServers[0]);
  const [activeTool, setActiveTool] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportServerId, setExportServerId] = useState(null);

  const openExport = (serverId = null) => {
    setExportServerId(serverId);
    setExportOpen(true);
  };

  // Brief shimmer when the dashboard mounts and on each server switch —
  // gives the perceived-performance polish of a real data fetch.
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 480);
    return () => clearTimeout(t);
  }, [activeServer]);

  return (
    <div className="flex h-[calc(100vh-68px)]">
      <Sidebar
        servers={mcpServers}
        activeServer={activeServer}
        onSelectServer={(server) => { setActiveServer(server); setActiveTool(null); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onExport={() => { openExport(null); setSidebarOpen(false); }}
      />

      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="lg:hidden flex items-center gap-3 p-4 border-b border-gray-200 bg-white sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="p-2 rounded-lg hover:bg-gray-100 text-steel hover:text-navy transition-colors duration-300"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-navy truncate">{activeServer.name}</span>
        </div>

        {activeTool ? (
          <ToolPanel tool={activeTool} server={activeServer} onClose={() => setActiveTool(null)} />
        ) : loading ? (
          <ToolGridSkeleton />
        ) : (
          <ServerView key={activeServer.id} server={activeServer} onSelectTool={setActiveTool} onExport={openExport} />
        )}
      </main>

      <ExportConfig
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        initialServerId={exportServerId}
      />
    </div>
  );
}
