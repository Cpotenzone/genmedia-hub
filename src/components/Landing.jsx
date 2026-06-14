import React, { useState } from "react";
import {
  ArrowRight,
  ArrowDown,
  Sparkles,
  Layers,
  Brain,
  Lightbulb,
  Crown,
  Network,
  Palette,
  Terminal,
  Code2,
  ShieldCheck,
  Bug,
  Workflow,
  FileText,
  BookOpen,
  History,
  Github,
  ExternalLink,
} from "lucide-react";
import { mcpServers } from "../lib/mcpServers";
import { useInView, useCountUp } from "../lib/hooks";
import ExportConfig from "./ExportConfig";

/* ---------- Reveal wrapper ---------- */
function Reveal({ children, className = "", stagger = false, as: Tag = "div", style }) {
  const [ref, inView] = useInView();
  const base = stagger ? "reveal-stagger" : "reveal";
  return (
    <Tag ref={ref} className={`${base} ${inView ? "in-view" : ""} ${className}`} style={style}>
      {children}
    </Tag>
  );
}

/* ---------- Data ----------
   All 7 servers are sourced dynamically from src/lib/mcpServers.js so the
   landing grid always stays in sync with the dashboard. */
const featuredServer = mcpServers.find((s) => s.featured) || mcpServers[0];
const FeaturedIcon = featuredServer.icon;
const otherServers = mcpServers.filter((s) => s !== featuredServer);
const toolCount = (s) => `${s.tools.length} ${s.tools.length === 1 ? "tool" : "tools"}`;

const agents = [
  { icon: Lightbulb, role: "Product Advisor", name: "Office Hours", tagline: "YC-style forcing questions that expose real demand and the narrowest wedge." },
  { icon: Crown, role: "CEO / Founder", name: "CEO Review", tagline: "Finds the 10-star product. Expands ambition or ruthlessly cuts scope." },
  { icon: Network, role: "Eng Manager", name: "Engineering Review", tagline: "Forces hidden assumptions open. Traces data flow and rollback paths." },
  { icon: Palette, role: "Senior Designer", name: "Design Review", tagline: "Rates every dimension 0–10 and detects AI slop before it ships." },
  { icon: Terminal, role: "DX Lead", name: "DX Review", tagline: "Optimizes Time-To-Hello-World and maps every friction point." },
  { icon: Code2, role: "Staff Engineer", name: "Code Review", tagline: "Catches the bugs that pass CI but blow up in production." },
  { icon: ShieldCheck, role: "Security Officer", name: "Security Audit", tagline: "OWASP Top 10 + STRIDE with an 8/10 confidence gate. Zero noise." },
  { icon: Bug, role: "Debugger", name: "Investigate", tagline: "Root-cause first. The Iron Law: no fixes without investigation." },
  { icon: Workflow, role: "Orchestrator", name: "Auto Plan", tagline: "CEO → Design → Engineering pipeline. Surfaces only taste calls." },
  { icon: FileText, role: "Docs Author", name: "Generate Docs", tagline: "Fills documentation gaps using the Diátaxis framework." },
  { icon: BookOpen, role: "Technical Writer", name: "Release Docs", tagline: "Syncs all docs to what just shipped. Catches stale READMEs." },
  { icon: History, role: "Eng Manager", name: "Retrospective", tagline: "Per-person sprint breakdowns and three concrete action items." },
];

const stats = [
  { value: 7, suffix: "", label: "MCP Servers", tone: "" },
  { value: 34, suffix: "", label: "AI Tools", tone: "blue" },
  { value: 12, suffix: "", label: "Expert Agents", tone: "indigo" },
  { value: "∞", suffix: "", label: "Possibilities", tone: "green" },
];

/* ---------- Stat with count-up ---------- */
function StatCard({ stat, active }) {
  const display = useCountUp(stat.value, active);
  return (
    <div className="stat">
      <span className={`stat-value ${stat.tone}`}>
        {display}
        {stat.suffix}
      </span>
      <span className="stat-label">{stat.label}</span>
    </div>
  );
}

