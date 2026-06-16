import React, { useState, useEffect, useCallback } from "react";
import { Shield, Users, Activity, Image, Radio, X, RotateCcw, ChevronDown } from "lucide-react";
import { getDb } from "../lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
import { auth } from "../lib/firebase";

const ADMIN_EMAILS = ["casey@criticalasset.com", "casey@insuremep.com"];
export function isAdminUser(user) {
  return user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
}

const API_BASE = "https://us-central1-casey-genmedia.cloudfunctions.net/mcpProxy/api";

async function adminFetch(path) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function formatTime(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts._seconds ? ts._seconds * 1000 : ts);
  return d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ─── Stats Dashboard ─────────────────────────────────────────────────────────

function StatCard({ label, value, color = "indigo" }) {
  const borderColors = { green: "border-l-emerald-500", amber: "border-l-amber-500", indigo: "border-l-indigo-500", red: "border-l-red-500" };
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColors[color]} p-4 shadow-sm`}>
      <p className="text-xs text-steel uppercase tracking-wide font-semibold">{label}</p>
      <p className="text-2xl font-bold text-navy mt-1">{value}</p>
    </div>
  );
}

function OverviewDashboard({ stats }) {
  if (!stats) return <div className="p-8 text-center text-steel">Loading stats...</div>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
      <StatCard label="Total Users" value={stats.totalUsers} color="indigo" />
      <StatCard label="Requests Today" value={stats.requestsToday} color="green" />
      <StatCard label="This Week" value={stats.requestsWeek} color="green" />
      <StatCard label="All Time" value={stats.totalRequests} color="indigo" />
      <StatCard label="Error Rate" value={`${stats.errorRate}%`} color={parseFloat(stats.errorRate) > 5 ? "red" : "green"} />
      <StatCard label="Avg Response" value={`${stats.avgResponseTime}ms`} color={stats.avgResponseTime > 5000 ? "amber" : "green"} />
      <StatCard label="Cache Hits" value={stats.cacheHits} color="green" />
      <StatCard label="Cache Entries" value={stats.cacheEntries} color="indigo" />
    </div>
  );
}

// ─── Users Table ─────────────────────────────────────────────────────────────

function UsersTable({ users }) {
  if (!users) return <div className="p-8 text-center text-steel">Loading users...</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-navy">Name</th>
            <th className="text-left px-4 py-3 font-semibold text-navy">Email</th>
            <th className="text-left px-4 py-3 font-semibold text-navy">Last Active</th>
            <th className="text-right px-4 py-3 font-semibold text-navy"># Requests</th>
            <th className="text-right px-4 py-3 font-semibold text-navy"># Generations</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr key={u.id} className={`border-b border-gray-100 hover:bg-indigo-50/40 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
              <td className="px-4 py-3 font-medium text-navy">{u.displayName || "—"}</td>
              <td className="px-4 py-3 text-steel">{u.email}</td>
              <td className="px-4 py-3 text-steel">{formatTime(u.lastLogin)}</td>
              <td className="px-4 py-3 text-right text-navy font-medium">{u.totalSessions || 0}</td>
              <td className="px-4 py-3 text-right text-navy font-medium">{u.totalGenerations || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Request Log ─────────────────────────────────────────────────────────────

function RequestLog({ requests, onSelect }) {
  if (!requests) return <div className="p-8 text-center text-steel">Loading requests...</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-navy">Time</th>
            <th className="text-left px-4 py-3 font-semibold text-navy">User</th>
            <th className="text-left px-4 py-3 font-semibold text-navy">Server</th>
            <th className="text-left px-4 py-3 font-semibold text-navy">Tool</th>
            <th className="text-center px-4 py-3 font-semibold text-navy">Status</th>
            <th className="text-right px-4 py-3 font-semibold text-navy">Duration</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r, i) => (
            <tr key={r.id} onClick={() => onSelect(r)} className={`border-b border-gray-100 hover:bg-indigo-50/40 cursor-pointer ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
              <td className="px-4 py-3 text-steel whitespace-nowrap">{formatTime(r.timestamp)}</td>
              <td className="px-4 py-3 text-steel truncate max-w-[150px]">{r.userEmail || r.userId}</td>
              <td className="px-4 py-3 text-navy font-medium">{r.serverId}</td>
              <td className="px-4 py-3 text-steel">{r.toolId}</td>
              <td className="px-4 py-3 text-center">{r.status === "success" ? <span className="text-emerald-500">✓</span> : <span className="text-red-500">✗</span>}</td>
              <td className="px-4 py-3 text-right text-steel">{r.duration ? `${r.duration}ms` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Request Detail Modal ────────────────────────────────────────────────────

function RequestDetailModal({ request, onClose, onRerun }) {
  if (!request) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-indigo-50/50">
          <div>
            <h3 className="font-bold text-navy">{request.serverId} → {request.toolId}</h3>
            <p className="text-xs text-steel mt-0.5">{formatTime(request.timestamp)} · {request.duration}ms · {request.status}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRerun} className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Re-run
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          <div>
            <p className="text-xs font-bold text-steel uppercase mb-1">User</p>
            <p className="text-sm text-navy">{request.userEmail} ({request.userId})</p>
          </div>
          <div>
            <p className="text-xs font-bold text-steel uppercase mb-1">Params</p>
            <pre className="text-xs bg-gray-900 text-green-300 p-4 rounded-lg overflow-x-auto max-h-48">{JSON.stringify(request.params, null, 2)}</pre>
          </div>
          <div>
            <p className="text-xs font-bold text-steel uppercase mb-1">Result</p>
            {request.errorMessage ? (
              <pre className="text-xs bg-red-50 text-red-700 p-4 rounded-lg overflow-x-auto max-h-48">{request.errorMessage}</pre>
            ) : (
              <pre className="text-xs bg-gray-900 text-blue-300 p-4 rounded-lg overflow-x-auto max-h-48">{JSON.stringify(request.result, null, 2)}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generations Gallery ─────────────────────────────────────────────────────

function GenerationsGallery({ generations }) {
  if (!generations) return <div className="p-8 text-center text-steel">Loading generations...</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      {generations.map(g => (
        <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-600 uppercase">{g.serverId}</span>
            <span className="text-xs text-steel">{formatTime(g.createdAt)}</span>
          </div>
          <p className="text-sm text-navy font-medium truncate">{g.prompt || g.toolId}</p>
          <p className="text-xs text-steel mt-1">{g.toolId} · {g.mediaType || "text"}</p>
          <p className="text-xs text-steel/60 mt-1 truncate">User: {g.userId}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Real-time Activity Feed ─────────────────────────────────────────────────

function LiveFeed({ items }) {
  return (
    <div className="space-y-2 p-6 max-h-[60vh] overflow-y-auto">
      {items.length === 0 && <p className="text-center text-steel py-8">Waiting for activity...</p>}
      {items.map((r, i) => (
        <div key={r.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl shadow-sm animate-[slideIn_0.3s_ease-out]">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.status === "success" ? "bg-emerald-500" : "bg-red-500"}`} />
          <span className="text-xs text-steel whitespace-nowrap">{formatTime(r.timestamp)}</span>
          <span className="text-xs text-navy font-medium truncate">{r.userEmail?.split("@")[0]}</span>
          <span className="text-xs text-indigo-600 font-medium">{r.serverId}</span>
          <span className="text-xs text-steel truncate flex-1">{r.toolId}</span>
          <span className="text-xs text-steel">{r.duration}ms</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main AdminPanel ─────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "users", label: "Users", icon: Users },
  { id: "requests", label: "Request Log", icon: Shield },
  { id: "generations", label: "Generations", icon: Image },
  { id: "live", label: "Live Feed", icon: Radio },
];

