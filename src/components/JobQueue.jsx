import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, RotateCcw, X } from "lucide-react";
import { getDb } from "../lib/firebase";
import { auth } from "../lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";

const STATUS_CONFIG = {
  queued: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50", label: "Queued" },
  processing: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-50", label: "Processing", spin: true },
  completed: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "Failed" },
};

function JobItem({ job, onRetry, onView }) {
  const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
  const Icon = config.icon;
  const prompt = job.params?.description || job.params?.prompt || job.params?.response || Object.values(job.params || {})[0] || '';

  return (
    <div className={`p-3 rounded-lg border border-gray-100 ${config.bg} transition-all`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color} ${config.spin ? 'animate-spin' : ''}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-navy truncate">{job.toolId}</p>
          <p className="text-[11px] text-steel truncate">{prompt}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {job.status === 'completed' && (
            <button onClick={() => onView(job)} className="p-1 rounded hover:bg-white/80 text-green-600" title="View result">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}
          {job.status === 'failed' && (
            <button onClick={() => onRetry(job)} className="p-1 rounded hover:bg-white/80 text-red-600" title="Retry">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {job.status === 'failed' && job.error && (
        <p className="text-[10px] text-red-600 mt-1 ml-6 truncate">{job.error}</p>
      )}
    </div>
  );
}

export default function JobQueue({ onViewJob }) {
  const [jobs, setJobs] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const firestore = getDb();
    const user = auth?.currentUser;
    if (!firestore || !user) return;

    const q = query(
      collection(firestore, 'jobs'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn('JobQueue listener error:', err);
    });

    return unsub;
  }, [auth?.currentUser?.uid]);

  const pendingCount = jobs.filter(j => j.status === 'queued' || j.status === 'processing').length;

  const handleRetry = async (job) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ server: job.serverId, tool: job.toolId, params: job.params, mode: 'async' }),
      });
    } catch (e) {
      console.error('Retry failed:', e);
    }
  };

  if (hidden || jobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-navy text-white cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Job Queue</span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-tech-blue rounded-full">
              {pendingCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setHidden(true); }} className="p-1 rounded hover:bg-white/20">
            <X className="w-3.5 h-3.5" />
          </button>
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Job list */}
      {!collapsed && (
        <div className="max-h-72 overflow-y-auto p-3 space-y-2">
          {jobs.length === 0 ? (
            <p className="text-xs text-steel text-center py-4">No jobs yet</p>
          ) : (
            jobs.map(job => (
              <JobItem key={job.id} job={job} onRetry={handleRetry} onView={onViewJob} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
