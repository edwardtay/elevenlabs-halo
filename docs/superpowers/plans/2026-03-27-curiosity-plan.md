# Curiosity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a voice-first AI learning companion using ElevenLabs Conversational AI + 7 Cloudflare products

**Architecture:** ElevenLabs Conversational AI handles the voice pipeline (ASR → LLM → TTS). A Cloudflare Worker serves as the Custom LLM endpoint (proxying to Workers AI via AI Gateway), provides server tools for RAG (Vectorize) and session state (Durable Objects), and generates visual companions via Browser Rendering. A minimal React SPA provides the UI.

**Tech Stack:** Cloudflare Workers, Durable Objects, Workers AI, AI Gateway, Vectorize, Browser Rendering, Workers Static Assets, ElevenLabs Conversational AI, React 19, Vite, Tailwind CSS v4, TypeScript

---

## File Structure

| File | Responsibility |
|---|---|
| `wrangler.toml` | Cloudflare config — bindings for AI, DO, Vectorize, Browser, Assets |
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript config |
| `vite.config.ts` | Vite build config for React client |
| `index.html` | HTML entry (Vite convention — at project root) |
| `.dev.vars` | Local secrets (not committed) |
| `src/worker/types.ts` | Env interface and shared types |
| `src/worker/index.ts` | Worker entry — API router, exports SessionDO |
| `src/worker/llm.ts` | Custom LLM endpoint — OpenAI-compatible streaming via AI Gateway |
| `src/worker/session.ts` | Durable Object — SQLite-backed session state |
| `src/worker/tools.ts` | Server tool handlers — lookup_context + track_session |
| `src/worker/visual.ts` | Browser Rendering — Wikipedia screenshot |
| `src/worker/auth.ts` | Signed URL generation for ElevenLabs |
| `src/worker/seed.ts` | One-time Vectorize seed endpoint |
| `src/client/main.tsx` | React entry |
| `src/client/index.css` | Tailwind v4 import |
| `src/client/App.tsx` | Main app — voice connection, layout, state |
| `src/client/components/VoiceOrb.tsx` | Animated canvas orb visualizer |
| `src/client/components/VisualPanel.tsx` | Browser Rendering screenshot display |
| `src/client/components/StatusBar.tsx` | Mode + topic indicator |
| `src/client/hooks/useVoice.ts` | ElevenLabs React SDK wrapper |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `wrangler.toml`, `index.html`, `.dev.vars`, `.gitignore`, `src/client/index.css`, `src/client/main.tsx`

- [ ] **Step 1: Initialize project and install dependencies**

```bash
cd /home/edwardtay/1-hackathon/elevenlabs-cloudflare
npm init -y
npm install react react-dom @elevenlabs/react
npm install -D typescript vite @vitejs/plugin-react tailwindcss @tailwindcss/vite wrangler @cloudflare/puppeteer @cloudflare/workers-types @types/react @types/react-dom
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["@cloudflare/workers-types", "@cloudflare/puppeteer"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
```

- [ ] **Step 4: Create wrangler.toml**

```toml
name = "curiosity"
main = "src/worker/index.ts"
compatibility_date = "2025-03-27"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"

[ai]
binding = "AI"

[browser]
binding = "BROWSER"

[[vectorize]]
binding = "VECTOR_INDEX"
index_name = "curiosity-knowledge"

[[durable_objects.bindings]]
name = "SESSION"
class_name = "SessionDO"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["SessionDO"]
```

- [ ] **Step 5: Create .dev.vars**

```
CF_ACCOUNT_ID=your-account-id
CF_API_TOKEN=your-api-token
AI_GATEWAY_ID=curiosity-gateway
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_AGENT_ID=your-agent-id
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
.dev.vars
.wrangler/
```

- [ ] **Step 7: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Curiosity</title>
</head>
<body class="bg-gray-950">
  <div id="root"></div>
  <script type="module" src="/src/client/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 8: Create src/client/index.css**

```css
@import 'tailwindcss';
```

- [ ] **Step 9: Create src/client/main.tsx**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 10: Create placeholder src/client/App.tsx**

```tsx
export function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <h1 className="text-2xl font-light tracking-widest text-gray-400">CURIOSITY</h1>
    </div>
  );
}
```

- [ ] **Step 11: Add scripts to package.json**

Update the `"scripts"` section:
```json
{
  "scripts": {
    "dev:client": "vite",
    "dev:worker": "wrangler dev",
    "build": "vite build",
    "deploy": "vite build && wrangler deploy",
    "seed": "wrangler dev --remote"
  }
}
```

- [ ] **Step 12: Verify client builds**

Run: `npx vite build`
Expected: Build succeeds, `dist/` directory created with `index.html` and JS bundle.

- [ ] **Step 13: Initialize git and commit**

```bash
git init
git add package.json tsconfig.json vite.config.ts wrangler.toml index.html .gitignore src/client/
git commit -m "scaffold: project setup with Vite, React, Tailwind, Wrangler"
```

---

### Task 2: Worker Types & Router

**Files:**
- Create: `src/worker/types.ts`, `src/worker/index.ts`

- [ ] **Step 1: Create src/worker/types.ts**

```typescript
export interface Env {
  AI: Ai;
  ASSETS: Fetcher;
  SESSION: DurableObjectNamespace;
  VECTOR_INDEX: VectorizeIndex;
  BROWSER: Fetcher;
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  AI_GATEWAY_ID: string;
  ELEVENLABS_API_KEY: string;
  ELEVENLABS_AGENT_ID: string;
}

export interface SessionState {
  mode: 'tutor' | 'debate' | 'eli5' | 'lecture';
  topic: string;
  knowledgeLevel: number;
}
```

