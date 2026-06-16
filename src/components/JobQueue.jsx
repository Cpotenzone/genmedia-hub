import React, { useState, useEffect, memo } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, RotateCcw, X, Zap } from "lucide-react";
import { getDb, auth } from "../lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { useToast } from "./Toast";

const STATUS_CONFIG = {
  queued: { icon: Clock, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200", label: "Queued", pulse: true },
  processing: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200", label: "Processing", spin: true },
  completed: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", border: "border-red-200", label: "Failed" },
};

const JobItem = memo(function JobItem({ job, onRetry, onView }) {
  const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
  const Icon = config.icon;
  const prompt = job.params?.description || job.params?.prompt || job.params?.response || Object.values(job.params || {})[0] || "";

  return (
    <div className={`p-3 rounded-xl border ${config.border} ${config.bg} transition-all duration-300 animate-fadeInUp`}>
      <div className="flex items-start gap-2.5">
        <div className="relative flex-shrink-0 mt-0.5">
          <Icon className={`w-4 h-4 ${config.color} ${config.spin ? "animate-spin" : ""}`} />
          {config.pulse && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-navy truncate">{job.toolId}</p>
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${config.bg} ${config.color}`}>
              {config.label}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 truncate mt-0.5">{prompt}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {job.status === "completed" && (
            <button onClick={() => onView(job)} className="p-1 rounded-md hover:bg-emerald-100 text-emerald-600 transition-colors" aria-label="View result" title="View result">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}
          {job.status === "failed" && (
            <button onClick={() => onRetry(job)} className="p-1 rounded-md hover:bg-red-100 text-red-600 transition-colors" aria-label="Retry job" title="Retry">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {job.status === "failed" && job.error && (
        <p className="text-[10px] text-red-600 mt-1.5 ml-6 truncate">{job.error}</p>
      )}
      {job.status === "processing" && (
        <div className="mt-2 ml-6">
          <div className="h-1 w-full bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-tech-blue to-indigo rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}
    </div>
  );
});

export default function JobQueue({ onViewJob }) {
  const [jobs, setJobs] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [prevStatuses, setPrevStatuses] = useState({});
  const toast = useToast();

  useEffect(() => {
    const firestore = getDb();
    const user = auth?.currentUser;
    if (!firestore || !user) return;

    const q = query(
      collection(firestore, "jobs"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const newJobs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Detect status transitions for toasts
      newJobs.forEach((job) => {
        const prev = prevStatuses[job.id];
        if (prev && prev !== job.status) {
          if (job.status === "completed" && toast) toast("Generation complete ✓", "success");
          if (job.status === "processing" && toast) toast("Job started processing", "info");
        }
      });
      const statusMap = {};
      newJobs.forEach((j) => { statusMap[j.id] = j.status; });
      setPrevStatuses(statusMap);
      setJobs(newJobs);
    }, (err) => {
      console.warn("JobQueue listener error:", err);
    });

    return unsub;
  }, [auth?.currentUser?.uid]);

  const pendingCount = jobs.filter((j) => j.status === "queued" || j.status === "processing").length;

  const handleRetry = async (job) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ server: job.serverId, tool: job.toolId, params: job.params, mode: "async" }),
      });
      if (toast) toast("Job re-queued", "info");
    } catch (e) {
      console.error("Retry failed:", e);
    }
  };

  if (hidden || jobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-navy to-navy-deep text-white cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
        role="button"
        aria-expanded={!collapsed}
        aria-label="Toggle job queue"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-300" />
          <span className="text-sm font-semibold">Job Queue</span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 text-[10px] font-bold bg-tech-blue rounded-full px-1.5 animate-pulse">
              {pendingCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setHidden(true); }}
            className="p-1 rounded-md hover:bg-white/20 transition-colors"
            aria-label="Hide job queue"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Job list */}
      {!collapsed && (
        <div className="max-h-80 overflow-y-auto p-3 space-y-2 transition-all duration-300">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Zap className="w-6 h-6 text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">Queue is empty — fire off a generation!</p>
            </div>
          ) : (
            jobs.map((job) => (
              <JobItem key={job.id} job={job} onRetry={handleRetry} onView={onViewJob} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
