# Halo — A Friend Who's Always Here

Voice companion app for loneliness and mental wellness. Users tap "Start talking" and have a natural voice conversation with Halo — a warm, emotionally intelligent AI friend.

**Live:** https://halo.leverlabs.workers.dev
**Hackathon:** https://hacks.elevenlabs.io/hackathons/1 (ElevenLabs x Cloudflare Hack #2)
**Deadline:** April 2, 2026 5:00 PM UTC

## Tech Stack

**Cloudflare (6 products):**
- **Workers** — API layer, Custom LLM endpoint, serves frontend
- **Workers AI** — Llama 3.3 70B for conversation responses
- **AI Gateway** — Caches/analytics on LLM calls
- **Durable Objects** — HaloAgent stores conversation history, mood tracking, streak
- **Vectorize** — RAG for emotional context injected into responses
- **Static Assets** — Serves the React frontend

**ElevenLabs (2 APIs):**
- **Conversational AI** — Voice widget for real-time voice conversation
- **Text-to-Speech** — Daily affirmation audio generation (Jessica voice)

**Frontend:** React 19 + Vite + Tailwind CSS v4 + TypeScript

## Architecture

```
Browser (React SPA)
  ├── ElevenLabs Conversational AI Widget (voice)
  │     └── Custom LLM → Cloudflare Worker
  │           ├── AI Gateway → Workers AI (Llama 3.3 70B)
  │           ├── Vectorize (RAG emotional context)
  │           └── Durable Object (log conversation + mood)
  ├── /api/affirmation → ElevenLabs TTS API → audio
  ├── /api/stats → Durable Object → mood stats
  └── /api/history → Durable Object → conversation list
```

## Key Files

- `src/worker/index.ts` — Worker entry, API router (8 endpoints)
- `src/worker/agent.ts` — HaloAgent Durable Object (conversations, moods, streaks)
- `src/worker/llm.ts` — Custom LLM endpoint with Vectorize RAG + system prompt
- `src/worker/affirmation.ts` — ElevenLabs TTS affirmation generator
- `src/worker/tools.ts` — Vectorize lookup + session tools
- `src/worker/seed.ts` — Seeds Vectorize with 12 knowledge entries
- `src/client/App.tsx` — Main app (landing page, widget integration, wake word)
- `src/client/Dashboard.tsx` — Mood tracking dashboard

## ElevenLabs Agent

- **Agent ID:** `agent_5201kmthvevqex5s4qps314ds4s3`
- **LLM:** `custom-llm` → `https://halo.leverlabs.workers.dev/api/llm/chat`
- **Voice:** Jessica (cgSgspJ2msm6clMCkdW9) — warm, playful
- **Settings:** Patient turn-taking, 0.35 stability (expressive), 30 min max calls, temp 0.8

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/llm/chat` | Custom LLM for ElevenLabs (OpenAI format) |
| POST | `/api/affirmation` | Generate spoken affirmation via TTS |
| GET | `/api/history` | Conversation history from DO |
| GET | `/api/stats` | Mood stats + streak from DO |
| POST | `/api/tools/lookup` | Vectorize RAG search |
| POST | `/api/tools/session` | Update session state in DO |
| POST | `/api/signed-url` | ElevenLabs signed WebSocket URL |
| POST | `/api/seed` | Seed Vectorize knowledge base |

## Secrets (in .dev.vars, NOT committed)

- `CF_ACCOUNT_ID` — Cloudflare account
- `CF_API_TOKEN` — Cloudflare API token (Workers AI access)
- `AI_GATEWAY_ID` — `curiosity-gateway`
- `ELEVENLABS_API_KEY` — ElevenLabs Creator plan
- `ELEVENLABS_AGENT_ID` — `agent_5201kmthvevqex5s4qps314ds4s3`

## Deploy

```bash
npm run build    # Vite builds to dist/
npm run deploy   # vite build && wrangler deploy
```

## Hackathon Submission

- Record a viral-style demo video
- Post on X, LinkedIn, Instagram, TikTok with @CloudflareDev @elevenlabsio #ElevenHacks
- Each platform = +50 pts