export default function AdminPanel({ onClose }) {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [requests, setRequests] = useState(null);
  const [generations, setGenerations] = useState(null);
  const [liveItems, setLiveItems] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Load data based on active tab
  useEffect(() => {
    if (tab === "overview" && !stats) {
      adminFetch("/admin/stats").then(setStats).catch(console.error);
    }
    if (tab === "users" && !users) {
      adminFetch("/admin/users").then(d => setUsers(d.users)).catch(console.error);
    }
    if (tab === "requests" && !requests) {
      adminFetch("/admin/requests").then(d => setRequests(d.requests)).catch(console.error);
    }
    if (tab === "generations" && !generations) {
      adminFetch("/admin/generations").then(d => setGenerations(d.generations)).catch(console.error);
    }
  }, [tab]);

  // Real-time listener for live feed
  useEffect(() => {
    if (tab !== "live") return;
    const db = getDb();
    if (!db) return;
    const q = query(collection(db, "requests"), orderBy("timestamp", "desc"), limit(50));
    const unsub = onSnapshot(q, snap => {
      setLiveItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [tab]);

  const handleRerun = useCallback(async () => {
    if (!selectedRequest) return;
    const token = await auth.currentUser?.getIdToken();
    await fetch(`${API_BASE}/mcp`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ server: selectedRequest.serverId, tool: selectedRequest.toolId, params: selectedRequest.params, mode: "sync" }),
    });
    setSelectedRequest(null);
    // Refresh requests
    adminFetch("/admin/requests").then(d => setRequests(d.requests)).catch(console.error);
  }, [selectedRequest]);

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h1 className="text-lg font-bold text-navy">Admin Panel</h1>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">GenMedia Hub</span>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-steel hover:text-navy">
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b border-gray-200 px-6 flex gap-1 overflow-x-auto flex-shrink-0">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-steel hover:text-navy"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {tab === "overview" && <OverviewDashboard stats={stats} />}
        {tab === "users" && <UsersTable users={users} />}
        {tab === "requests" && <RequestLog requests={requests} onSelect={setSelectedRequest} />}
        {tab === "generations" && <GenerationsGallery generations={generations} />}
        {tab === "live" && <LiveFeed items={liveItems} />}
      </main>

      {/* Request Detail Modal */}
      <RequestDetailModal request={selectedRequest} onClose={() => setSelectedRequest(null)} onRerun={handleRerun} />
    </div>
  );
}
