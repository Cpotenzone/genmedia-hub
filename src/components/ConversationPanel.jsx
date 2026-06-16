import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, X, Send, Loader2, Brain, Clock } from "lucide-react";
import { auth } from "../lib/firebase";
import { formatTime as fmtTime } from "../lib/dateUtils";
import { AgentMessage, UserMessage } from "./ChatComponents";
import { useToast } from "./Toast";

export default function ConversationPanel({ tool, server, onClose, resumeSession }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(resumeSession?.id || null);
  const [mcpSessionId, setMcpSessionId] = useState(null);
  const [started, setStarted] = useState(!!resumeSession);
  const [formData, setFormData] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef(null);
  const elapsedRef = useRef(null);
  const toast = useToast();

  // Load previous messages if resuming
  useEffect(() => {
    if (!resumeSession?.id) return;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/sessions/${resumeSession.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const loaded = (data.messages || []).map((m) => ({
            role: m.role,
            text: m.content,
            raw: m.role === "agent" ? m.content : undefined,
            time: fmtTime(m.timestamp),
            selectedOption: null,
            onSelect: null,
          }));
          setMessages(loaded);
        }
      } catch (e) {
        console.warn("Failed to load session messages:", e);
      }
    })();
  }, [resumeSession]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading]);

  // Elapsed timer during loading
  useEffect(() => {
    if (loading) {
      setElapsed(0);
      elapsedRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(elapsedRef.current);
    }
    return () => clearInterval(elapsedRef.current);
  }, [loading]);

  const timeNow = () => new Date().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit", hour12: true });

  const sendToMcp = async (params) => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const body = { server: server.id, tool: tool.id, params };
      if (sessionId) body.sessionId = sessionId;
      if (mcpSessionId) body.mcpSessionId = mcpSessionId;
      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${response.status})`);
      }
      const data = await response.json();
      // Store sessionId from backend
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem("genmedia-last-session", data.sessionId);
        if (toast) toast("Session created", "success");
      } else if (data.sessionId) {
        setSessionId(data.sessionId);
      }
      // Store mcpSessionId for Cloud Run threading
      if (data.mcpSessionId) {
        setMcpSessionId(data.mcpSessionId);
      }
      const content = data.result?.content || [];
      const textBlocks = content.filter((b) => b.type === "text").map((b) => b.text).join("\n\n");
      return textBlocks || JSON.stringify(data.result, null, 2);
    } catch (err) {
      return `Error: ${err.message}`;
    } finally {
      setLoading(false);
    }
  };

  const addAgentMessage = (rawText) => {
    setMessages((prev) => {
      const newMsg = { role: "agent", raw: rawText, time: timeNow(), selectedOption: null, onSelect: null };
      const updated = [...prev, newMsg];
      const lastIdx = updated.length - 1;
      updated[lastIdx] = { ...updated[lastIdx], onSelect: (key) => handleOptionSelect(lastIdx, key) };
      return updated;
    });
  };

  const handleStart = async (e) => {
    e.preventDefault();
    setStarted(true);
    const cleanParams = {};
    for (const [k, v] of Object.entries(formData)) {
      if (v !== "" && v !== null && v !== undefined) cleanParams[k] = v;
    }
    const promptField = tool.parameters.find((p) => p.type === "textarea") || tool.parameters[0];
    const userText = formData[promptField?.name] || JSON.stringify(cleanParams);
    setMessages([{ role: "user", text: userText, time: timeNow() }]);
    const rawResponse = await sendToMcp(cleanParams);
    addAgentMessage(rawResponse);
  };

  const handleOptionSelect = async (msgIndex, key) => {
    setMessages((prev) => {
      const updated = [...prev];
      updated[msgIndex] = { ...updated[msgIndex], selectedOption: key };
      return updated;
    });
    setMessages((prev) => [...prev, { role: "user", text: key, time: timeNow() }]);
    const rawResponse = await sendToMcp({ response: key });
    addAgentMessage(rawResponse);
  };

  const handleFreeInput = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text, time: timeNow() }]);
    const rawResponse = await sendToMcp({ response: text });
    addAgentMessage(rawResponse);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={onClose} aria-label="Go back" className="p-2 rounded-xl hover:bg-gray-100 text-steel hover:text-navy transition-all duration-200 active:scale-[0.95]">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-200">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-navy">{tool.name}</h2>
              <p className="text-[10px] text-gray-400">{tool.role || server.name}</p>
            </div>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close panel" className="p-2 rounded-xl hover:bg-gray-100 text-steel hover:text-navy transition-all duration-200 active:scale-[0.95]">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {!started ? (
          <div className="max-w-lg mx-auto mt-8 animate-fadeInUp">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-steel mb-5">{tool.description}</p>
              <form onSubmit={handleStart} className="space-y-4">
                {tool.parameters.map((param) => (
                  <div key={param.name}>
                    <label className="block text-sm font-medium text-navy mb-1.5">
                      {param.label}
                      {param.required && <span className="text-indigo ml-1">*</span>}
                    </label>
                    {param.type === "textarea" ? (
                      <textarea
                        value={formData[param.name] || ""}
                        onChange={(e) => setFormData((f) => ({ ...f, [param.name]: e.target.value }))}
                        placeholder={param.placeholder}
                        rows={4}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy placeholder-gray-400 focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/20 transition-all duration-200 resize-y min-h-[100px] max-h-[300px]"
                        required={param.required}
                      />
                    ) : param.type === "select" ? (
                      <select
                        value={formData[param.name] || param.default || ""}
                        onChange={(e) => setFormData((f) => ({ ...f, [param.name]: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/20 transition-all duration-200 appearance-none"
                      >
                        {param.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formData[param.name] || ""}
                        onChange={(e) => setFormData((f) => ({ ...f, [param.name]: e.target.value }))}
                        placeholder={param.placeholder}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy placeholder-gray-400 focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/20 transition-all duration-200"
                        required={param.required}
                      />
                    )}
                  </div>
                ))}
                <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-navy rounded-xl shadow-md hover:bg-navy/90 hover:shadow-lg hover:scale-[1.01] active:scale-[0.98] transition-all duration-200">
                  <Send className="w-4 h-4" /> Start Conversation
                </button>
              </form>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) =>
              msg.role === "agent" ? <AgentMessage key={i} message={msg} /> : <UserMessage key={i} message={msg} />
            )}
            {loading && (
              <div className="flex gap-3 items-start animate-fadeInUp">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-200">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border-l-[3px] border-l-tech-blue rounded-r-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-4 h-4 text-tech-blue animate-spin" />
                    <span className="text-sm font-medium text-navy">Agent is thinking...</span>
                    <span className="text-[10px] text-gray-400 font-mono ml-auto flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {elapsed}s
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#F9FAFB] pl-4 pr-3 py-2">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-tech-blue/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-tech-blue/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-tech-blue/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input bar */}
      {started && (
        <div className="border-t border-gray-100 px-5 py-4">
          <form onSubmit={handleFreeInput} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a response..."
              disabled={loading}
              aria-label="Message input"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy placeholder-gray-400 focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/20 transition-all duration-200 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="px-4 py-3 bg-navy text-white rounded-xl hover:bg-navy/90 hover:scale-[1.02] active:scale-[0.96] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
