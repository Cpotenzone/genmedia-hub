import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, X, Send, Loader2, Check, Brain } from "lucide-react";
import { auth } from "../lib/firebase";

// Parse AskUserQuestion blocks from response text
function parseQuestions(text) {
  const questions = [];
  const regex = /AskUserQuestion\(\s*question_id=['"](.*?)['"],?\s*question_title=['"](.*?)['"],?\s*question_text=["'](.*?)["'],?\s*options=\[([\s\S]*?)\]\s*\)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const [, id, title, questionText, optionsRaw] = match;
    const options = [];
    const optRegex = /\{\s*key:\s*['"](.*?)['"],\s*label:\s*['"](.*?)['"],\s*description:\s*['"](.*?)['"]\s*\}/g;
    let optMatch;
    while ((optMatch = optRegex.exec(optionsRaw)) !== null) {
      options.push({ key: optMatch[1], label: optMatch[2], description: optMatch[3] });
    }
    questions.push({ id, title, text: questionText, options });
  }
  return questions;
}

// Simple markdown-to-JSX renderer
function Markdown({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-sm font-bold text-navy mt-3 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-base font-bold text-navy mt-3 mb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-lg font-bold text-navy mt-3 mb-1">{line.slice(2)}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(<li key={i} className="text-sm text-steel ml-4 list-disc">{renderInline(line.slice(2))}</li>);
    } else if (line.startsWith("```")) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(<pre key={i} className="text-xs bg-gray-100 rounded-lg p-3 my-2 overflow-x-auto font-mono">{codeLines.join("\n")}</pre>);
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-sm text-steel leading-relaxed">{renderInline(line)}</p>);
    }
    i++;
  }
  return <div className="space-y-0.5">{elements}</div>;
}

function renderInline(text) {
  // Handle **bold** and *italic*
  const parts = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    if (boldMatch) {
      const idx = remaining.indexOf(boldMatch[0]);
      if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
      parts.push(<strong key={key++} className="font-semibold text-navy">{boldMatch[1]}</strong>);
      remaining = remaining.slice(idx + boldMatch[0].length);
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }
  return parts;
}

// Strip AskUserQuestion blocks from text for display
function stripQuestionBlocks(text) {
  return text.replace(/AskUserQuestion\([\s\S]*?\)\s*/g, "").trim();
}

