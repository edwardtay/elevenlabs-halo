# Curiosity — Voice-First AI Learning Companion

**Hackathon:** ElevenLabs x Cloudflare Hack #2
**Deadline:** April 2, 2026 5:00 PM
**Prize Pool:** $131,980

## Overview

Curiosity is a voice-first AI learning companion for curious people. Users open a minimal web page, tap a mic button, and start talking. The AI adapts to 4 conversational modes detected from natural language — no buttons or menus required.

## Modes

| Mode | Trigger Phrases | Behavior |
|---|---|---|
| **Tutor** (default) | "teach me about X", "how does X work" | Explains concepts, adapts to level, checks understanding |
| **Debate** | "debate me on X", "challenge me" | Takes opposing position, Socratic questioning, respectful pushback |
| **ELI5** | "explain like I'm 5", "simplify" | Analogies, everyday language, zero jargon, short sentences |
| **Lecture** | "give me a lesson on X", "deep dive" | Structured: intro → 3-4 key points → summary |

Mode detection happens in the system prompt. The AI announces switches naturally ("Sure, let me break that down simply...").

## Architecture

```
Browser (React SPA via Workers Static Assets)
  ├── @elevenlabs/react SDK → WebRTC → ElevenLabs Conversational AI
  └── REST calls → Cloudflare Worker API
                      │
ElevenLabs Conversational AI
  ├── Custom LLM → Worker → AI Gateway → Workers AI (Llama 3.3 70B)
  └── Server Tools → Worker → Vectorize (RAG) / Durable Objects (state)

Cloudflare Worker (single entry point)
  ├── POST /api/llm/chat       → AI Gateway → Workers AI
  ├── POST /api/tools/lookup    → Workers AI (embeddings) → Vectorize
  ├── POST /api/tools/session   → Durable Objects
  ├── GET  /api/visual          → Browser Rendering
  ├── POST /api/signed-url      → signed URL generation
  └── GET  /*                   → Workers Static Assets (React SPA)
```

## Cloudflare Products Used (7)

1. **Workers** — API layer, serves frontend, handles all routing
2. **Workers Static Assets** — serves the React SPA
3. **Workers AI** — Llama 3.3 70B as Custom LLM for ElevenLabs + BGE embeddings for Vectorize
4. **AI Gateway** — proxies Workers AI calls for caching, analytics, rate limiting
5. **Durable Objects** — per-session state with SQLite (conversation history, mode, topic, knowledge level)
6. **Vectorize** — semantic search over curated knowledge base + cached good answers
7. **Browser Rendering** — fetches and screenshots relevant diagrams/visuals for the companion panel

## ElevenLabs Integration

- **Conversational AI** as the voice orchestrator (ASR → LLM → TTS pipeline)
- **Custom LLM** pointing to our Cloudflare Worker endpoint (OpenAI-compatible chat completions)
- **Server tools** registered on the agent: `lookup_context` (Vectorize RAG) and `track_session` (Durable Objects)
- **WebRTC** connection from browser via `@elevenlabs/react` SDK
- **Private agent** with signed URL authentication

### System Prompt

The agent uses a single mode-aware system prompt:

- Detects mode from user intent (trigger phrases listed above)
- Injects session context (current mode, topic, knowledge level 1-5) from Durable Objects
- Keeps responses concise for voice (30-60 seconds of speech max)
- Calls `lookup_context` tool when more context is needed
- Calls `track_session` tool when mode or topic changes

### Voice

Warm, clear, engaging voice selected from ElevenLabs voice library.

## API Routes

### POST /api/llm/chat
Custom LLM endpoint for ElevenLabs. Receives OpenAI-format chat completion requests.
- Loads session context from Durable Object
- Injects mode-aware system prompt + session context + RAG context
- Streams response through AI Gateway → Workers AI (Llama 3.3 70B)
- Returns SSE stream in OpenAI chat completions format

### POST /api/tools/lookup
Server tool called by ElevenLabs agent for topic knowledge.
- Embeds the query using Workers AI (BGE base)
- Queries Vectorize for top-5 relevant chunks
- Returns context string to the agent

### POST /api/tools/session
Server tool called by ElevenLabs agent to update session state.
- Updates Durable Object with: current mode, topic, knowledge level
- Knowledge level (1-5) adjusts based on user responses

### GET /api/visual?topic=X
Fetches a visual companion for the current topic.
- Constructs a Wikipedia URL from the topic (e.g. `en.wikipedia.org/wiki/Black_hole`)
- Falls back to a simple search if no direct Wikipedia match
- Uses Browser Rendering to navigate and screenshot the first diagram/image section
- Returns as base64 PNG
- Client requests this when topic changes (debounced, not every message)

### POST /api/signed-url
Generates an ElevenLabs signed URL for private agent access.
- Called once when the client connects
- Returns a signed WebSocket URL

## Frontend

Minimal voice-first UI with 3 elements:

1. **Visual companion panel** — shows Browser Rendering screenshots. Fades in/out. Hidden when no visual.
2. **Voice orb** — animated audio visualizer (canvas/CSS) responding to speech. Centerpiece of the UI.
3. **Status bar** — current mode + topic. Updates automatically from conversation.

No text input. No chat log. No settings menu.

**Tech:** React + Vite + Tailwind CSS. `@elevenlabs/react` for voice. Canvas animation for the orb.

## Project Structure

```
elevenlabs-cloudflare/
├── src/
│   ├── worker/
│   │   ├── index.ts          # Worker entry — route handler
│   │   ├── llm.ts            # Custom LLM endpoint
│   │   ├── visual.ts         # Browser Rendering logic
│   │   ├── tools.ts          # Server tool handlers
│   │   ├── auth.ts           # Signed URL generation
│   │   └── session.ts        # Durable Object (SessionDO)
│   └── client/
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── VoiceOrb.tsx
│       │   ├── VisualPanel.tsx
│       │   └── StatusBar.tsx
│       └── hooks/
│           └── useVoice.ts
├── wrangler.toml
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .dev.vars
```

## Durable Object: SessionDO

One instance per conversation, keyed by session ID.

**SQLite schema:**
- `messages` table: role, content, timestamp
- `session` table: mode, topic, knowledge_level (1-5), updated_at

Knowledge level adjusts:
- User asks to simplify → level down
- User asks to go deeper → level up
- Resets to 3 on new topic

## Vectorize Knowledge Base

- Pre-seeded with 10-20 curated topic entries (popular science, history, philosophy)
- Embedding model: `@cf/baai/bge-base-en-v1.5` (768 dimensions)
- As conversations happen, good AI-generated explanations can be embedded and stored for future retrieval
- Metadata: topic, difficulty_level, mode, source

## Scope

### In (MVP)
- Voice conversation with all 4 modes
- Mode detection via system prompt
- Custom LLM through Workers AI + AI Gateway
- Visual companion via Browser Rendering
- Session state in Durable Objects
- Vectorize with seed knowledge base
- Animated voice orb frontend
- Deployed to Cloudflare Workers

### Out
- User accounts / auth
- Persistent cross-session memory
- Mobile-optimized UI
- Custom voice cloning
- Large-scale knowledge base ingestion
- Analytics dashboard

## Timeline

| Day | Focus |
|---|---|
| 1-2 | Scaffold project, ElevenLabs agent working with voice, Custom LLM wired to Workers AI |
| 3 | Durable Objects session state, Vectorize RAG pipeline, server tools |
| 4 | Browser Rendering visual companion, AI Gateway integration |
| 5 | Frontend polish — voice orb animation, visual panel, transitions |
| 6 | Record demo video, social media posts, bug fixes |
