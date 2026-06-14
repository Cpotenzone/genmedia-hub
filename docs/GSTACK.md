# gstack-mcp: The AI Engineering Team in Your IDE

## What It Is

gstack-mcp is a suite of 12 AI agents, each embodying a specific senior-level role, available directly inside your AI assistant (Antigravity, Claude, Kiro) as MCP tools. You invoke them with natural language. They return structured, opinionated, role-specific output — the kind of thinking you'd otherwise wait days for from a senior colleague.

It was built on a simple premise: **if AI makes expert judgment available on demand, why are we still writing code without it?** Most AI assistants are generalists. gstack gives your AI a set of expert personas with encoded decision principles, specific output formats, and deliberate constraints.

The agents run on **Gemini 2.5 Pro** via Vertex AI on the `casey-genmedia` Google Cloud project. Each agent is backed by a substantial system prompt (50,000–100,000 bytes each) encoding not just role instructions but cognitive frameworks, failure modes, output formats, voice standards, and escalation protocols.

---

## The 12 Agents

### 1. `gstack_office_hours` — Product Strategy Interrogation

**Role:** YC-style product advisor

**What it does:** You describe what you're building. It pushes back. Hard. Returns six forcing questions that expose demand reality, status quo assumptions, the desperate specificity of who actually needs this, the narrowest wedge to start with, real-world observations, and future-fit. It challenges your premise before you write a line of code.

This is the agent to run *first* — before planning, before architecture. It's designed to reframe the problem, not validate it.

**Two modes:**

- **Startup mode:** Demand-reality focused. Forces you to articulate who is in physical pain right now, what they currently do, and why your solution matters more than their existing workaround.
- **Builder mode:** Design-thinking focused. For side projects, hackathons, and open source — explores the design space before committing.

The output is a structured design doc saved locally (`~/.gstack/projects/`) that feeds subsequent reviews.

**What it saves you from:** Starting a feature nobody needs. Solving the wrong problem. Building a solution looking for a problem.

**When to invoke it:** Any time you're describing a new idea. Any time you catch yourself saying "I'm not sure if this is the right thing to build."

---

### 2. `gstack_ceo_review` — Strategic Plan Review

**Role:** CEO / Founder

**What it does:** Reviews any plan, feature proposal, or design doc through a strategic lens. The goal: find the 10-star product. It can expand your ambition, sharpen your focus, or cut what's unnecessary — you choose the mode.

**Four modes:**

| Mode | Posture | What It Does |
| --- | --- | --- |
| `expansion` | Dream big | Asks "what would make this 10x better for 2x the effort?" Pushes scope up. Every expansion is presented as a decision you opt into. |
| `selective_expansion` | Hold baseline, cherry-pick | Makes current scope bulletproof AND surfaces every expansion opportunity individually. Neutral posture — you decide each one. |
| `hold_scope` | Maximum rigor | Plan's scope is accepted. Catches every failure mode, edge case, observability gap, and error path. No silent reduction or expansion. |
| `reduction` | Surgeon | Finds the minimum viable version. Cuts everything that isn't the core outcome. Ruthless. |

**The 9 Prime Directives** encoded in this agent:

1. Zero silent failures — every failure must be visible
2. Every error has a name — no vague "handle errors"
3. Data flows have shadow paths — trace nil, empty, and upstream error cases
4. Interactions have edge cases — double-click, navigate-away, stale state
5. Observability is scope, not afterthought — dashboards and runbooks are deliverables
6. Diagrams are mandatory — ASCII art for every non-trivial flow
7. Everything deferred must be written down — TODOs.md or it doesn't exist
8. Optimize for 6 months from now, not today
9. Permission to say "scrap it and do this instead"

**Cognitive framework encoded:** Bezos one-way/two-way doors, Munger inversion reflex, Jobs subtraction default, Grove paranoid scanning, Altman willfulness and leverage obsession, Chesky founder-mode bias.

**What it produces:** A structured review report with section-by-section findings, expansion opportunities (as decisions), architectural concerns, and a recommended next action.

---

### 3. `gstack_eng_review` — Architecture Review

**Role:** Engineering Manager

**What it does:** Reviews a technical plan or architecture document. Its job is to force every hidden assumption into the open before you build. Locks in data flow, surface area, edge cases, and the test matrix.

Specifically looks for:

