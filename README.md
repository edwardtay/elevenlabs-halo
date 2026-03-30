# Halo

Voice companion app. Talk to an AI friend that remembers your conversations.

**Live:** [halo.leverlabs.workers.dev](https://halo.leverlabs.workers.dev)

## Features

- Voice conversation via ElevenLabs Conversational AI SDK
- Persistent memory — Halo remembers facts from past conversations via Vectorize RAG
- Memory extraction — Llama 3.1 8B extracts normalized facts, stored as embeddings
- Mood tracking dashboard with streak counter
- Wake word activation ("Hello Halo")
- Spoken affirmation via ElevenLabs TTS API

## Architecture

```
Browser (React)
  └── ElevenLabs SDK (ConversationProvider)
        └── Custom LLM → Cloudflare Worker
              ├── AI Gateway → Workers AI (Llama 3.3 70B) — responses
              ├── Vectorize — memory retrieval (semantic search)
              ├── Workers AI (Llama 3.1 8B) — memory extraction (background)
              ├── Vectorize — memory storage (background)
              └── Durable Object — mood tracking, streak, history (background)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/llm/chat` | Custom LLM endpoint (OpenAI-compatible, streaming SSE) |
| POST | `/api/affirmation` | Generate spoken affirmation (ElevenLabs TTS, returns audio/mpeg) |
| GET | `/api/stats` | Mood stats, streak, mood breakdown |
| GET | `/api/history` | Recent check-in history |
| GET | `/api/health` | Health check |
| POST | `/api/seed` | Seed Vectorize knowledge base |

## Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, TypeScript
- **Backend:** Cloudflare Workers, Workers AI, AI Gateway, Durable Objects, Vectorize, Static Assets
- **Voice:** ElevenLabs Conversational AI SDK, Text-to-Speech API
- **LLM:** Llama 3.3 70B (responses), Llama 3.1 8B (memory extraction)
- **Memory:** Vectorize (BGE base v1.5 embeddings, semantic retrieval with 0.3 threshold)

## Setup

```bash
npm install
cp .dev.vars.example .dev.vars
```

Required secrets in `.dev.vars`:
```
CF_ACCOUNT_ID=
CF_API_TOKEN=
AI_GATEWAY_ID=
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
```

## Development

```bash
npm run dev:client    # Vite dev server (:5173)
npm run dev:worker    # Wrangler dev server (:8787)
```

## Deploy

```bash
npm run deploy        # vite build && wrangler deploy
```

## Project Structure

```
src/
├── client/
│   ├── App.tsx           # Landing page, voice controls, wake word
│   ├── Dashboard.tsx     # Mood tracking dashboard
│   ├── main.tsx          # React entry with ConversationProvider
│   └── index.css         # Tailwind + theme variables
└── worker/
    ├── index.ts          # Worker router (chat completion path matching, health check)
    ├── llm.ts            # Custom LLM — system prompt, Vectorize RAG, memory extraction
    ├── agent.ts          # HaloAgent Durable Object (mood detection, streak calc)
    ├── affirmation.ts    # ElevenLabs TTS affirmation generator
    ├── seed.ts           # Vectorize knowledge base seeder
    └── types.ts          # Env interface
```
