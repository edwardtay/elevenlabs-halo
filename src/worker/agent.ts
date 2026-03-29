import { DurableObject } from 'cloudflare:workers';

interface Env {
  AI: Ai;
  ELEVENLABS_API_KEY: string;
}

export class HaloAgent extends DurableObject<Env> {
  private initialized = false;

  private ensureSchema(): void {
    if (this.initialized) return;
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS chat_turns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_message TEXT NOT NULL,
        mood TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS affirmations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
    this.initialized = true;
  }

  async fetch(request: Request): Promise<Response> {
    this.ensureSchema();
    const url = new URL(request.url);

    // Log a user message (one turn, not a full conversation)
    if (url.pathname === '/log' && request.method === 'POST') {
      const { messages } = await request.json<{ messages: Array<{ role: string; content: string }> }>();
      const userMsgs = messages.filter((m) => m.role === 'user');
      const lastUserMsg = userMsgs[userMsgs.length - 1]?.content || '';
      if (!lastUserMsg) return Response.json({ ok: true, mood: 'neutral' });

      const mood = detectMood(lastUserMsg);
      const preview = lastUserMsg.length > 80 ? lastUserMsg.substring(0, 77) + '...' : lastUserMsg;
      this.ctx.storage.sql.exec(
        'INSERT INTO chat_turns (user_message, mood, created_at) VALUES (?, ?, ?)',
        preview,
        mood,
        Date.now()
      );
      return Response.json({ ok: true, mood });
    }

    // Recent turns (what the dashboard shows as "recent conversations")
    if (url.pathname === '/history' && request.method === 'GET') {
      const rows = this.ctx.storage.sql.exec(
        'SELECT id, user_message, mood, created_at FROM chat_turns ORDER BY id DESC LIMIT 30'
      ).toArray();
      return Response.json({ turns: rows });
    }

    // Stats with correct streak calculation
    if (url.pathname === '/stats' && request.method === 'GET') {
      const total = this.ctx.storage.sql.exec(
        'SELECT COUNT(*) as count FROM chat_turns'
      ).toArray();

      const moods = this.ctx.storage.sql.exec(
        'SELECT mood, COUNT(*) as count FROM chat_turns GROUP BY mood ORDER BY count DESC'
      ).toArray();

      const timeline = this.ctx.storage.sql.exec(
        'SELECT mood, created_at FROM chat_turns ORDER BY created_at ASC'
      ).toArray();

      // Calculate actual consecutive streak ending today
      const streak = calculateStreak(timeline.map((r: any) => r.created_at));

      return Response.json({
        totalTurns: (total[0] as any)?.count || 0,
        moodBreakdown: moods,
        timeline,
        streakDays: streak,
      });
    }

    if (url.pathname === '/affirmation' && request.method === 'POST') {
      const { text } = await request.json<{ text: string }>();
      this.ctx.storage.sql.exec(
        'INSERT INTO affirmations (text, created_at) VALUES (?, ?)',
        text,
        Date.now()
      );
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }
}

function detectMood(text: string): string {
  const lower = text.toLowerCase();
  if (/happy|excited|great|amazing|awesome|love|wonderful|proud|promot|engaged|married/.test(lower)) return 'positive';
  if (/sad|lonely|depressed|anxious|scared|worried|stressed|hurt|cry|alone|miss/.test(lower)) return 'low';
  if (/angry|frustrated|annoyed|mad|furious|pissed|hate/.test(lower)) return 'frustrated';
  if (/think|wonder|curious|meaning|purpose|life|death|exist/.test(lower)) return 'reflective';
  return 'neutral';
}

function calculateStreak(timestamps: number[]): number {
  if (timestamps.length === 0) return 0;

  // Get unique dates as YYYY-MM-DD strings
  const days = [...new Set(timestamps.map((ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }))].sort().reverse(); // Most recent first

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Streak must include today or yesterday
  if (days[0] !== todayStr) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (days[0] !== yStr) return 0;
  }

  // Count consecutive days backward
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diffMs = prev.getTime() - curr.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