- [ ] **Step 2: Create src/worker/index.ts with stub handlers**

```typescript
import type { Env } from './types';

export { SessionDO } from './session';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-id',
};

function corsResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/llm/chat' && request.method === 'POST') {
        const { handleLLMChat } = await import('./llm');
        return corsResponse(await handleLLMChat(request, env));
      }
      if (url.pathname === '/api/tools/lookup' && request.method === 'POST') {
        const { handleLookup } = await import('./tools');
        return corsResponse(await handleLookup(request, env));
      }
      if (url.pathname === '/api/tools/session' && request.method === 'POST') {
        const { handleSessionTool } = await import('./tools');
        return corsResponse(await handleSessionTool(request, env));
      }
      if (url.pathname === '/api/visual' && request.method === 'GET') {
        const { handleVisual } = await import('./visual');
        return corsResponse(await handleVisual(request, env));
      }
      if (url.pathname === '/api/signed-url' && request.method === 'POST') {
        const { handleSignedUrl } = await import('./auth');
        return corsResponse(await handleSignedUrl(request, env));
      }
      if (url.pathname === '/api/seed' && request.method === 'POST') {
        const { handleSeed } = await import('./seed');
        return corsResponse(await handleSeed(request, env));
      }

      return env.ASSETS.fetch(request);
    } catch (err) {
      return corsResponse(
        Response.json({ error: String(err) }, { status: 500 })
      );
    }
  },
};
```

- [ ] **Step 3: Create placeholder files so imports resolve**

Create empty placeholder files that will be implemented in subsequent tasks:

`src/worker/session.ts`:
```typescript
import { DurableObject } from 'cloudflare:workers';
import type { Env } from './types';

export class SessionDO extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    return Response.json({ placeholder: true });
  }
}
```

`src/worker/llm.ts`:
```typescript
import type { Env } from './types';
export async function handleLLMChat(request: Request, env: Env): Promise<Response> {
  return Response.json({ placeholder: true });
}
```

`src/worker/tools.ts`:
```typescript
import type { Env } from './types';
export async function handleLookup(request: Request, env: Env): Promise<Response> {
  return Response.json({ placeholder: true });
}
export async function handleSessionTool(request: Request, env: Env): Promise<Response> {
  return Response.json({ placeholder: true });
}
```

`src/worker/visual.ts`:
```typescript
import type { Env } from './types';
export async function handleVisual(request: Request, env: Env): Promise<Response> {
  return Response.json({ placeholder: true });
}
```

`src/worker/auth.ts`:
```typescript
import type { Env } from './types';
export async function handleSignedUrl(request: Request, env: Env): Promise<Response> {
  return Response.json({ placeholder: true });
}
```

`src/worker/seed.ts`:
```typescript
import type { Env } from './types';
export async function handleSeed(request: Request, env: Env): Promise<Response> {
  return Response.json({ placeholder: true });
}
```

- [ ] **Step 4: Verify worker compiles**

Run: `npx wrangler dev --test-scheduled`
Expected: Worker starts on `localhost:8787`. Visit `http://localhost:8787` — should serve the Vite-built SPA (or 404 if not built yet). Hit `http://localhost:8787/api/llm/chat` with POST — should return `{"placeholder": true}`.

Stop the dev server after verifying.

- [ ] **Step 5: Commit**

```bash
git add src/worker/
git commit -m "feat: worker router with placeholder handlers"
```

---

### Task 3: Durable Object (SessionDO)

**Files:**
- Modify: `src/worker/session.ts`

- [ ] **Step 1: Implement SessionDO with SQLite**

Replace `src/worker/session.ts`:

```typescript
import { DurableObject } from 'cloudflare:workers';
import type { Env, SessionState } from './types';

const DEFAULT_STATE: SessionState = {
  mode: 'tutor',
  topic: '',
  knowledgeLevel: 3,
};

export class SessionDO extends DurableObject<Env> {
  private initialized = false;

  private ensureSchema(): void {
    if (this.initialized) return;
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS session (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);
    const rows = this.ctx.storage.sql.exec(
      "SELECT value FROM session WHERE key = 'state'"
    ).toArray();
    if (rows.length === 0) {
      this.ctx.storage.sql.exec(
        "INSERT INTO session (key, value) VALUES ('state', ?)",
        JSON.stringify(DEFAULT_STATE)
      );
    }
    this.initialized = true;
  }

  async getState(): Promise<SessionState> {
    this.ensureSchema();
    const rows = this.ctx.storage.sql.exec(
      "SELECT value FROM session WHERE key = 'state'"
    ).toArray();
    return JSON.parse(rows[0].value as string);
  }

  async updateState(updates: Partial<SessionState>): Promise<SessionState> {
    this.ensureSchema();
    const current = await this.getState();
    const updated = { ...current, ...updates };
    this.ctx.storage.sql.exec(
      "UPDATE session SET value = ? WHERE key = 'state'",
      JSON.stringify(updated)
    );
    return updated;
  }

  async addMessage(role: string, content: string): Promise<void> {
    this.ensureSchema();
    this.ctx.storage.sql.exec(
      'INSERT INTO messages (role, content, timestamp) VALUES (?, ?, ?)',
      role,
      content,
      Date.now()
    );
  }

  async getRecentMessages(limit = 20): Promise<Array<{ role: string; content: string }>> {
    this.ensureSchema();
    return this.ctx.storage.sql
      .exec('SELECT role, content FROM messages ORDER BY id DESC LIMIT ?', limit)
      .toArray()
      .reverse() as Array<{ role: string; content: string }>;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/state' && request.method === 'GET') {
      return Response.json(await this.getState());
    }

    if (url.pathname === '/state' && request.method === 'POST') {
      const updates = await request.json<Partial<SessionState>>();
      return Response.json(await this.updateState(updates));
    }

    if (url.pathname === '/messages' && request.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      return Response.json(await this.getRecentMessages(limit));
    }

    if (url.pathname === '/messages' && request.method === 'POST') {
      const { role, content } = await request.json<{ role: string; content: string }>();
      await this.addMessage(role, content);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }
}
```

