import React from "react";
import {
  ArrowRight,
  Sparkles,
  Layers,
  Video,
  Image as ImageIcon,
  Music,
  Mic,
  AudioLines,
  Film,
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
import { useInView, useCountUp } from "../lib/hooks";

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

/* ---------- Data ---------- */
const servers = [
  { id: "genmedia-veo", name: "Video Generation", icon: Video, desc: "Cinematic video from text or images with Veo 3.1. Native audio, multiple aspect ratios, and reference-guided styles.", meta: "6 tools · Veo 3.1" },
  { id: "genmedia-nanobanana", name: "Image Generation", icon: ImageIcon, desc: "Generate and edit images with Nano Banana. 13 aspect ratios, multi-image compositing, and precise style control.", meta: "1 tool · Gemini 3" },
  { id: "genmedia-lyria", name: "Music Composition", icon: Music, desc: "Compose original tracks with Lyria. Specify genre, mood, instruments, tempo, and duration.", meta: "1 tool · Lyria" },
  { id: "genmedia-chirp3", name: "Voice / TTS", icon: Mic, desc: "Premium voiceovers with Chirp3 HD. 30+ HD voices, custom IPA pronunciation, expressive control.", meta: "2 tools · Chirp3 HD" },
  { id: "genmedia-gemini", name: "Expressive Speech", icon: AudioLines, desc: "Gemini-native TTS — prompt HOW the speech should sound: tone, accent, emotion, and pacing.", meta: "3 tools · Gemini TTS" },
  { id: "genmedia-avtool", name: "AV Compositing", icon: Film, desc: "The glue layer. Combine Veo video with Lyria music and voiceover into final deliverables via ffmpeg.", meta: "9 tools · ffmpeg" },
];

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

      {/* Servers */}
      <section className="section section-alt" id="servers">
        <Reveal className="section-head">
          <span className="eyebrow">The Platform</span>
          <h2 className="section-title">Seven servers. One interface.</h2>
          <p className="section-subtitle">
            Each server is purpose-built for a specific domain, delivering
            specialized AI capabilities through a unified, secure API.
          </p>
        </Reveal>
        <Reveal className="cards-grid reveal-stagger" stagger>
          {servers.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="server-card" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="server-card-icon">
                  <Icon size={22} />
                </div>
                <h3>{s.name}</h3>
                <p>{s.desc}</p>
                <div className="card-meta">
                  <span className="card-id">{s.id}</span>
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
    </div>
  );
}
