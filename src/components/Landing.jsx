import React from "react";
import { ArrowRight } from "lucide-react";

const servers = [
  { id: "gstack-mcp", name: "Google Workspace AI Agents", desc: "12 senior-level AI agents for product strategy, code review, security audits, architecture, debugging, and documentation. Powered by Gemini 2.5 Pro." },
  { id: "genmedia-veo", name: "Video Generation", desc: "Cinematic video from text or images with Veo 3.1. Native audio, multiple aspect ratios, reference-guided styles." },
  { id: "genmedia-nanobanana", name: "Image Generation", desc: "Generate and edit images with Nano Banana. 13 aspect ratios, multi-image compositing, style control." },
  { id: "genmedia-lyria", name: "Music Composition", desc: "Compose original tracks with Lyria. Specify genre, mood, instruments, tempo, and duration." },
  { id: "genmedia-chirp3", name: "Voice / TTS", desc: "Premium voiceovers with Chirp3 HD and Gemini TTS. 30+ voices, expressive style control." },
  { id: "genmedia-gemini", name: "AI Chat", desc: "Direct Gemini 2.5 Pro conversational AI. Multi-turn chat, reasoning, and structured output." },
  { id: "genmedia-avtool", name: "Audio/Video Tools", desc: "Full AV production pipeline. Combine video, music, and voiceover into final deliverables." },
];

export default function Landing({ onSignIn }) {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <h1>AI Media Creation Studio</h1>
        <p>Seven specialized MCP servers. Video, image, music, speech, AV compositing, and a full AI product team — all through one secure interface.</p>
        <button className="hero-btn" onClick={onSignIn}>
          Get Started Free <ArrowRight size={18} />
        </button>
      </section>

      {/* Stats */}
      <section className="section">
        <div className="stats">
          <div><div className="stat-value green">7</div><div className="stat-label">MCP Servers</div></div>
          <div><div className="stat-value orange">34</div><div className="stat-label">AI Tools</div></div>
          <div><div className="stat-value purple">12</div><div className="stat-label">Expert Agents</div></div>
          <div><div className="stat-value green">∞</div><div className="stat-label">Possibilities</div></div>
        </div>
      </section>

      {/* Servers */}
      <section className="section section-alt">
        <h2 className="section-title">Seven Servers. One Interface.</h2>
        <p className="section-subtitle">Each server is purpose-built for a specific domain, delivering specialized AI capabilities through a unified, secure API.</p>
        <div className="cards-grid">
          {servers.map((s) => (
            <div key={s.id} className="server-card">
              <span className="card-id">{s.id}</span>
              <h3>{s.name}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="section">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">From sign-in to generated content in three simple steps.</p>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h4>Sign In</h4>
            <p>Authenticate with Google in one click. Restricted to authorized domains.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h4>Pick a Tool</h4>
            <p>Browse 7 servers and 34 tools — from AI code review to cinematic video generation.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h4>Execute</h4>
            <p>Configure parameters, hit execute. Results stream back in seconds.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <h2>Ready to Build?</h2>
        <p>Sign in with your authorized Google account to access all 7 AI servers and 34 tools.</p>
        <button className="hero-btn" onClick={onSignIn}>
          Sign in with Google <ArrowRight size={18} />
        </button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <span className="footer-brand">GenMedia Hub</span>
          <div className="footer-links">
            <a href="#">Documentation</a>
            <a href="#">Architecture</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
          <span className="footer-copy">© 2026 CriticalAsset / InsureMEP. Built with Firebase & MCP.</span>
        </div>
      </footer>
    </>
  );
}