- [ ] **Step 2: Verify DO works locally**

Run: `npx wrangler dev`

Test with curl:
```bash
# Get default state
curl -s http://localhost:8787/api/tools/session -X POST -H 'Content-Type: application/json' -d '{"session_id":"test"}'
```

Expected: Returns a JSON response (will be placeholder until Task 5, but the DO should initialize without errors in the wrangler logs).

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/worker/session.ts
git commit -m "feat: SessionDO with SQLite state and message history"
```

---

### Task 4: Custom LLM Endpoint

**Files:**
- Modify: `src/worker/llm.ts`

- [ ] **Step 1: Implement the Custom LLM handler**

Replace `src/worker/llm.ts`:

```typescript
import type { Env } from './types';

const SYSTEM_PROMPT = `You are Curiosity, a voice-first AI learning companion. You help curious people learn about any topic through natural conversation.

Detect the user's intent and operate in one of four modes:

TUTOR MODE (default):
- Triggered by: "teach me", "how does X work", "what is X", general questions
- Explain clearly, check understanding, adapt complexity to the user's level
- Ask follow-up questions: "Does that make sense?" "Want me to go deeper?"

DEBATE MODE:
- Triggered by: "debate me", "challenge me", "argue for/against"
- Take the opposing position, use Socratic questioning
- Be respectful but push back. Ask "But what about..."

ELI5 MODE:
- Triggered by: "explain like I'm 5", "simplify", "make it simple"
- Use analogies, everyday language, zero jargon
- Short sentences. Concrete examples only.

LECTURE MODE:
- Triggered by: "give me a lesson", "lecture me on", "deep dive"
- Structured: brief intro, then 3-4 key points, then a summary
- More detailed and comprehensive than tutor mode

RULES:
- Announce mode switches naturally: "Sure, let me break that down simply..."
- Keep responses concise for voice — roughly 80-120 words max
- Be warm, engaging, and genuinely curious yourself
- Never say you are an AI or language model — you are Curiosity`;

export async function handleLLMChat(request: Request, env: Env): Promise<Response> {
  const body = await request.json<{
    model?: string;
    messages: Array<{ role: string; content: string }>;
    tools?: unknown[];
    stream?: boolean;
  }>();

  // Load session state from Durable Object
  const sessionId = 'default';
  const doId = env.SESSION.idFromName(sessionId);
  const stub = env.SESSION.get(doId);

  let contextLine = '';
  try {
    const stateRes = await stub.fetch(new Request('http://do/state'));
    const state = await stateRes.json<{ mode: string; topic: string; knowledgeLevel: number }>();
    contextLine = `\n\nCURRENT SESSION:\n- Mode: ${state.mode}\n- Topic: ${state.topic || 'none yet'}\n- User Level: ${state.knowledgeLevel}/5 (1=beginner, 5=expert)\nAdapt your explanations to this level.`;
  } catch {
    // First call — no session yet, use defaults
  }

  // Build enriched messages: our system prompt + user messages (strip any existing system messages)
  const userMessages = body.messages.filter((m) => m.role !== 'system');
  const enrichedMessages = [
    { role: 'system', content: SYSTEM_PROMPT + contextLine },
    ...userMessages,
  ];

  // Forward to Workers AI via AI Gateway (OpenAI-compatible endpoint)
  const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.AI_GATEWAY_ID}/workers-ai/v1/chat/completions`;

  const aiResponse = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      messages: enrichedMessages,
      stream: body.stream ?? true,
      ...(body.tools && body.tools.length > 0 ? { tools: body.tools } : {}),
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    return Response.json(
      { error: 'Workers AI request failed', detail: errText },
      { status: aiResponse.status }
    );
  }

  // Pass through the streaming SSE response (already in OpenAI format)
  return new Response(aiResponse.body, {
    status: 200,
    headers: {
      'Content-Type': aiResponse.headers.get('Content-Type') || 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
```

- [ ] **Step 2: Test with curl (requires valid secrets in .dev.vars)**

Run: `npx wrangler dev --remote`

```bash
curl -N http://localhost:8787/api/llm/chat \
  -X POST -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Explain gravity like I am 5"}],"stream":true}'
```

Expected: Streaming SSE response with `data: {"id":...,"choices":[{"delta":{"content":"..."}}]}` chunks followed by `data: [DONE]`.

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/worker/llm.ts
git commit -m "feat: Custom LLM endpoint streaming via AI Gateway"
```

---

### Task 5: Server Tools (Lookup + Session)

**Files:**
- Modify: `src/worker/tools.ts`

- [ ] **Step 1: Implement lookup and session tool handlers**

Replace `src/worker/tools.ts`:

```typescript
import type { Env, SessionState } from './types';

export async function handleLookup(request: Request, env: Env): Promise<Response> {
  const { query } = await request.json<{ query: string }>();

  if (!query) {
    return Response.json({ context: '', sources: [] });
  }

  // Generate embedding for the query
  const embeddingResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: [query],
  });

  const queryVector = embeddingResult.data[0];

  // Search Vectorize for relevant knowledge
  const results = await env.VECTOR_INDEX.query(queryVector, {
    topK: 5,
    returnMetadata: 'all',
  });

  const context = results.matches
    .filter((m) => m.score > 0.5)
    .map((m) => (m.metadata as Record<string, string>)?.content || '')
    .filter(Boolean)
    .join('\n\n');

  return Response.json({
    context: context || 'No relevant context found.',
    sources: results.matches.map((m) => ({
      id: m.id,
      topic: (m.metadata as Record<string, string>)?.topic,
      score: m.score,
    })),
  });
}