- Data flows without traced paths (nil input, empty input, upstream errors)
- Missing error names — catches "handle errors gracefully" as a defect
- Undiagrammed flows — every non-trivial flow gets ASCII art
- Untested edge cases — creates a test matrix
- Unaddressed rollback/partial-state scenarios for deployments
- Security and observability gaps
- Hidden coupling and premature abstraction

Also does a pre-review system audit — reads recent git history, TODOS.md, existing architecture docs, and recently touched files — before reviewing the plan.

**What it saves you from:** Discovering architectural problems mid-sprint. Shipping without knowing how to roll back. Building on a broken foundation.

---

### 4. `gstack_design_review` — Visual & UX Audit

**Role:** Senior Designer

**What it does:** Rates your design across each dimension on a 0–10 scale. For each dimension, it explains *what a 10 looks like* — not just what's wrong with yours. Flags AI slop specifically.

Design dimensions evaluated:

- Visual hierarchy (does the eye land in the right place?)
- Typography (pairing, scale, weight, readability)
- Color usage (palette coherence, contrast, meaning)
- Spacing and rhythm (consistent system vs arbitrary)
- Component patterns (does this feel native to the design system?)
- Information density (too much / too little for the context)
- Empty states and error states
- Mobile/responsive behavior
- Accessibility

**AI slop detection:** Explicitly trained to identify generated-looking output — rounded-corner everything, purple-gradient buttons, "modern SaaS" checkbox patterns, stock-photo energy.

**What it saves you from:** Shipping designs that look like they came from a template. Blind spots you've become immune to after staring at the same screen.

---

### 5. `gstack_devex_review` — Developer Experience Audit

**Role:** Developer Experience Lead

**What it does:** Reviews APIs, SDKs, CLIs, or any developer-facing tool. Its primary benchmark: **TTHW** — Time To Hello World. How long does it take a new developer to get their first working output?

**Three modes:**

| Mode | Focus |
| --- | --- |
| `dx_expansion` | Expand DX surface — new quickstarts, SDKs, integrations |
| `dx_polish` | Fix what exists — reduce friction, improve docs, clean up error messages |
| `dx_triage` | Emergency — find and fix the top 3 blockers right now |

**What it maps:**

