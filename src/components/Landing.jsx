import React from "react";
import {
  Brain,
  Video,
  Image,
  Music,
  Mic,
  AudioLines,
  Film,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  Check,
  Server,
  Lock,
  Layers,
  ChevronRight,
  Sparkles,
  Code,
  Eye,
  Search,
  FileText,
  Users,
} from "lucide-react";
import { mcpServers } from "../lib/mcpServers";

function FeaturedCard({ server }) {
  const Icon = server.icon;
  return (
    <div className="group relative col-span-1 md:col-span-2 lg:col-span-3 p-8 rounded-2xl bg-gradient-to-br from-violet-500/[0.08] to-purple-600/[0.04] border border-violet-500/20 hover:border-violet-400/30 transition-all duration-300">
      {/* Featured badge */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/25">
        <Zap className="w-3 h-3 text-violet-400" />
        <span className="text-xs font-medium text-violet-300">Flagship</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Icon and description */}
        <div className="lg:w-1/3">
          <div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${server.color} flex items-center justify-center mb-5 shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform duration-300`}
          >
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">{server.name}</h3>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            {server.description}
          </p>
          <div className="flex items-center gap-2 text-xs text-violet-300">
            <span className="px-2 py-0.5 rounded bg-violet-500/15 border border-violet-500/25">
              12 Agents
            </span>
            <span className="px-2 py-0.5 rounded bg-violet-500/15 border border-violet-500/25">
              Gemini 2.5 Pro
            </span>
            <span className="px-2 py-0.5 rounded bg-violet-500/15 border border-violet-500/25">
              50-100K prompts
            </span>
          </div>
        </div>

        {/* Right: Agent role grid */}
        <div className="lg:w-2/3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { icon: Search, role: "Product Advisor", tool: "Office Hours" },
              { icon: Eye, role: "CEO / Founder", tool: "CEO Review" },
              { icon: Server, role: "Eng Manager", tool: "Eng Review" },
              { icon: Sparkles, role: "Sr. Designer", tool: "Design Review" },
              { icon: Code, role: "DX Lead", tool: "DX Review" },
              { icon: Code, role: "Staff Engineer", tool: "Code Review" },
              { icon: Shield, role: "CSO", tool: "Security Audit" },
              { icon: Search, role: "Debugger", tool: "Investigate" },
              { icon: Layers, role: "Orchestrator", tool: "Auto Plan" },
              { icon: FileText, role: "Doc Author", tool: "Generate Docs" },
              { icon: FileText, role: "Tech Writer", tool: "Release Docs" },
              { icon: Users, role: "Retro Lead", tool: "Retrospective" },
            ].map((agent, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/20 hover:bg-violet-500/[0.03] transition-all duration-200"
              >
                <agent.icon className="w-4 h-4 text-violet-400 mb-1" />
                <span className="text-xs font-medium text-white">
                  {agent.tool}
                </span>
                <span className="text-[10px] text-gray-500">{agent.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ server }) {
  const Icon = server.icon;
  return (
    <div className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-300">
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${server.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{server.name}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">
        {server.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {server.tools.slice(0, 5).map((tool) => (
          <span
            key={tool.id}
            className="text-xs px-2 py-1 rounded-md bg-white/[0.05] text-gray-500 border border-white/[0.06]"
          >
            {tool.name}
          </span>
        ))}
        {server.tools.length > 5 && (
          <span className="text-xs px-2 py-1 rounded-md bg-white/[0.05] text-gray-500 border border-white/[0.06]">
            +{server.tools.length - 5} more
          </span>
        )}
      </div>
    </div>
  );
}

function StepCard({ number, title, description, icon: Icon }) {
  return (
    <div className="relative flex flex-col items-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-purple-400" />
      </div>
      <div className="absolute top-6 left-0 w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
        <span className="text-xs font-bold text-purple-300">{number}</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

export default function Landing({ onSignIn }) {
  const featuredServer = mcpServers.find((s) => s.featured);
  const otherServers = mcpServers.filter((s) => !s.featured);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[80px]" />
        </div>

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-8">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-sm text-purple-300 font-medium">
              7 MCP Servers · 34 Tools · Gemini 2.5 Pro + Veo 3.1 + Lyria
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
            AI Media Creation
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 text-transparent bg-clip-text">
              Studio
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Seven specialized MCP servers. Twelve AI engineering agents. Video, image, music, speech, 
            AV compositing, and a full AI product team — all exposed through one secure, authenticated interface.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onSignIn}
              className="flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white
                         bg-gradient-to-r from-purple-600 to-blue-600
                         hover:from-purple-500 hover:to-blue-500
                         rounded-xl transition-all duration-300
                         shadow-2xl shadow-purple-500/25 hover:shadow-purple-500/40
                         hover:-translate-y-0.5"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#features"
              className="flex items-center gap-2 px-8 py-3.5 text-base font-medium text-gray-300
                         border border-white/10 hover:border-white/20
                         rounded-xl transition-all duration-200 hover:bg-white/5"
            >
              Explore Features
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-4 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">7</div>
              <div className="text-xs text-gray-500 mt-1">MCP Servers</div>
            </div>
            <div className="text-center border-x border-white/10">
              <div className="text-2xl font-bold text-white">34</div>
              <div className="text-xs text-gray-500 mt-1">AI Tools</div>
            </div>
            <div className="text-center border-r border-white/10">
              <div className="text-2xl font-bold text-white">12</div>
              <div className="text-xs text-gray-500 mt-1">Expert Agents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">∞</div>
              <div className="text-xs text-gray-500 mt-1">Possibilities</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Seven Servers. One Interface.
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Each MCP server is purpose-built for a specific domain,
              delivering specialized AI capabilities through a unified, secure API.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Featured gstack-mcp card spanning full width */}
            {featuredServer && <FeaturedCard server={featuredServer} />}

            {/* Other 6 servers */}
            {otherServers.map((server) => (
              <FeatureCard key={server.id} server={server} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-24 px-6">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-gray-400">
              From sign-in to generated content in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Sign In"
              description="Authenticate with Google in one click. Restricted to @criticalasset.com and @insuremep.com domains."
              icon={Lock}
            />
            <StepCard
              number="2"
              title="Pick a Tool"
              description="Browse 7 servers and 34 tools. From AI code review to cinematic video generation."
              icon={Layers}
            />
            <StepCard
              number="3"
              title="Execute"
              description="Configure parameters, hit execute. Results stream back — video, audio, images, or structured text."
              icon={Sparkles}
            />
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              What You Can Do
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Real workflows spanning AI engineering, media generation, and content production.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: Brain,
                title: "AI-powered code & architecture review",
                desc: "Get staff-level code review, security audits, and architecture feedback before you ship",
              },
              {
                icon: Video,
                title: "Cinematic video from text or images",
                desc: "Generate 4-8s videos with Veo 3.1 — native audio, multiple aspect ratios, reference-guided styles",
              },
              {
                icon: Image,
                title: "Product shots & marketing visuals",
                desc: "Generate and edit images with Nano Banana — 13 aspect ratios, multi-image compositing",
              },
              {
                icon: Music,
                title: "Original music for any project",
                desc: "Compose tracks with Lyria — specify genre, mood, instruments, tempo, and duration",
              },
              {
                icon: Mic,
                title: "Premium voiceovers & narration",
                desc: "Chirp3 HD for precision, Gemini TTS for expressive style control — 30+ voices",
              },
              {
                icon: Film,
                title: "Full AV production pipeline",
                desc: "Combine Veo video + Lyria music + Chirp3 voiceover into final deliverables with avtool",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 p-5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Secure by Default
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Domain-restricted Google Sign-In, token-validated Cloud Functions, and private Cloud Run backends.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <div className="text-center p-4">
                <Shield className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-white mb-1">
                  Google OAuth
                </h4>
                <p className="text-xs text-gray-500">
                  Domain-locked to your organization
                </p>
              </div>
              <div className="text-center p-4">
                <Lock className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-white mb-1">
                  Token Validation
                </h4>
                <p className="text-xs text-gray-500">
                  Firebase ID tokens verified on every request
                </p>
              </div>
              <div className="text-center p-4">
                <Server className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-white mb-1">
                  Cloud Functions
                </h4>
                <p className="text-xs text-gray-500">
                  Serverless proxy with audit logging
                </p>
              </div>
              <div className="text-center p-4">
                <Globe className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-white mb-1">
                  Cloud Run
                </h4>
                <p className="text-xs text-gray-500">
                  Private backends, no public access
                </p>
              </div>
            </div>

            <div className="mt-8 p-4 rounded-xl bg-black/30 border border-white/[0.04] font-mono text-xs text-gray-500 overflow-x-auto">
              <span className="text-purple-400">Browser</span>
              <span className="text-gray-600"> → </span>
              <span className="text-blue-400">Firebase Auth</span>
              <span className="text-gray-600"> → </span>
              <span className="text-cyan-400">Cloud Function (verify token)</span>
              <span className="text-gray-600"> → </span>
              <span className="text-green-400">Cloud Run MCP Server</span>
              <span className="text-gray-600"> → </span>
              <span className="text-amber-400">Vertex AI / GCS</span>
              <span className="text-gray-600"> → </span>
              <span className="text-purple-400">Response</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6">
        <div className="absolute inset-0">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Build?
          </h2>
          <p className="text-gray-400 mb-8">
            Sign in with your @criticalasset.com or @insuremep.com Google account 
            to access all 7 AI servers and 34 tools. Runs on your own GCP project.
          </p>
          <button
            onClick={onSignIn}
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white
                       bg-gradient-to-r from-purple-600 to-blue-600
                       hover:from-purple-500 hover:to-blue-500
                       rounded-xl transition-all duration-300
                       shadow-2xl shadow-purple-500/25 hover:shadow-purple-500/40
                       hover:-translate-y-0.5"
          >
            Sign in with Google
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">GenMedia Hub</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-300 transition-colors">
              Documentation
            </a>
            <a href="#" className="hover:text-gray-300 transition-colors">
              Architecture
            </a>
            <a href="#" className="hover:text-gray-300 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-gray-300 transition-colors">
              Terms
            </a>
          </div>

          <p className="text-xs text-gray-600">
            © 2026 CriticalAsset / InsureMEP. Built with Firebase & MCP.
          </p>
        </div>
      </footer>
    </div>
  );
}
