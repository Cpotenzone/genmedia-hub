import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, X, Send, Loader2, Check, Brain } from "lucide-react";
import { auth } from "../lib/firebase";

// Parse <mcp_conductor_AskUserQuestion> XML format
function parseXMLQuestion(text) {
  const regex = /<mcp_conductor_AskUserQuestion>([\s\S]*?)<\/mcp_conductor_AskUserQuestion>/g;
  const questions = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const block = match[1];
    const qMatch = block.match(/<question>([\s\S]*?)<\/question>/);
    const idMatch = block.match(/<question_id>([\s\S]*?)<\/question_id>/);
    if (!qMatch) continue;
    const questionText = qMatch[1].trim();
    const questionId = idMatch ? idMatch[1].trim() : "q-" + questions.length;
    // Parse options: lines starting with A), B), C), etc.
    const lines = questionText.split("\n");
    const options = [];
    let title = "";
    let description = [];
    let currentOption = null;
    for (const line of lines) {
      const optMatch = line.match(/^([A-Z])\)\s+(.+)/);
      if (optMatch) {
        if (currentOption) options.push(currentOption);
        const label = optMatch[2].trim();
        const recommended = /\(recommended\)/i.test(label);
        currentOption = {
          key: optMatch[1],
          label: label.replace(/\s*\(recommended\)\s*/i, ""),
          recommended,
          pros: [],
          cons: [],
        };
      } else if (currentOption && line.trim().startsWith("✅")) {
        currentOption.pros.push(line.trim().replace(/^✅\s*/, ""));
      } else if (currentOption && line.trim().startsWith("❌")) {
        currentOption.cons.push(line.trim().replace(/^❌\s*/, ""));
      } else if (!currentOption) {
        // Before first option — part of title/description
        if (!title && line.trim() && !line.trim().startsWith("✅") && !line.trim().startsWith("❌")) {
          title = line.trim();
        } else if (line.trim()) {
          description.push(line.trim());
        }
      }
    }
    if (currentOption) options.push(currentOption);
    questions.push({ id: questionId, title, text: description.join("\n"), options });
  }
  return questions;
}

