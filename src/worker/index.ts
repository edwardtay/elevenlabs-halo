import type { Env } from './types';

export { HaloAgent } from './agent';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

function doStub(env: Env) {
  return env.HALO_AGENT.get(env.HALO_AGENT.idFromName('default'));
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/llm/chat' && request.method === 'POST') {
        const { handleLLMChat } = await import('./llm');
        return corsResponse(await handleLLMChat(request, env, ctx));
      }
      if (url.pathname === '/api/affirmation' && request.method === 'POST') {
        const { handleAffirmation } = await import('./affirmation');
        return corsResponse(await handleAffirmation(request, env));
      }
      if (url.pathname === '/api/history' && request.method === 'GET') {
        return corsResponse(await doStub(env).fetch(new Request('http://do/history')));
      }
      if (url.pathname === '/api/stats' && request.method === 'GET') {
        return corsResponse(await doStub(env).fetch(new Request('http://do/stats')));
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