- Developer personas (beginner, power user, enterprise integrator)
- TTHW benchmark vs comparable tools
- Friction points (authentication complexity, unclear first step, missing error context)
- The "magical moment" — when does the developer first feel the value?
- Documentation gaps (what's missing from the path from zero to productive)

**What it saves you from:** Shipping a technically correct API that nobody can figure out. Losing developers in the first 5 minutes.

---

### 6. `gstack_code_review` — Staff Engineer Code Review

**Role:** Staff Engineer

**What it does:** Reviews code diffs, file contents, or PR descriptions looking for bugs that pass CI but blow up in production. Does not review for style or formatting — that's what linters are for. Reviews for correctness, completeness, and failure modes.

Specifically hunts for:

- Race conditions and concurrency issues
- Nil/null dereferences on untested code paths
- Catch-all error handlers that swallow context
- Missing input validation on API boundaries
- State that can go stale
- External calls without timeouts
- Database queries that degrade at scale
- Secrets or credentials in code
- Tests that test the mock, not the behavior

Also checks completeness: "this PR changes X but doesn't update Y — is that intentional?"

**What it saves you from:** The bug that passes code review and gets caught by a customer at 2am.

---

### 7. `gstack_cso` — Security Audit

**Role:** Chief Security Officer

**What it does:** A structured security audit using OWASP Top 10 + STRIDE threat modeling. Zero-noise: only surfaces findings at 8/10+ confidence, independently verified.

**STRIDE threat model applied:**

- **S**poofing — can an attacker pretend to be someone else?
- **T**ampering — can data be modified in transit or at rest?
- **R**epudiation — can a user deny an action they took?
- **I**nformation Disclosure — can data leak to unauthorized parties?
- **D**enial of Service — can the system be made unavailable?
- **E**levation of Privilege — can a user gain more access than intended?

**OWASP Top 10 checks:** Injection, broken auth, sensitive data exposure, XXE, broken access control, security misconfiguration, XSS, insecure deserialization, known vulnerable components, insufficient logging.

**Confidence gate:** Every finding must be independently verified. If the agent can't reach 8/10 confidence, it doesn't surface the finding. This keeps the output signal-to-noise high.

**What it saves you from:** Shipping auth bypasses. Leaking PII. Being the "we were breached" story.

---

### 8. `gstack_investigate` — Root Cause Debugger

**Role:** Debugger

**Iron Law:** No fixes without investigation.

**What it does:** Systematic root-cause analysis for bugs, errors, and unexpected behavior. It does not guess. It traces data flow, forms a hypothesis, proposes a minimal test of that hypothesis, then either confirms or eliminates it.

**The protocol:**

1. Reproduce the problem (or establish a reproduction case)
2. Trace the data flow through the relevant code paths
3. Form a ranked list of hypotheses, most likely first
4. Test the top hypothesis with a minimal change
5. Confirm or eliminate, then repeat
6. After 3 failed fixes: **escalate** — state what was tried, what was ruled out, what is uncertain

**Escalation trigger:** If the same fix has been tried 3 times without success, the agent stops and produces a structured escalation report: STATUS, REASON, ATTEMPTED, RECOMMENDATION. It does not loop forever.

**What it saves you from:** Fixing symptoms instead of causes. The 4-hour debugging session that ends with "oh it was a caching issue."

---

### 9. `gstack_autoplan` — Full Review Pipeline

**Role:** Review Pipeline Orchestrator

**What it does:** Runs the full review pipeline automatically — CEO review, then design review, then engineering review — in sequence. Between reviews, it encodes the decision principles from each reviewer so the next reviewer builds on what the previous one surfaced.

You describe the feature. It runs all three reviews. It surfaces only the "taste decisions" — the ones where a human judgment call is genuinely required. Everything else is auto-decided using the encoded principles.

**When to use it:** Kicking off a new feature. Before a large refactor. Any time you want the full review without running three agents manually.

**What it produces:** A complete plan document with findings from all three review dimensions, open decisions surfaced for your input, and a recommended implementation order.

---

### 10. `gstack_document_generate` — Doc Author

**Role:** Documentation Author

**What it does:** Generates missing documentation from scratch using the **Diataxis framework** — the industry-standard documentation architecture that separates docs by purpose.

**Four Diataxis doc types:**

| Type | Purpose | Answers |
| --- | --- | --- |
| `reference` | Technical specification | "What is this?" |
| `howto` | Task-oriented guide | "How do I do X?" |
| `tutorial` | Learning-oriented walkthrough | "How do I learn this?" |
| `explanation` | Conceptual background | "Why does it work this way?" |

The agent reads the codebase first (using the provided code or context), then generates the appropriate doc type in the appropriate depth.

**What it saves you from:** The README that says "coming soon." The API with no examples. The feature that only the person who built it understands.

---

### 11. `gstack_document_release` — Release Doc Updater

**Role:** Technical Writer

**What it does:** Given a description of what was just shipped (diff summary, PR description, or feature list), it updates all project documentation to match. It finds stale content, updates it, and builds a Diataxis coverage map — a view of which doc types exist and which are missing.

**What it checks:**

- README accuracy vs. what was shipped
- ARCHITECTURE.md currency
- API reference completeness
- Changelog entries
- Migration guide requirements (for breaking changes)
- Missing doc types in the coverage map

**What it saves you from:** The README that's six months out of date. Documentation debt compounding every sprint.

---

### 12. `gstack_retro` — Sprint Retrospective

**Role:** Engineering Manager

**What it does:** Runs a structured retrospective for a time period — a week, a sprint, or a named date range. Team-aware: gives per-person breakdowns when multiple contributors are present.

**What it surfaces:**

- Shipping streaks (who shipped what, how often)
- Commit velocity and trends
- Test health (are tests improving or degrading over time?)
- Recurring blockers
- Growth opportunities (skills gaps, areas to push harder on)
- What went well / what didn't / what to change

**What it produces:** A structured retrospective document with per-person recognition, team-level patterns, and 3 concrete action items for next sprint.

---

## Design Principles

### The Voice

Every agent shares a voice standard encoded in each prompt:

> "GStack voice: Garry-shaped product and engineering judgment, compressed for runtime."

Rules:

- Lead with the point
- Name files, functions, line numbers, commands — be concrete
- Tie technical choices to what the real user sees, loses, or gains
- Sound like a builder talking to a builder, not a consultant presenting to a client
- No em dashes. No AI filler vocabulary (delve, crucial, robust, comprehensive, nuanced)

### The Completeness Principle — Boil the Ocean

Every agent is built around this principle: **AI makes completeness cheap, so the complete thing is the goal.**

When evaluating "full approach (150 LOC) vs shortcut (80 LOC)" — prefer the full approach. The 70-line delta costs seconds with AI assistance. Shipping shortcuts is a legacy habit from when human engineering time was the bottleneck.

This principle is encoded explicitly in every agent prompt.

### Confidence Gates

Agents are not trained to look busy. The CSO only surfaces findings at 8/10+ confidence. The investigator stops after 3 failed hypotheses and escalates rather than looping. The code reviewer flags completeness gaps rather than inventing issues.

### Decision Ownership

Every agent makes it explicit: recommendations are recommendations. The user decides. Each agent is explicit about where it's making a judgment call vs. where it's presenting facts, and consistently returns "the user has context I don't — domain knowledge, timing, relationships, taste."

---

## Technical Architecture

### How It Works

Each MCP tool call:

1. Receives user input (code, plan, description, etc.)
2. Loads the corresponding system prompt from the `prompts/` directory
3. Combines the system prompt + user input
4. Sends to Gemini 2.5 Pro on Vertex AI via the `google.golang.org/genai` SDK
5. Returns the response as a text MCP result

The system prompts are large (50,000–100,000 bytes each) and self-contained. They encode role identity, decision frameworks, output formats, escalation protocols, edge case handling, and quality gates.

### Deployment

| Mode | How | When to Use |
| --- | --- | --- |
| stdio (local) | `~/.local/bin/gstack-mcp` with `TRANSPORT=stdio` | All MCP client usage (Antigravity, Kiro, Claude) |
| HTTP (Cloud Run) | `https://gstack-mcp-128509221012.us-central1.run.app` | API access, testing, future integrations |

### Source

- **Repo:** `~/Dropbox/Documents/git/gstack-mcp/`
- **Main entrypoint:** main.go
- **Agent definitions:** agents/agents.go
- **System prompts:** `prompts/` directory (13 files, ~900KB total)
- **Gemini client:** gemini/client.go

---

## Recommended Workflow

The agents are designed to be used in a specific sequence for maximum value:

```
New idea or feature
       │
       ▼
gstack_office_hours          ← Validate the problem
       │
       ▼
gstack_ceo_review            ← Scope and strategy
       │
       ▼
gstack_eng_review            ← Architecture and edge cases
       │
(or run all three via)
       │
gstack_autoplan              ← Full pipeline, auto-decided
       │
       ▼
[Build]
       │
       ▼
gstack_code_review           ← Before merging
gstack_cso                   ← Security gate
gstack_design_review         ← If UI is involved
       │
       ▼
[Ship]
       │
       ▼
gstack_document_release      ← Update docs
gstack_retro                 ← End of sprint
```

At any point: `gstack_investigate` for bugs, `gstack_document_generate` for missing docs, `gstack_devex_review` for developer-facing APIs.

---

## Quick Reference

| Tool | When to Call |
| --- | --- |
| `gstack_office_hours` | "I have an idea" / "Is this worth building?" / before any plan |
| `gstack_ceo_review` | "Review this plan" / "Think bigger" / "Should we scope this differently?" |
| `gstack_eng_review` | "Review this architecture" / "What are we missing technically?" |
| `gstack_design_review` | "Review this UI" / "Does this design look good?" |
| `gstack_devex_review` | "Review our API/SDK/CLI DX" / "Why aren't developers getting started?" |
| `gstack_code_review` | "Review this diff" / "Find bugs in this code" |
| `gstack_cso` | "Security audit this" / "Is this safe to ship?" |
| `gstack_investigate` | "This is broken and I don't know why" |
| `gstack_autoplan` | "Plan this feature end to end" / "Run the full review" |
| `gstack_document_generate` | "Generate docs for this" / "We're missing a how-to" |
| `gstack_document_release` | "We just shipped X — update the docs" |
| `gstack_retro` | "Run our weekly/sprint retro" |

---

*Backend: Gemini 2.5 Pro on Vertex AI — `casey-genmedia` / `us-central1`*
*Source: `~/Dropbox/Documents/git/gstack-mcp/`*
*Last updated: June 2026*