function StatsRow() {
  const [ref, inView] = useInView({ threshold: 0.4 });
  return (
    <div className="stats" ref={ref}>
      {stats.map((s) => (
        <StatCard key={s.label} stat={s} active={inView} />
      ))}
    </div>
  );
}

export default function Landing({ onSignIn }) {
  const [exportOpen, setExportOpen] = useState(false);
  return (
    <div className="view-fade">
      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <span className="hero-badge">
            <span className="dot" />
            All 7 servers operational · Powered by CriticalAsset
          </span>
          <h1>
            The AI Media Creation Studio for{" "}
            <span className="grad">teams who ship</span>
          </h1>
          <p>
            Seven specialized MCP servers — video, image, music, speech, AV
            compositing, and a full senior AI product team — all through one
            secure, unified interface.
          </p>
          <div className="hero-actions">
            <button className="btn btn-light" onClick={onSignIn}>
              Get Started Free <ArrowRight size={18} />
            </button>
            <a className="btn btn-ghost" href="#agents">
              <Brain size={18} /> Meet the 12 agents
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="section section-tight">
        <Reveal>
          <StatsRow />
        </Reveal>
      </section>

      {/* Servers — all 7, sourced dynamically from mcpServers.js */}
      <section className="section section-alt" id="servers">
        <Reveal className="section-head">
          <span className="eyebrow">The Platform</span>
          <h2 className="section-title">Seven servers. One interface.</h2>
          <p className="section-subtitle">
            Each server is purpose-built for a specific domain, delivering
            specialized AI capabilities through a unified, secure API.
          </p>
        </Reveal>

        {/* Featured: gstack-mcp */}
        <Reveal>
          <a href="#agents" className="featured-card">
            <div className="featured-card-main">
              <span className="featured-badge"><Sparkles size={13} /> Featured</span>
              <div className="featured-head">
                <div className="featured-icon"><FeaturedIcon size={26} /></div>
                <div>
                  <h3>{featuredServer.name}</h3>
                  <span className="card-id">{featuredServer.id}</span>
                </div>
              </div>
              <p>{featuredServer.description}</p>
              <span className="featured-link">
                Meet all {featuredServer.tools.length} agents <ArrowDown size={15} />
              </span>
            </div>
            <div className="featured-stat">
              <span className="featured-stat-num">{featuredServer.tools.length}</span>
              <span className="featured-stat-label">Expert Agents</span>
            </div>
          </a>
        </Reveal>

        {/* The other 6 servers */}
        <Reveal className="cards-grid reveal-stagger" stagger>
          {otherServers.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="server-card" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="server-card-icon">
                  <Icon size={22} />
                </div>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <div className="card-meta">
                  <span className="card-id">{s.id}</span>
                  <span className="card-toolcount">{toolCount(s)}</span>
                </div>
              </div>
            );
          })}
        </Reveal>
      </section>

      {/* gstack Agent Showcase */}
      <section className="showcase" id="agents">
        <Reveal className="section-head">
          <span className="showcase-badge">
            <Sparkles size={14} /> FEATURED · gstack
          </span>
          <h2 className="section-title">A senior AI product team, on demand</h2>
          <p className="section-subtitle">
            Twelve specialized agents — each with a 50–100K-byte system prompt
            encoding real cognitive frameworks and decision principles. Powered
            by Gemini 2.5 Pro.
          </p>
        </Reveal>
        <Reveal className="agent-grid reveal-stagger" stagger>
          {agents.map((a, i) => {
            const Icon = a.icon;
            return (
              <div key={a.name} className="agent-card" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="agent-icon">
                  <Icon size={20} />
                </div>
                <div>
                  <span className="agent-role">{a.role}</span>
                  <h3 className="agent-name">{a.name}</h3>
                  <p className="agent-tagline">{a.tagline}</p>
                </div>
              </div>
            );
          })}
        </Reveal>
        <Reveal>
          <p className="showcase-footnote">
            <strong>12 agents</strong> · <strong>Gemini 2.5 Pro</strong> · the
            same review gauntlet that polished this very product.
          </p>
        </Reveal>
      </section>

      {/* How it works */}
      <section className="section" id="how">
        <Reveal className="section-head">
          <span className="eyebrow">Workflow</span>
          <h2 className="section-title">From sign-in to shipped in three steps</h2>
          <p className="section-subtitle">
            No setup, no API keys to wrangle. Authenticate and start creating.
          </p>
        </Reveal>
        <Reveal className="steps reveal-stagger" stagger>
          <div className="step">
            <div className="step-num">1</div>
            <h4>Sign in securely</h4>
            <p>Authenticate with Google in one click. Access is restricted to authorized domains.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h4>Pick a tool</h4>
            <p>Browse 7 servers and 34 tools — from AI code review to cinematic video generation.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h4>Execute & ship</h4>
            <p>Configure parameters, hit execute, and results stream back in seconds.</p>
          </div>
        </Reveal>
      </section>

      {/* Install Locally */}
      <section className="section section-alt" id="install">
        <Reveal className="install-band">
          <div className="install-copy">
            <span className="eyebrow">Bring it to your machine</span>
            <h2 className="section-title">Install locally in one click</h2>
            <p className="section-subtitle" style={{ margin: "0.5rem 0 0" }}>
              Export the standard MCP config for Claude Desktop, Kiro, or
              Antigravity (Gemini) — copy the JSON or download the file, drop it
              in, and you're running all 7 servers locally.
            </p>
          </div>
          <button className="btn btn-gradient" onClick={() => setExportOpen(true)}>
            <Terminal size={18} /> Export MCP Config
          </button>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="cta">
        <Reveal className="cta-inner">
          <h2>Ready to build?</h2>
          <p>
            Sign in with your authorized Google account to access all 7 AI
            servers, 34 tools, and the full 12-agent product team.
          </p>
          <button className="btn btn-light" onClick={onSignIn}>
            Sign in with Google <ArrowRight size={18} />
          </button>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand-block">
              <span className="nav-brand">
                <span className="nav-brand-mark"><Layers size={17} /></span>
                GenMedia Hub
              </span>
              <p className="footer-tagline">
                A unified, secure interface for generative media MCP servers and
                a senior AI engineering team.
              </p>
              <span className="powered-by">
                <Sparkles size={14} className="spark" />
                Powered by CriticalAsset
              </span>
            </div>

            <div className="footer-col">
              <h5>Product</h5>
              <a href="#servers">Servers</a>
              <a href="#agents">AI Agents</a>
              <a href="#how">How it works</a>
            </div>

            <div className="footer-col">
              <h5>Resources</h5>
              <a href="https://github.com/Cpotenzone/genmedia-hub#readme" target="_blank" rel="noreferrer">
                Documentation <ExternalLink size={12} />
              </a>
              <a href="https://github.com/Cpotenzone/genmedia-hub" target="_blank" rel="noreferrer">
                <Github size={13} /> GitHub
              </a>
              <a href="https://github.com/Cpotenzone/genmedia-hub/blob/main/docs" target="_blank" rel="noreferrer">
                Architecture <ExternalLink size={12} />
              </a>
            </div>

            <div className="footer-col">
              <h5>Company</h5>
              <a href="https://insuremep.com" target="_blank" rel="noreferrer">
                InsureMEP <ExternalLink size={12} />
              </a>
              <a href="https://insuremep.com/privacy" target="_blank" rel="noreferrer">Privacy</a>
              <a href="https://insuremep.com/terms" target="_blank" rel="noreferrer">Terms</a>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2026 CriticalAsset / InsureMEP. All rights reserved.</span>
            <span>Built with Firebase, React &amp; the Model Context Protocol.</span>
          </div>
        </div>
      </footer>

      <ExportConfig open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