// Parse Python-style AskUserQuestion(...) format (fallback — no gstack-qid tag)
function parsePythonQuestion(text) {
  const questions = [];
  // Find AskUserQuestion( and then balance parentheses
  const starts = [...text.matchAll(/AskUserQuestion\(/g)];
  for (const s of starts) {
    let depth = 1;
    let i = s.index + s[0].length;
    while (i < text.length && depth > 0) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')') depth--;
      i++;
    }
    const inner = text.slice(s.index + s[0].length, i - 1);
    const idMatch = inner.match(/question_id\s*=\s*['"](.*?)['"]/);
    const titleMatch = inner.match(/question_title\s*=\s*['"]([\s\S]*?)['"]/);
    const textMatch = inner.match(/question_text\s*=\s*["']([\s\S]*?)["']\s*,?\s*(?:options|$|\))/);
    const id = idMatch ? idMatch[1] : "q-" + questions.length;
    const title = titleMatch ? titleMatch[1] : "";
    const qText = textMatch ? textMatch[1] : "";
    const options = [];
    const optRegex = /\{\s*['"]?key['"]?\s*:\s*['"](.*?)['"],\s*['"]?label['"]?\s*:\s*['"](.*?)['"](?:,\s*['"]?description['"]?\s*:\s*['"]([\s\S]*?)['"])?\s*\}/g;
    let optMatch;
    while ((optMatch = optRegex.exec(inner)) !== null) {
      options.push({ key: optMatch[1], label: optMatch[2], description: optMatch[3] || "", pros: [], cons: [], recommended: false });
    }
    if (options.length > 0 || title) {
      questions.push({ id, title, text: qText, options });
    }
  }
  return questions;
}

// Parse <gstack-qid:...> followed by AskUserQuestion(...) — handles optional <tool_code> wrapper
function parseGstackQuestion(text) {
  const questions = [];
  // Match the gstack-qid tag, then find AskUserQuestion(...) allowing for <tool_code> wrapper
  const regex = /<gstack-qid:(.*?)>([\s\S]*?)(?:<\/tool_code>|\n\n|$)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const id = match[1].trim();
    const block = match[2];
    // Find AskUserQuestion call within the block
    const askIdx = block.indexOf("AskUserQuestion(");
    if (askIdx === -1) continue;
    const inner = block.slice(askIdx);
    const titleMatch = inner.match(/question_title\s*=\s*['"]([\s\S]*?)['"]/);
    const textMatch = inner.match(/question_text\s*=\s*["']([\s\S]*?)["']\s*,?\s*(?:options|$|\))/);
    const title = titleMatch ? titleMatch[1] : "";
    const qText = textMatch ? textMatch[1] : "";
    const options = [];
    const optRegex = /\{\s*['"]?key['"]?\s*:\s*['"](.*?)['"],\s*['"]?label['"]?\s*:\s*['"](.*?)['"](?:,\s*['"]?description['"]?\s*:\s*['"]([\s\S]*?)['"])?\s*\}/g;
    let optMatch;
    while ((optMatch = optRegex.exec(inner)) !== null) {
      options.push({ key: optMatch[1], label: optMatch[2], description: optMatch[3] || "", pros: [], cons: [], recommended: false });
    }
    questions.push({ id, title, text: qText, options });
  }
  return questions;
}

// Combined question parser
function parseQuestions(text) {
  let questions = parseXMLQuestion(text);
  if (questions.length === 0) questions = parseGstackQuestion(text);
  if (questions.length === 0) questions = parsePythonQuestion(text);
  return questions;
}

// Extract <thinking> blocks
function extractThinking(text) {
  const blocks = [];
  const regex = /<thinking>([\s\S]*?)<\/thinking>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

// Strip question blocks, thinking blocks, and stray XML tags from display text
function stripSpecialBlocks(text) {
  let clean = text;
  clean = clean.replace(/<mcp_conductor_AskUserQuestion>[\s\S]*?<\/mcp_conductor_AskUserQuestion>/g, "");
  clean = clean.replace(/<thinking>[\s\S]*?<\/thinking>/g, "");
  clean = clean.replace(/<gstack-qid:.*?>[\s\S]*?(?:<\/tool_code>|AskUserQuestion\([\s\S]*?\))/g, "");
  clean = clean.replace(/<tool_code>[\s\S]*?<\/tool_code>/g, "");
  clean = clean.replace(/AskUserQuestion\([\s\S]*?\)\s*/g, "");
  // Strip remaining XML-like tags that aren't meaningful content
  clean = clean.replace(/<\/?[a-zA-Z_][a-zA-Z0-9_-]*(?:\s[^>]*)?\s*>/g, "");
  return clean.trim();
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

// Thinking block component (always visible, inline)
function ThinkingBlock({ content }) {
  return (
    <div className="mb-3 rounded-lg border-l-[3px] border-l-gray-200 bg-[#F9FAFB] pl-4 pr-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">💭 Thinking</p>
      <div className="text-[0.875rem] leading-relaxed [&_p]:!text-[#6B7280] [&_li]:!text-[#6B7280] [&_h1]:!text-[#4B5563] [&_h2]:!text-[#4B5563] [&_h3]:!text-[#4B5563] [&_strong]:!text-[#4B5563]">
        <Markdown text={content} />
      </div>
    </div>
  );
}

// Interactive question card with options
function QuestionCard({ question, selectedKey, onSubmit }) {
  const [selected, setSelected] = useState(null);
  const isLocked = !!selectedKey;

  const handleSubmit = () => {
    if (selected && onSubmit) onSubmit(selected);
  };

  const activeKey = isLocked ? selectedKey : selected;

  return (
    <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
      {question.title && <h4 className="text-sm font-bold text-navy mb-1">{question.title}</h4>}
      {question.text && <p className="text-sm text-steel mb-3">{question.text}</p>}
      <div className="space-y-2">
        {question.options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => !isLocked && setSelected(opt.key)}
            disabled={isLocked}
            className={`w-full text-left p-3 rounded-lg border transition-all duration-200
              ${activeKey === opt.key
                ? "border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-200"
                : isLocked
                  ? "border-gray-200 bg-white opacity-50 cursor-not-allowed"
                  : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm cursor-pointer"
              }`}
          >
            <div className="flex items-start gap-3">
              <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
                ${activeKey === opt.key ? "bg-blue-500 text-white" : "bg-gray-100 text-navy"}`}>
                {isLocked && activeKey === opt.key ? <Check className="w-4 h-4" /> : opt.key}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-navy">{opt.label}</p>
                  {opt.recommended && (
                    <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Recommended</span>
                  )}
                </div>
                {opt.description && <p className="text-xs text-steel mt-0.5">{opt.description}</p>}
                {opt.pros && opt.pros.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {opt.pros.map((p, i) => (
                      <p key={i} className="text-xs text-green-700">✅ {p}</p>
                    ))}
                  </div>
                )}
                {opt.cons && opt.cons.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {opt.cons.map((c, i) => (
                      <p key={i} className="text-xs text-red-600">❌ {c}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      {!isLocked && (
        <button
          onClick={handleSubmit}
          disabled={!selected}
          className="mt-3 w-full px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      )}
    </div>
  );
}

function AgentMessage({ message }) {
  const raw = message.raw || message.text || "";
  const questions = parseQuestions(raw);
  const thinkingBlocks = extractThinking(raw);
  const cleanText = stripSpecialBlocks(raw);

  return (
    <div className="flex gap-3 items-start animate-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
        <Brain className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-white border-l-4 border-tech-blue rounded-r-xl p-4 shadow-sm">
          {thinkingBlocks.map((tb, i) => <ThinkingBlock key={i} content={tb} />)}
          {cleanText && <Markdown text={cleanText} />}
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              selectedKey={message.selectedOption}
              onSubmit={(key) => message.onSelect && message.onSelect(key)}
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

export default function ConversationPanel({ tool, server, onClose, resumeSession }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(resumeSession?.id || null);
  const [started, setStarted] = useState(!!resumeSession);
  const [formData, setFormData] = useState({});
  const scrollRef = useRef(null);

  // Load previous messages if resuming a session
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
          const loaded = (data.messages || []).map(m => ({
            role: m.role,
            text: m.content,
            raw: m.role === 'agent' ? m.content : undefined,
            time: m.timestamp?.toDate ? new Date(m.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            selectedOption: null,
            onSelect: null,
          }));
          setMessages(loaded);
        }
      } catch (e) {
        console.warn('Failed to load session messages:', e);
      }
    })();
  }, [resumeSession]);

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
      const body = { server: server.id, tool: tool.id, params };
      if (sessionId) body.sessionId = sessionId;
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
      const content = data.result?.content || [];
      const textBlocks = content.filter((b) => b.type === "text").map((b) => b.text).join("\n\n");
      return textBlocks || JSON.stringify(data.result, null, 2);
    } catch (err) {
      return `Error: ${err.message}`;
    } finally {
      setLoading(false);
    }
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
    const rawResponse = await sendToMcp(cleanParams, false);
    addAgentMessage(rawResponse);
  };

  const addAgentMessage = (rawText) => {
    setMessages((prev) => [
      ...prev,
      { role: "agent", raw: rawText, time: timeNow(), selectedOption: null, onSelect: null },
    ]);
    setTimeout(() => {
      setMessages((prev) => {
        const updated = [...prev];
        const lastAgent = updated.length - 1;
        if (updated[lastAgent]?.role === "agent") {
          updated[lastAgent] = {
            ...updated[lastAgent],
            onSelect: (key) => handleOptionSelect(lastAgent, key),
          };
        }
        return updated;
      });
    }, 0);
  };

  const handleOptionSelect = async (msgIndex, key) => {
    setMessages((prev) => {
      const updated = [...prev];
      updated[msgIndex] = { ...updated[msgIndex], selectedOption: key };
      return updated;
    });
    setMessages((prev) => [...prev, { role: "user", text: key, time: timeNow() }]);
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
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-4 h-4 text-tech-blue animate-spin" />
                    <span className="text-sm font-medium text-navy">Agent is thinking...</span>
                  </div>
                  <div className="rounded-lg border-l-[3px] border-l-gray-200 bg-[#F9FAFB] pl-4 pr-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">💭 Processing</p>
                    <p className="text-xs text-[#6B7280] animate-pulse">Analyzing your request and formulating a response...</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input bar */}
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
