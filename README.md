# Halo

Voice companion app. Talk to an AI friend that remembers your conversations.

**Live:** [halo.leverlabs.workers.dev](https://halo.leverlabs.workers.dev)

## Features

- Voice conversation via ElevenLabs Conversational AI
- Persistent memory across sessions (Vectorize + RAG)
- Mood tracking and streak dashboard
- Wake word activation ("Hello Halo")
- Daily affirmation via ElevenLabs TTS

## Architecture

```
Browser (React)
  └── ElevenLabs SDK → Custom LLM → Cloudflare Worker
        ├── AI Gateway → Workers AI (Llama 3.3 70B)
        ├── Workers AI (Llama 3.1 8B) → memory extraction
        ├── Vectorize → memory storage + semantic retrieval
        └── Durable Object → mood tracking, streak, history
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/llm/chat` | Custom LLM (OpenAI-compatible, streaming) |
| POST | `/api/affirmation` | Generate spoken affirmation (TTS) |
| GET | `/api/stats` | Mood stats, streak, breakdown |
| GET | `/api/history` | Recent check-in history |
| POST | `/api/seed` | Seed Vectorize knowledge base |

## Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, TypeScript
- **Backend:** Cloudflare Workers, Workers AI, AI Gateway, Durable Objects, Vectorize, Static Assets
- **Voice:** ElevenLabs Conversational AI SDK, Text-to-Speech API
- **LLM:** Llama 3.3 70B (responses), Llama 3.1 8B (memory extraction)

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
    ├── index.ts          # Worker router
    ├── llm.ts            # Custom LLM with Vectorize RAG + memory
    ├── agent.ts          # HaloAgent Durable Object
    ├── affirmation.ts    # ElevenLabs TTS affirmation
    ├── seed.ts           # Vectorize knowledge seeder
    └── types.ts          # Env interface
```
