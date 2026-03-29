# Halo

Voice companion app. Talk to an AI friend that remembers your conversations.

**Live:** [halo.leverlabs.workers.dev](https://halo.leverlabs.workers.dev)

## Features

- Voice conversation via ElevenLabs Conversational AI
- Persistent memory across sessions (Vectorize)
- Mood tracking and streak dashboard (Durable Objects)
- Wake word activation ("Hello Halo")

## Stack

- **Frontend:** React, Vite, Tailwind CSS, TypeScript
- **Backend:** Cloudflare Workers, Workers AI, AI Gateway, Durable Objects, Vectorize
- **Voice:** ElevenLabs Conversational AI SDK, Text-to-Speech API

## Setup

```bash
npm install
cp .dev.vars.example .dev.vars  # add your keys
npm run dev:client
npm run dev:worker
```

## Deploy

```bash
npm run deploy
```
