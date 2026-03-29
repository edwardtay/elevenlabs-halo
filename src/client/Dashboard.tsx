import { useEffect, useState } from 'react';

interface Stats {
  totalTurns: number;
  moodBreakdown: Array<{ mood: string; count: number }>;
  timeline: Array<{ mood: string; created_at: number }>;
  streakDays: number;
}

interface Turn {
  id: number;
  user_message: string;
  mood: string;
  created_at: number;
}

const MOOD_EMOJI: Record<string, string> = {
  positive: '😊',
  low: '😔',
  frustrated: '😤',
  reflective: '🤔',
  neutral: '💬',
};

const MOOD_COLOR: Record<string, string> = {
  positive: '#16a34a',
  low: '#6366f1',
  frustrated: '#ef4444',
  reflective: '#f59e0b',
  neutral: '#a8a29e',
};

const MOOD_LABEL: Record<string, string> = {
  positive: 'Good',
  low: 'Low',
  frustrated: 'Frustrated',
  reflective: 'Reflective',
  neutral: 'Neutral',
};

export function Dashboard({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then((r) => r.json()) as Promise<Stats>,
      fetch('/api/history').then((r) => r.json()) as Promise<{ turns: Turn[] }>,
    ]).then(([s, h]) => {
      setStats(s);
      setHistory(h.turns || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>Loading your journey...</p>
      </div>
    );
  }

  const total = stats?.totalTurns || 0;
  const streak = stats?.streakDays || 0;
  const topMood = stats?.moodBreakdown?.[0];

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto" style={{ zIndex: 2, position: 'relative' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="text-sm cursor-pointer flex items-center gap-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ← Back
        </button>
        <span className="text-xs tracking-[0.25em] uppercase font-medium" style={{ color: 'var(--color-text-dim)' }}>
          Your Journey
        </span>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-2xl font-medium" style={{ color: 'var(--color-text)' }}>{total}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-dim)' }}>Check-ins</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-2xl font-medium" style={{ color: 'var(--color-text)' }}>{streak}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-dim)' }}>Day streak</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-2xl">{topMood ? MOOD_EMOJI[topMood.mood] || '💬' : '—'}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-dim)' }}>Top mood</p>
        </div>
      </div>

      {/* Mood breakdown */}
      {stats?.moodBreakdown && stats.moodBreakdown.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>Mood breakdown</h3>
          <div className="space-y-2">
            {stats.moodBreakdown.map((m) => {
              const pct = total > 0 ? (m.count / total) * 100 : 0;
              return (
                <div key={m.mood} className="flex items-center gap-3">
                  <span className="text-sm w-6">{MOOD_EMOJI[m.mood] || '💬'}</span>
                  <span className="text-xs w-20" style={{ color: 'var(--color-text-muted)' }}>
                    {MOOD_LABEL[m.mood] || m.mood}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: MOOD_COLOR[m.mood] || 'var(--color-accent)',
                        minWidth: '4px',
                      }}
                    />
                  </div>
                  <span className="text-xs w-8 text-right" style={{ color: 'var(--color-text-dim)' }}>
                    {m.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mood timeline dots */}
      {stats?.timeline && stats.timeline.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>Recent moods</h3>
          <div className="flex flex-wrap gap-1.5">
            {stats.timeline.slice(-30).map((t, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full"
                title={`${MOOD_LABEL[t.mood] || t.mood} — ${new Date(t.created_at).toLocaleDateString()}`}
                style={{ background: MOOD_COLOR[t.mood] || 'var(--color-text-dim)' }}
              />
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-dim)' }}>
            Each dot is a conversation. Colors show your mood.
          </p>
        </div>
      )}

      {/* Recent conversations */}
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>Recent check-ins</h3>
        {history.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
            No check-ins yet. Start talking to Halo!
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((turn) => (
              <div
                key={turn.id}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <span className="text-sm mt-0.5">{MOOD_EMOJI[turn.mood] || '💬'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--color-text)' }}>
                    {turn.user_message || 'Check-in'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
                    {formatTime(turn.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}
