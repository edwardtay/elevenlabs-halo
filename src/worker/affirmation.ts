import type { Env } from './types';

const AFFIRMATIONS = [
  "You're doing better than you think. The fact that you showed up today matters.",
  "It's okay to not have it all figured out. Nobody does, and that's perfectly fine.",
  "You deserve the same kindness you give to others. Be gentle with yourself today.",
  "Your feelings are valid. Whatever you're going through, it's okay to feel it.",
  "You don't have to be productive to be valuable. You matter just by being you.",
  "The hard days make the good ones sweeter. You've survived every bad day so far.",
  "Someone out there is grateful you exist. Even if they haven't told you lately.",
  "It's brave to ask for help. It's brave to keep going. It's brave to just be here.",
  "You're not behind in life. You're exactly where you need to be right now.",
  "Tomorrow is a fresh start. Tonight, just rest. You've done enough today.",
];

export async function handleAffirmation(request: Request, env: Env): Promise<Response> {
  // Pick a random affirmation
  const text = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];

  // Generate speech using ElevenLabs TTS API directly
  const voiceId = 'cgSgspJ2msm6clMCkdW9'; // Jessica
  const ttsResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2',
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.85,
          speed: 0.9,
        },
      }),
    }
  );

  if (!ttsResponse.ok) {
    return Response.json({ error: 'TTS failed', text }, { status: 500 });
  }

  // Save to DO
  try {
    const doId = env.HALO_AGENT.idFromName('default');
    const stub = env.HALO_AGENT.get(doId);
    await stub.fetch(new Request('http://do/affirmation', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }));
  } catch {}

  // Return audio with text in header
  const audioBuffer = await ttsResponse.arrayBuffer();
  return new Response(audioBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'X-Affirmation-Text': encodeURIComponent(text),
      'Cache-Control': 'no-cache',
    },
  });
}