function QuestionCard({ question, onSelect, selectedKey }) {
  return (
    <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
      <h4 className="text-sm font-bold text-navy mb-1">{question.title}</h4>
      <p className="text-sm text-steel mb-3">{question.text}</p>
      <div className="space-y-2">
        {question.options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onSelect(opt.key, opt.label)}
            disabled={!!selectedKey}
            className={`w-full text-left p-3 rounded-lg border transition-all duration-200
              ${selectedKey === opt.key
                ? "border-tech-blue bg-tech-blue/5 shadow-sm"
                : selectedKey
                  ? "border-gray-200 bg-white opacity-50 cursor-not-allowed"
                  : "border-gray-200 bg-white hover:border-tech-blue hover:shadow-sm cursor-pointer"
              }`}
          >
            <div className="flex items-start gap-3">
              <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
                ${selectedKey === opt.key ? "bg-tech-blue text-white" : "bg-gray-100 text-navy"}`}>
                {selectedKey === opt.key ? <Check className="w-4 h-4" /> : opt.key}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy">{opt.label}</p>
                {opt.description && <p className="text-xs text-steel mt-0.5">{opt.description}</p>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AgentMessage({ message }) {
  const questions = parseQuestions(message.raw || "");
  const cleanText = stripQuestionBlocks(message.raw || message.text || "");

  return (
    <div className="flex gap-3 items-start animate-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
        <Brain className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-white border-l-4 border-tech-blue rounded-r-xl p-4 shadow-sm">
          {cleanText && <Markdown text={cleanText} />}
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              selectedKey={message.selectedOption}
              onSelect={message.onSelect}
            />
          ))}
        </div>
        <span className="text-[10px] text-steel mt-1 block">{message.time}</span>
      </div>
    </div>
  );
}

function UserMessage({ message }) {
  return (
    <div className="flex gap-3 items-start justify-end animate-in">
      <div className="max-w-[80%]">
        <div className="bg-navy text-white rounded-xl px-4 py-3">
          <p className="text-sm">{message.text}</p>
        </div>
        <span className="text-[10px] text-steel mt-1 block text-right">{message.time}</span>
      </div>
    </div>
  );
}

export default function ConversationPanel({ tool, server, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [started, setStarted] = useState(false);
  const [formData, setFormData] = useState({});
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading]);

  const timeNow = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const sendToMcp = async (params, isFollowUp = false) => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const body = {
        server: server.id,
        tool: tool.id,
        params,
      };
      if (isFollowUp && sessionId) body.sessionId = sessionId;

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
      if (data.sessionId) setSessionId(data.sessionId);

      // Extract text content from MCP result
      const content = data.result?.content || [];
      const textBlocks = content.filter((b) => b.type === "text").map((b) => b.text).join("\n\n");
      const rawText = textBlocks || JSON.stringify(data.result, null, 2);

      return rawText;
    } catch (err) {
      return `Error: ${err.message}`;
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (e) => {
    e.preventDefault();
    setStarted(true);

    // Build params from form
    const cleanParams = {};
    for (const [k, v] of Object.entries(formData)) {
      if (v !== "" && v !== null && v !== undefined) cleanParams[k] = v;
    }

    // Add user message
    const promptField = tool.parameters.find((p) => p.type === "textarea") || tool.parameters[0];
    const userText = formData[promptField?.name] || JSON.stringify(cleanParams);
    setMessages([{ role: "user", text: userText, time: timeNow() }]);

    const rawResponse = await sendToMcp(cleanParams, false);
    addAgentMessage(rawResponse);
  };

  const addAgentMessage = (rawText) => {
    setMessages((prev) => [
      ...prev,
      { role: "agent", raw: rawText, time: timeNow(), selectedOption: null, onSelect: null },
    ]);
    // Attach onSelect handler for the latest message
    setTimeout(() => {
      setMessages((prev) => {
        const updated = [...prev];
        const lastAgent = updated.length - 1;
        if (updated[lastAgent]?.role === "agent") {
          updated[lastAgent] = {
            ...updated[lastAgent],
            onSelect: (key, label) => handleOptionSelect(lastAgent, key, label),
          };
        }
        return updated;
      });
    }, 0);
  };

  const handleOptionSelect = async (msgIndex, key, label) => {
    // Mark selection
    setMessages((prev) => {
      const updated = [...prev];
      updated[msgIndex] = { ...updated[msgIndex], selectedOption: key };
      return updated;
    });

    // Add user message
    setMessages((prev) => [...prev, { role: "user", text: `${key}: ${label}`, time: timeNow() }]);

    // Send follow-up
    const rawResponse = await sendToMcp({ response: key }, true);
    addAgentMessage(rawResponse);
  };

  const handleFreeInput = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text, time: timeNow() }]);
    const rawResponse = await sendToMcp({ response: text }, true);
    addAgentMessage(rawResponse);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-steel hover:text-navy transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-navy">{tool.name}</h2>
              <p className="text-[10px] text-steel">{tool.role || server.name}</p>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-steel hover:text-navy transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {!started ? (
          /* Initial form */
          <div className="max-w-lg mx-auto mt-8">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-sm text-steel mb-4">{tool.description}</p>
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
                        className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-navy placeholder-gray-400 focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/20 transition-all resize-none"
                        required={param.required}
                      />
                    ) : param.type === "select" ? (
                      <select
                        value={formData[param.name] || param.default || ""}
                        onChange={(e) => setFormData((f) => ({ ...f, [param.name]: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-navy focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/20 transition-all"
                      >
                        {param.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formData[param.name] || ""}
                        onChange={(e) => setFormData((f) => ({ ...f, [param.name]: e.target.value }))}
                        placeholder={param.placeholder}
                        className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-navy placeholder-gray-400 focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/20 transition-all"
                        required={param.required}
                      />
                    )}
                  </div>
                ))}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-navy rounded-lg shadow-md hover:bg-navy/90 transition-all"
                >
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
              <div className="flex gap-3 items-start animate-in">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border-l-4 border-tech-blue rounded-r-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-tech-blue animate-spin" />
                    <span className="text-sm text-steel">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input bar (visible after conversation starts) */}
      {started && (
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleFreeInput} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a response..."
              disabled={loading}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-navy placeholder-gray-400 focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/20 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-navy text-white rounded-lg hover:bg-navy/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