export async function handleSessionTool(request: Request, env: Env): Promise<Response> {
  const body = await request.json<{
    session_id?: string;
    mode?: SessionState['mode'];
    topic?: string;
    knowledge_level?: number;
  }>();

  const sessionId = body.session_id || 'default';
  const doId = env.SESSION.idFromName(sessionId);
  const stub = env.SESSION.get(doId);

  const updates: Partial<SessionState> = {};
  if (body.mode) updates.mode = body.mode;
  if (body.topic !== undefined) updates.topic = body.topic;
  if (body.knowledge_level !== undefined) updates.knowledgeLevel = body.knowledge_level;

  const res = await stub.fetch(
    new Request('http://do/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
  );

  const state = await res.json();
  return Response.json({ ok: true, state });
}
```

- [ ] **Step 2: Test session tool with curl**

Run: `npx wrangler dev`

```bash
# Update session state
curl -s http://localhost:8787/api/tools/session \
  -X POST -H 'Content-Type: application/json' \
  -d '{"mode":"eli5","topic":"black holes","knowledge_level":2}'

# Should return: {"ok":true,"state":{"mode":"eli5","topic":"black holes","knowledgeLevel":2}}
```

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/worker/tools.ts
git commit -m "feat: server tools for Vectorize lookup and session state"
```

---

### Task 6: Browser Rendering Visual Endpoint

**Files:**
- Modify: `src/worker/visual.ts`

- [ ] **Step 1: Implement the visual screenshot handler**

Replace `src/worker/visual.ts`:

```typescript
import puppeteer from '@cloudflare/puppeteer';
import type { Env } from './types';

export async function handleVisual(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const topic = url.searchParams.get('topic');

  if (!topic) {
    return Response.json({ error: 'Missing topic parameter' }, { status: 400 });
  }

  // Build Wikipedia URL from topic
  const wikiTitle = topic
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('_');
  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`;

  let browser: puppeteer.Browser | null = null;
  try {
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });

    const response = await page.goto(wikiUrl, {
      waitUntil: 'networkidle0',
      timeout: 8000,
    });

    // If Wikipedia redirects to a search page (no article found), return empty
    const finalUrl = page.url();
    if (finalUrl.includes('search') || !response || response.status() === 404) {
      await browser.close();
      return Response.json({ error: 'No visual found for topic' }, { status: 404 });
    }

    // Hide the top banner/nav for a cleaner screenshot
    await page.evaluate(() => {
      const header = document.querySelector('.vector-header');
      if (header) (header as HTMLElement).style.display = 'none';
      const siteNotice = document.getElementById('siteNotice');
      if (siteNotice) siteNotice.style.display = 'none';
    });

    // Scroll to the first image if present
    await page.evaluate(() => {
      const infobox = document.querySelector('.infobox');
      const thumb = document.querySelector('.thumb');
      const target = infobox || thumb;
      if (target) target.scrollIntoView({ block: 'center' });
    });

    const screenshot = await page.screenshot({ type: 'png' });
    await browser.close();

    return new Response(screenshot, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    return Response.json(
      { error: 'Failed to render visual', detail: String(err) },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test visual endpoint (requires --remote for Browser Rendering)**

Run: `npx wrangler dev --remote`

```bash
curl -s -o /tmp/visual-test.png 'http://localhost:8787/api/visual?topic=black+holes'
# Open /tmp/visual-test.png to verify it's a Wikipedia screenshot
```

Expected: A PNG file showing the Wikipedia page for "Black holes" (or similar).

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/worker/visual.ts
git commit -m "feat: Browser Rendering visual companion endpoint"
```

---

### Task 7: Signed URL Endpoint

**Files:**
- Modify: `src/worker/auth.ts`

- [ ] **Step 1: Implement signed URL handler**

Replace `src/worker/auth.ts`:

```typescript
import type { Env } from './types';

export async function handleSignedUrl(request: Request, env: Env): Promise<Response> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${env.ELEVENLABS_AGENT_ID}`,
    {
      headers: {
        'xi-api-key': env.ELEVENLABS_API_KEY,
      },
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    return Response.json(
      { error: 'Failed to get signed URL', detail: errText },
      { status: response.status }
    );
  }

  const data = await response.json<{ signed_url: string }>();
  return Response.json(data);
}
```

- [ ] **Step 2: Test (requires valid ElevenLabs API key and agent ID in .dev.vars)**

Run: `npx wrangler dev --remote`

```bash
curl -s http://localhost:8787/api/signed-url -X POST
# Should return: {"signed_url":"wss://..."}
```

This will fail until we create the ElevenLabs agent in Task 11. That's expected — just verify the handler doesn't crash.

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/worker/auth.ts
git commit -m "feat: signed URL endpoint for ElevenLabs agent auth"
```

---

### Task 8: Frontend App Shell + Voice Hook

**Files:**
- Modify: `src/client/App.tsx`
- Create: `src/client/hooks/useVoice.ts`

- [ ] **Step 1: Create src/client/hooks/useVoice.ts**

```typescript
import { useConversation } from '@elevenlabs/react';
import { useCallback, useState } from 'react';

interface UseVoiceOptions {
  onModeChange: (mode: string) => void;
  onTopicChange: (topic: string) => void;
}

export function useVoice({ onModeChange, onTopicChange }: UseVoiceOptions) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const conversation = useConversation({
    onModeChange: ({ mode }) => {
      setIsSpeaking(mode === 'speaking');
    },
    onError: (error) => {
      console.error('ElevenLabs error:', error);
    },
  });

  const startSession = useCallback(async () => {
    try {
      // Request mic permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from our backend
      const res = await fetch('/api/signed-url', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to get signed URL');
      const { signed_url } = await res.json();

      await conversation.startSession({
        signedUrl: signed_url,
        clientTools: {
          update_ui: async (params: { mode?: string; topic?: string }) => {
            if (params.mode) onModeChange(params.mode);
            if (params.topic) onTopicChange(params.topic);
            return 'UI updated';
          },
        },
      });
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  }, [conversation, onModeChange, onTopicChange]);

  const endSession = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error('Failed to end session:', err);
    }
  }, [conversation]);

  return {
    status: conversation.status,
    isSpeaking,
    startSession,
    endSession,
  };
}
```

- [ ] **Step 2: Update src/client/App.tsx**

Replace `src/client/App.tsx`:

```tsx
import { useState, useCallback } from 'react';
import { useVoice } from './hooks/useVoice';
import { VoiceOrb } from './components/VoiceOrb';
import { VisualPanel } from './components/VisualPanel';
import { StatusBar } from './components/StatusBar';

