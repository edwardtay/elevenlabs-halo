# Halo

A voice companion for when you need someone to talk to.

**Live:** [halo.leverlabs.workers.dev](https://halo.leverlabs.workers.dev)

## What it does

Halo is a voice AI companion that listens, talks, and remembers. Not a therapist, not a chatbot — just a warm friend who's always available.

- **Voice conversation** — tap "Start talking" and have a natural phone call
- **Persistent memory** — Halo remembers what you share and brings it up later
- **Mood tracking** — see your emotional journey over time
- **Wake word** — say "Hello Halo" to start hands-free

## Why

1 in 3 adults report serious loneliness. Friends are asleep at 2 AM. Therapy is $200/hour. Sometimes you just need a warm voice.

## Architecture

```
Browser (React + Vite)
  └── ElevenLabs SDK (ConversationProvider)
        └── Custom LLM → Cloudflare Worker
              ├── AI Gateway → Workers AI (Llama 3.3 70B)
              ├── Vectorize (memory storage + retrieval)
              └── Durable Object (mood tracking, streak, history)
```

**Cloudflare:** Workers, Workers AI, AI Gateway, Durable Objects, Vectorize, Static Assets

**ElevenLabs:** Conversational AI SDK, Text-to-Speech API

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars  # add your keys
npm run dev:client               # Vite on :5173
npm run dev:worker               # Wrangler on :8787
```

## Deploy

```bash
npm run deploy                   # vite build && wrangler deploy
```

## Tech

- React 19 + Vite + Tailwind CSS v4
- Cloudflare Workers + Durable Objects + Workers AI + Vectorize
- ElevenLabs Conversational AI + TTS
- TypeScript throughout
