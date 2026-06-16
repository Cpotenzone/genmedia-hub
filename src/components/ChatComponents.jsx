import React, { useState } from "react";
import { Check, Brain } from "lucide-react";
import { parseQuestions, extractThinking, stripSpecialBlocks } from "../lib/parsers";
import { formatTime } from "../lib/dateUtils";

// Simple markdown renderer
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

export function Markdown({ text }) {
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
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      elements.push(<pre key={i} className="text-xs bg-[#1E293B] text-gray-200 rounded-lg p-3 my-2 overflow-x-auto font-mono">{codeLines.join("\n")}</pre>);
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-sm text-steel leading-relaxed">{renderInline(line)}</p>);
    }
    i++;
  }
  return <div className="space-y-0.5">{elements}</div>;
}

export function ThinkingBlock({ content }) {
  return (
    <div className="mb-3 rounded-xl border-l-[3px] border-l-gray-200 bg-[#F9FAFB] pl-4 pr-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">💭 Thinking</p>
      <div className="text-sm leading-relaxed [&_p]:!text-[#6B7280] [&_li]:!text-[#6B7280]">
        <Markdown text={content} />
      </div>
    </div>
  );
}

export function QuestionCard({ question, selectedKey, onSubmit }) {
  const [selected, setSelected] = useState(null);
  const isLocked = !!selectedKey;
  const activeKey = isLocked ? selectedKey : selected;

  return (
    <div className="mt-3 bg-white rounded-xl p-4 border border-gray-200 hover:border-tech-blue/30 transition-all duration-200">
      {question.title && <h4 className="text-sm font-bold text-navy mb-1">{question.title}</h4>}
      {question.text && <p className="text-sm text-steel mb-3">{question.text}</p>}
      <div className="space-y-2">
        {question.options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => !isLocked && setSelected(opt.key)}
            disabled={isLocked}
            aria-label={`Option ${opt.key}: ${opt.label}`}
            className={`w-full text-left p-3 rounded-xl border transition-all duration-200
              ${activeKey === opt.key
                ? "border-tech-blue bg-blue-50/80 shadow-sm ring-2 ring-tech-blue/20"
                : isLocked
                  ? "border-gray-100 bg-white opacity-50 cursor-not-allowed"
                  : "border-gray-200 bg-white hover:border-tech-blue/40 hover:shadow-sm cursor-pointer hover:scale-[1.01]"
              }`}
          >
            <div className="flex items-start gap-3">
              <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200
                ${activeKey === opt.key ? "bg-tech-blue text-white" : "bg-gray-100 text-navy"}`}>
                {isLocked && activeKey === opt.key ? <Check className="w-4 h-4" /> : opt.key}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-navy">{opt.label}</p>
                  {opt.recommended && (
                    <span className="text-[9px] font-bold uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md">Recommended</span>
                  )}
                </div>
                {opt.description && <p className="text-xs text-steel mt-0.5">{opt.description}</p>}
                {opt.pros?.length > 0 && <div className="mt-1.5 space-y-0.5">{opt.pros.map((p, i) => <p key={i} className="text-xs text-emerald-700">✅ {p}</p>)}</div>}
                {opt.cons?.length > 0 && <div className="mt-1 space-y-0.5">{opt.cons.map((c, i) => <p key={i} className="text-xs text-red-600">❌ {c}</p>)}</div>}
              </div>
            </div>
          </button>
        ))}
      </div>
      {!isLocked && (
        <button
          onClick={() => selected && onSubmit && onSubmit(selected)}
          disabled={!selected}
          className="mt-3 w-full px-4 py-2.5 text-sm font-semibold text-white bg-navy rounded-xl hover:bg-navy/90 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      )}
    </div>
  );
}

export function AgentMessage({ message }) {
  const raw = message.raw || message.text || "";
  const questions = parseQuestions(raw);
  const thinkingBlocks = extractThinking(raw);
  const cleanText = stripSpecialBlocks(raw);

  return (
    <div className="flex gap-3 items-start animate-fadeInUp">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-200">
        <Brain className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0 max-w-[85%]">
        <div className="bg-white border-l-[3px] border-l-tech-blue rounded-r-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          {thinkingBlocks.map((tb, i) => <ThinkingBlock key={i} content={tb} />)}
          {cleanText && <Markdown text={cleanText} />}
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} selectedKey={message.selectedOption} onSubmit={(key) => message.onSelect && message.onSelect(key)} />
          ))}
        </div>
        <span className="text-[10px] text-gray-400 mt-1 block">{message.time}</span>
      </div>
    </div>
  );
}

export function UserMessage({ message }) {
  return (
    <div className="flex gap-3 items-start justify-end animate-fadeInUp">
      <div className="max-w-[80%]">
        <div className="bg-navy text-white rounded-xl px-4 py-3 shadow-sm">
          <p className="text-sm leading-relaxed">{message.text}</p>
        </div>
        <span className="text-[10px] text-gray-400 mt-1 block text-right">{message.time}</span>
      </div>
    </div>
  );
}
