import React, { useState } from "react";
import {
  ChevronRight,
  Menu,
  X,
  Wrench,
  Sparkles,
} from "lucide-react";
import { mcpServers } from "../lib/mcpServers";
import ToolPanel from "./ToolPanel";

function Sidebar({ servers, activeServer, onSelectServer, isOpen, onClose }) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#0c0c14]/95 backdrop-blur-xl
                    border-r border-white/[0.06] flex flex-col
                    transform transition-transform duration-300 lg:transform-none
                    ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              MCP Servers
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/5 text-gray-500 lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Server List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {servers.map((server) => {
            const Icon = server.icon;
            const isActive = activeServer?.id === server.id;
            return (
              <button
                key={server.id}
                onClick={() => {
                  onSelectServer(server);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200
                  ${
                    isActive
                      ? "bg-white/[0.06] border border-white/[0.08]"
                      : "hover:bg-white/[0.03] border border-transparent"
                  }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg bg-gradient-to-br ${server.color} flex items-center justify-center flex-shrink-0 ${
                    isActive ? "shadow-lg" : "opacity-70"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      isActive ? "text-white" : "text-gray-400"
                    }`}
                  >
                    {server.name}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {server.tools.length} tool{server.tools.length !== 1 && "s"}
                  </p>
                </div>
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-purple-300">
              All servers operational
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

function ServerView({ server, onSelectTool }) {
  const Icon = server.icon;

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Server Header */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${server.color} flex items-center justify-center shadow-xl`}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{server.name}</h1>
          <p className="text-sm text-gray-400 mt-1 max-w-lg">
            {server.description}
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Available Tools
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {server.tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool)}
            className="group text-left p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]
                       hover:bg-white/[0.04] hover:border-white/[0.12]
                       transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center group-hover:border-purple-500/30 transition-colors">
                <Wrench className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1.5">
              {tool.name}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              {tool.description}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-gray-600 border border-white/[0.06]">
                {tool.parameters.length} params
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
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

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <Sidebar
        servers={mcpServers}
        activeServer={activeServer}
        onSelectServer={(server) => {
          setActiveServer(server);
          setActiveTool(null);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0f]">
        {/* Mobile menu button */}
        <div className="lg:hidden p-4 border-b border-white/[0.06]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {activeTool ? (
          <ToolPanel
            tool={activeTool}
            server={activeServer}
            onClose={() => setActiveTool(null)}
          />
        ) : (
          <ServerView
            server={activeServer}
            onSelectTool={setActiveTool}
          />
        )}
      </main>
    </div>
  );
}