export function App() {
  const [mode, setMode] = useState('tutor');
  const [topic, setTopic] = useState('');
  const [visualUrl, setVisualUrl] = useState<string | null>(null);

  const onModeChange = useCallback((newMode: string) => {
    setMode(newMode);
  }, []);

  const onTopicChange = useCallback(async (newTopic: string) => {
    setTopic(newTopic);
    try {
      const res = await fetch(`/api/visual?topic=${encodeURIComponent(newTopic)}`);
      if (res.ok) {
        const blob = await res.blob();
        if (visualUrl) URL.revokeObjectURL(visualUrl);
        setVisualUrl(URL.createObjectURL(blob));
      } else {
        setVisualUrl(null);
      }
    } catch {
      setVisualUrl(null);
    }
  }, [visualUrl]);

  const { status, isSpeaking, startSession, endSession } = useVoice({
    onModeChange,
    onTopicChange,
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-2xl font-light tracking-[0.3em] text-gray-500">
        CURIOSITY
      </h1>

      <VisualPanel imageUrl={visualUrl} />

      <VoiceOrb
        isActive={status === 'connected'}
        isSpeaking={isSpeaking}
        onClick={status === 'connected' ? endSession : startSession}
      />

      <StatusBar mode={mode} topic={topic} status={status} />
    </div>
  );
}
```

- [ ] **Step 3: Create placeholder components (will be fully built in Tasks 9-10)**

`src/client/components/VoiceOrb.tsx`:
```tsx
interface VoiceOrbProps {
  isActive: boolean;
  isSpeaking: boolean;
  onClick: () => void;
}

export function VoiceOrb({ isActive, onClick }: VoiceOrbProps) {
  return (
    <button
      onClick={onClick}
      className="w-40 h-40 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-colors"
    >
      <span className="text-sm text-gray-400">
        {isActive ? 'Tap to stop' : 'Tap to start'}
      </span>
    </button>
  );
}
```

`src/client/components/VisualPanel.tsx`:
```tsx
interface VisualPanelProps {
  imageUrl: string | null;
}

export function VisualPanel({ imageUrl }: VisualPanelProps) {
  if (!imageUrl) return null;
  return (
    <div className="w-full max-w-md rounded-xl overflow-hidden shadow-lg shadow-indigo-500/10 transition-opacity duration-500">
      <img src={imageUrl} alt="Visual companion" className="w-full h-auto" />
    </div>
  );
}
```

`src/client/components/StatusBar.tsx`:
```tsx
interface StatusBarProps {
  mode: string;
  topic: string;
  status: string;
}

const MODE_LABELS: Record<string, string> = {
  tutor: 'Tutor',
  debate: 'Debate',
  eli5: 'ELI5',
  lecture: 'Lecture',
};

export function StatusBar({ mode, topic, status }: StatusBarProps) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-500">
      <span className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-400' : 'bg-gray-600'}`}
        />
        {status === 'connected' ? 'Connected' : 'Ready'}
      </span>
      <span className="text-gray-700">|</span>
      <span>Mode: {MODE_LABELS[mode] || mode}</span>
      {topic && (
        <>
          <span className="text-gray-700">|</span>
          <span>{topic}</span>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/client/
git commit -m "feat: App shell with voice hook and placeholder components"
```

---

### Task 9: Voice Orb Component

**Files:**
- Modify: `src/client/components/VoiceOrb.tsx`

- [ ] **Step 1: Implement animated canvas orb**

Replace `src/client/components/VoiceOrb.tsx`:

```tsx
import { useRef, useEffect } from 'react';

interface VoiceOrbProps {
  isActive: boolean;
  isSpeaking: boolean;
  onClick: () => void;
}

export function VoiceOrb({ isActive, isSpeaking, onClick }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const size = 240;
    const dpr = window.devicePixelRatio || 2;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    function draw() {
      const t = timeRef.current;
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const baseRadius = isActive ? 55 : 40;
      const pulse = isSpeaking ? 18 : isActive ? 6 : 2;

      // Outer glow rings
      for (let i = 4; i >= 0; i--) {
        const r = baseRadius + i * 12 + Math.sin(t * 1.5 + i * 0.8) * pulse;
        const alpha = 0.06 - i * 0.01;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = isActive
          ? `rgba(99, 102, 241, ${alpha})`
          : `rgba(107, 114, 128, ${alpha})`;
        ctx.fill();
      }

      // Core orb with gradient
      const coreR = baseRadius + Math.sin(t * 2.5) * (isSpeaking ? 10 : 3);
      const grad = ctx.createRadialGradient(cx - 10, cy - 10, 0, cx, cy, coreR);

      if (isSpeaking) {
        grad.addColorStop(0, 'rgba(165, 180, 252, 0.95)');
        grad.addColorStop(0.6, 'rgba(99, 102, 241, 0.7)');
        grad.addColorStop(1, 'rgba(67, 56, 202, 0.2)');
      } else if (isActive) {
        grad.addColorStop(0, 'rgba(129, 140, 248, 0.85)');
        grad.addColorStop(0.7, 'rgba(99, 102, 241, 0.4)');
        grad.addColorStop(1, 'rgba(79, 70, 229, 0.1)');
      } else {
        grad.addColorStop(0, 'rgba(209, 213, 219, 0.5)');
        grad.addColorStop(0.7, 'rgba(156, 163, 175, 0.25)');
        grad.addColorStop(1, 'rgba(107, 114, 128, 0.05)');
      }

      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Inner bright spot
      const innerR = 12 + Math.sin(t * 3) * (isSpeaking ? 4 : 1);
      const innerGrad = ctx.createRadialGradient(cx - 5, cy - 5, 0, cx, cy, innerR);
      innerGrad.addColorStop(0, isActive ? 'rgba(224, 231, 255, 0.6)' : 'rgba(229, 231, 235, 0.3)');
      innerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fillStyle = innerGrad;
      ctx.fill();

      timeRef.current += 0.025;
      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [isActive, isSpeaking]);

  return (
    <button
      onClick={onClick}
      className="relative cursor-pointer focus:outline-none group"
      aria-label={isActive ? 'End conversation' : 'Start conversation'}
    >
      <canvas ref={canvasRef} className="w-[240px] h-[240px]" />
      <span className="absolute inset-0 flex items-center justify-center text-sm font-light text-gray-400 group-hover:text-gray-300 transition-colors">
        {isSpeaking ? '' : isActive ? 'Listening...' : 'Tap to start'}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Verify build and visual**

Run: `npx vite build && npx vite preview`

Open `http://localhost:4173` in browser. Verify:
- Gray pulsing orb visible on dark background
- "Tap to start" label centered on the orb

- [ ] **Step 3: Commit**

```bash
git add src/client/components/VoiceOrb.tsx
git commit -m "feat: animated canvas voice orb with speaking/idle states"
```

---

### Task 10: VisualPanel + StatusBar Polish

**Files:**
- Modify: `src/client/components/VisualPanel.tsx`, `src/client/components/StatusBar.tsx`

- [ ] **Step 1: Polish VisualPanel with fade transitions**

Replace `src/client/components/VisualPanel.tsx`:

```tsx
import { useState, useEffect } from 'react';

interface VisualPanelProps {
  imageUrl: string | null;
}

export function VisualPanel({ imageUrl }: VisualPanelProps) {
  const [visible, setVisible] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  useEffect(() => {
    if (imageUrl) {
      setCurrentUrl(imageUrl);
      // Small delay for fade-in effect
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setCurrentUrl(null), 500);
      return () => clearTimeout(timer);
    }
  }, [imageUrl]);

  if (!currentUrl) return null;

  return (
    <div
      className={`w-full max-w-md rounded-xl overflow-hidden shadow-lg shadow-indigo-500/10 border border-gray-800 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <img
        src={currentUrl}
        alt="Visual companion"
        className="w-full h-auto max-h-[300px] object-cover"
      />
    </div>
  );
}
```

- [ ] **Step 2: StatusBar is already complete from Task 8**

The StatusBar component from Task 8 is sufficient. No changes needed.

- [ ] **Step 3: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/client/components/VisualPanel.tsx
git commit -m "feat: VisualPanel with fade transitions"
```

---

### Task 11: ElevenLabs Agent Configuration

This task is done via the ElevenLabs dashboard or API — not code in the repo. Follow these steps manually.

- [ ] **Step 1: Create an ElevenLabs Conversational AI agent**

Go to [https://elevenlabs.io/app/conversational-ai](https://elevenlabs.io/app/conversational-ai) and create a new agent with these settings:

**Agent name:** Curiosity

**First message:** "Hey! I'm Curiosity. Ask me about anything — I can teach, debate, simplify, or give you a deep dive. What are you curious about?"

**System prompt:** (Use the same prompt from `src/worker/llm.ts` — the `SYSTEM_PROMPT` constant. Copy it from there.)

**LLM:** Custom LLM
- URL: `https://curiosity.<your-subdomain>.workers.dev/api/llm/chat` (you'll get this after deploying)
- For now, use a placeholder — you'll update this after Task 13

**Voice:** Pick a warm, engaging voice. Recommended: "Rachel" or "Adam" from the ElevenLabs library.

- [ ] **Step 2: Register server tools on the agent**

Add two server tools:

**Tool 1: lookup_context**
```json
{
  "name": "lookup_context",
  "description": "Look up additional context and knowledge about a topic. Call this when you need more information to give a good explanation.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The topic or question to look up"
      }
    },
    "required": ["query"]
  }
}
```
Webhook URL: `https://curiosity.<your-subdomain>.workers.dev/api/tools/lookup`
Method: POST

**Tool 2: track_session**
```json
{
  "name": "track_session",
  "description": "Update the session state when the conversation mode or topic changes. Call this whenever you switch modes or start discussing a new topic.",
  "parameters": {
    "type": "object",
    "properties": {
      "mode": {
        "type": "string",
        "enum": ["tutor", "debate", "eli5", "lecture"],
        "description": "The current conversation mode"
      },
      "topic": {
        "type": "string",
        "description": "The current topic being discussed"
      },
      "knowledge_level": {
        "type": "number",
        "description": "User's knowledge level 1-5 (1=beginner, 5=expert)"
      }
    }
  }
}
```
Webhook URL: `https://curiosity.<your-subdomain>.workers.dev/api/tools/session`
Method: POST

- [ ] **Step 3: Register client tool**

Add a client tool:

**Tool: update_ui**
```json
{
  "name": "update_ui",
  "description": "Update the UI to show the current mode and topic. Call this when switching modes or topics.",
  "parameters": {
    "type": "object",
    "properties": {
      "mode": {
        "type": "string",
        "description": "The current mode to display"
      },
      "topic": {
        "type": "string",
        "description": "The current topic to display"
      }
    }
  }
}
```
Mark as "Client tool" (executed in the browser, not a webhook).

- [ ] **Step 4: Copy agent ID to .dev.vars**

Copy the agent ID from the ElevenLabs dashboard and add it to `.dev.vars`:
```
ELEVENLABS_AGENT_ID=your-actual-agent-id
```

Also set it as a Wrangler secret for production:
```bash
echo "your-actual-agent-id" | npx wrangler secret put ELEVENLABS_AGENT_ID
```

- [ ] **Step 5: Document the agent config**

No code commit for this task — it's all ElevenLabs dashboard configuration. But verify the agent ID is saved in `.dev.vars`.

---

### Task 12: Seed Vectorize Knowledge Base

**Files:**
- Modify: `src/worker/seed.ts`

- [ ] **Step 1: Create the Vectorize index**

```bash
npx wrangler vectorize create curiosity-knowledge --preset "@cf/baai/bge-base-en-v1.5"
```

Expected: Index created successfully.

- [ ] **Step 2: Implement the seed endpoint**

Replace `src/worker/seed.ts`:

```typescript
import type { Env } from './types';

const SEED_ENTRIES = [
  { id: 'physics-gravity', topic: 'gravity', content: 'Gravity is a fundamental force of nature that attracts objects with mass toward each other. On Earth, gravity gives weight to physical objects and causes them to fall toward the ground when dropped. The force of gravity between two objects depends on their masses and the distance between them, as described by Newton\'s law of universal gravitation. Einstein later refined this with general relativity, explaining gravity as the curvature of spacetime caused by mass and energy.' },
  { id: 'physics-quantum', topic: 'quantum mechanics', content: 'Quantum mechanics is the branch of physics that describes the behavior of matter and energy at the smallest scales — atoms and subatomic particles. Key principles include wave-particle duality (particles can behave as waves), the uncertainty principle (you cannot know both position and momentum precisely), and superposition (particles exist in multiple states until measured). Quantum entanglement allows particles to be correlated regardless of distance.' },
  { id: 'physics-blackholes', topic: 'black holes', content: 'A black hole is a region of spacetime where gravity is so strong that nothing, not even light, can escape once past the event horizon. They form when massive stars collapse at the end of their life cycle. The singularity at the center has infinite density. Black holes can be detected by their effect on nearby matter and by gravitational waves produced when two black holes merge. Hawking radiation suggests black holes slowly evaporate over immense timescales.' },
  { id: 'biology-evolution', topic: 'evolution', content: 'Evolution is the change in heritable characteristics of biological populations over successive generations. Natural selection, described by Charles Darwin, is the key mechanism: organisms with traits better suited to their environment are more likely to survive and reproduce. Over millions of years, this process has produced the diversity of life on Earth. Evidence comes from fossils, DNA comparisons, observed speciation, and vestigial structures.' },
  { id: 'biology-dna', topic: 'DNA', content: 'DNA (deoxyribonucleic acid) is the molecule that carries genetic instructions for life. It has a double helix structure made of nucleotide bases — adenine (A), thymine (T), guanine (G), and cytosine (C). The sequence of these bases encodes proteins that build and maintain organisms. DNA replication allows cells to divide with copies of genetic information. Mutations in DNA can lead to variations that drive evolution.' },
  { id: 'history-renaissance', topic: 'Renaissance', content: 'The Renaissance was a cultural movement spanning roughly the 14th to 17th century, beginning in Italy and spreading across Europe. It marked a renewed interest in classical Greek and Roman art, philosophy, and science. Key figures include Leonardo da Vinci, Michelangelo, Galileo, and Machiavelli. The Renaissance saw advances in art (perspective, realism), science (heliocentrism, anatomy), and political thought, and is considered the bridge between the Middle Ages and modern history.' },
  { id: 'philosophy-stoicism', topic: 'stoicism', content: 'Stoicism is an ancient Greek philosophy founded by Zeno of Citium around 300 BC. Core principles: virtue (wisdom, courage, justice, temperance) is the highest good; we cannot control external events but can control our responses; emotions arise from judgments we can examine and change. Key Stoic thinkers include Marcus Aurelius, Seneca, and Epictetus. Stoicism emphasizes living in accordance with nature and reason, accepting what we cannot change, and focusing on what we can.' },
  { id: 'philosophy-existentialism', topic: 'existentialism', content: 'Existentialism is a philosophical movement emphasizing individual existence, freedom, and choice. Key ideas: existence precedes essence (we define ourselves through actions, not inherent nature); radical freedom brings anxiety and responsibility; life has no inherent meaning, so we must create our own. Major existentialists include Kierkegaard, Nietzsche, Sartre, Camus, and de Beauvoir. Camus explored the absurd — the conflict between human desire for meaning and the universe\'s silence.' },
  { id: 'cs-algorithms', topic: 'algorithms', content: 'An algorithm is a step-by-step procedure for solving a problem or performing a computation. Key concepts: time complexity (Big O notation measures how runtime grows with input size), space complexity (memory usage), and common categories like sorting (quicksort, mergesort), searching (binary search), graph algorithms (Dijkstra, BFS, DFS), and dynamic programming. Algorithm design involves trade-offs between speed, memory, and simplicity.' },
  { id: 'cs-ai', topic: 'artificial intelligence', content: 'Artificial intelligence (AI) is the simulation of human intelligence by machines. Machine learning, a subset of AI, enables systems to learn from data without explicit programming. Deep learning uses neural networks with many layers to recognize patterns. Key milestones: chess (Deep Blue, 1997), image recognition (ImageNet, 2012), language models (GPT, 2018+), and game playing (AlphaGo, 2016). Current AI excels at narrow tasks but general AI remains an open challenge.' },
  { id: 'economics-supply-demand', topic: 'supply and demand', content: 'Supply and demand is the fundamental model of price determination in a market economy. Demand: as price decreases, quantity demanded increases (law of demand). Supply: as price increases, quantity supplied increases (law of supply). Equilibrium occurs where supply meets demand. Shifts in either curve (due to income, preferences, costs, technology) change equilibrium price and quantity. This model explains pricing for everything from groceries to housing.' },
  { id: 'psychology-cognitive-bias', topic: 'cognitive biases', content: 'Cognitive biases are systematic patterns of deviation from rationality in judgment. Common biases include: confirmation bias (favoring information that confirms existing beliefs), anchoring (over-relying on the first piece of information), availability heuristic (judging probability by how easily examples come to mind), Dunning-Kruger effect (low-ability individuals overestimate their competence), and loss aversion (losses feel roughly twice as painful as equivalent gains feel good).' },
];

export async function handleSeed(_request: Request, env: Env): Promise<Response> {
  const results: Array<{ id: string; status: string }> = [];

  // Process in batches of 4 (embedding API limit)
  for (let i = 0; i < SEED_ENTRIES.length; i += 4) {
    const batch = SEED_ENTRIES.slice(i, i + 4);

    // Generate embeddings
    const embeddingResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: batch.map((e) => e.content),
    });

    // Upsert to Vectorize
    const vectors = batch.map((entry, j) => ({
      id: entry.id,
      values: embeddingResult.data[j],
      metadata: {
        topic: entry.topic,
        content: entry.content,
      },
    }));

    await env.VECTOR_INDEX.upsert(vectors);

    for (const entry of batch) {
      results.push({ id: entry.id, status: 'ok' });
    }
  }

  return Response.json({
    ok: true,
    seeded: results.length,
    entries: results,
  });
}
```

- [ ] **Step 3: Run the seed (requires --remote for Vectorize)**

Run: `npx wrangler dev --remote`

```bash
curl -s http://localhost:8787/api/seed -X POST | jq .
```

Expected:
```json
{
  "ok": true,
  "seeded": 12,
  "entries": [
    { "id": "physics-gravity", "status": "ok" },
    ...
  ]
}
```

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/worker/seed.ts
git commit -m "feat: Vectorize seed endpoint with 12 curated knowledge entries"
```

---

### Task 13: Deploy & End-to-End Test

**Files:**
- No new files — deployment and verification

- [ ] **Step 1: Set production secrets**

```bash
echo "your-account-id" | npx wrangler secret put CF_ACCOUNT_ID
echo "your-api-token" | npx wrangler secret put CF_API_TOKEN
echo "curiosity-gateway" | npx wrangler secret put AI_GATEWAY_ID
echo "your-elevenlabs-key" | npx wrangler secret put ELEVENLABS_API_KEY
echo "your-agent-id" | npx wrangler secret put ELEVENLABS_AGENT_ID
```

- [ ] **Step 2: Create AI Gateway**

Go to the Cloudflare dashboard → AI → AI Gateway → Create gateway.
Name: `curiosity-gateway`
Copy the gateway ID and ensure it matches your `AI_GATEWAY_ID` secret.

- [ ] **Step 3: Build and deploy**

```bash
npx vite build && npx wrangler deploy
```

Expected: Deployment succeeds. Output shows the URL: `https://curiosity.<your-subdomain>.workers.dev`

- [ ] **Step 4: Seed the production Vectorize index**

```bash
curl -s https://curiosity.<your-subdomain>.workers.dev/api/seed -X POST | jq .
```

Expected: 12 entries seeded successfully.

- [ ] **Step 5: Update ElevenLabs agent with production URLs**

Go to ElevenLabs dashboard and update:
- Custom LLM URL: `https://curiosity.<your-subdomain>.workers.dev/api/llm/chat`
- lookup_context webhook URL: `https://curiosity.<your-subdomain>.workers.dev/api/tools/lookup`
- track_session webhook URL: `https://curiosity.<your-subdomain>.workers.dev/api/tools/session`

- [ ] **Step 6: End-to-end test**

1. Open `https://curiosity.<your-subdomain>.workers.dev` in browser
2. Click the orb → should request mic permission
3. Say "Teach me about black holes"
4. Verify: AI responds with voice, status bar shows "Mode: Tutor" and topic
5. Say "Explain that like I'm 5"
6. Verify: AI switches to simpler language, mode changes to "ELI5"
7. Verify: Visual panel shows a Wikipedia screenshot for the topic
8. Say "Let's debate whether time travel is possible"
9. Verify: AI switches to debate mode, pushes back on your position

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: deployment config and final polish"
```
