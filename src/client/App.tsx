import { useState, useRef, useEffect, useCallback } from 'react';
import {
  useConversationControls,
  useConversationStatus,
  useConversationMode,
} from '@elevenlabs/react';
import { Dashboard } from './Dashboard';

export function App() {
  const [showAbout, setShowAbout] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [wakeWordStatus, setWakeWordStatus] = useState<'idle' | 'listening' | 'heard'>('idle');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isStartingSessionRef = useRef(false);
  const shouldListenForWakeWordRef = useRef(true);

  const { startSession, endSession } = useConversationControls();
  const { status } = useConversationStatus();
  const { isSpeaking } = useConversationMode();

  const isActive = status === 'connected';
  const isConnecting = status === 'connecting';

  // Wake word detection
  const stopWakeWordListening = useCallback(() => {
    shouldListenForWakeWordRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setWakeWordStatus('idle');
  }, []);

  const handleStartSession = useCallback(async () => {
    if (isActive || isConnecting || isStartingSessionRef.current) return;

    isStartingSessionRef.current = true;
    shouldListenForWakeWordRef.current = false;
    setSessionError(null);
    stopWakeWordListening();

    try {
      await startSession({
        connectionType: 'websocket',
        onError: (message, context) => {
          console.error('[Halo] Conversation error:', message, context);
          setSessionError(message);
        },
        onDebug: (info) => {
          console.debug('[Halo] Conversation debug:', info);
        },
        onDisconnect: (details) => {
          console.log('[Halo] Conversation ended:', details);
          isStartingSessionRef.current = false;
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start conversation.';
      console.error('[Halo] Failed to start session:', error);
      setSessionError(message);
      isStartingSessionRef.current = false;
      shouldListenForWakeWordRef.current = true;
      setWakeWordStatus('idle');
    }
  }, [isActive, isConnecting, startSession, stopWakeWordListening]);

  const startWakeWordListening = useCallback(() => {
    if (isActive || isConnecting || isStartingSessionRef.current || recognitionRef.current) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    shouldListenForWakeWordRef.current = true;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript.toLowerCase().trim();
        console.log('[Halo] Heard:', t);
        const match =
          t.includes('hello halo') || t.includes('hey halo') ||
          t.includes('hello hello') || t.includes('hey hello') ||
          t.includes('hello hallo') || t.includes('hey hallo') ||
          /hello\s+\w*alo/.test(t) || /hey\s+\w*alo/.test(t);

        if (match) {
          console.log('[Halo] Wake word detected!');
          setWakeWordStatus('heard');
          shouldListenForWakeWordRef.current = false;
          recognition.stop();
          recognitionRef.current = null;
          setTimeout(() => handleStartSession(), 500);
          return;
        }
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition && shouldListenForWakeWordRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.onerror = () => {
      if (recognitionRef.current === recognition && shouldListenForWakeWordRef.current) {
        setTimeout(() => { try { recognition.start(); } catch {} }, 1000);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setWakeWordStatus('listening');
  }, [handleStartSession, isActive, isConnecting]);

  // Auto-start wake word on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) startWakeWordListening();
    }, 2000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop wake word when call starts
  useEffect(() => {
    if (isActive) {
      stopWakeWordListening();
      setWakeWordStatus('idle');
    }
  }, [isActive, stopWakeWordListening]);

  useEffect(() => {
    if (status === 'disconnected') {
      isStartingSessionRef.current = false;
      shouldListenForWakeWordRef.current = true;
    }
  }, [status]);

  useEffect(() => {
    if (
      status === 'disconnected' &&
      !showAbout &&
      !showDashboard &&
      wakeWordStatus === 'idle'
    ) {
      const timer = window.setTimeout(() => {
        startWakeWordListening();
      }, 1200);
      return () => window.clearTimeout(timer);
    }
  }, [showAbout, showDashboard, startWakeWordListening, status, wakeWordStatus]);

  useEffect(() => {
    return () => {
      stopWakeWordListening();
    };
  }, [stopWakeWordListening]);

  // ===== DASHBOARD =====
  if (showDashboard) {
    return <Dashboard onBack={() => setShowDashboard(false)} />;
  }

  // ===== ACTIVE CONVERSATION =====
  if (isActive) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6" style={{ zIndex: 2 }}>
        <div className="absolute top-6 left-8">
          <span className="text-xs tracking-[0.25em] uppercase font-medium" style={{ color: 'var(--color-text-dim)' }}>Halo</span>
        </div>
        <div className="absolute top-6 right-8 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-success)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>Live</span>
        </div>

        <div className="flex flex-col items-center gap-6">
          {/* Pulsing orb */}
          <div className="relative">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center"
              style={{
                background: isSpeaking
                  ? 'radial-gradient(circle, rgba(246,130,31,0.2) 0%, rgba(246,130,31,0.05) 70%)'
                  : 'radial-gradient(circle, rgba(246,130,31,0.1) 0%, rgba(246,130,31,0.02) 70%)',
                boxShadow: isSpeaking
                  ? '0 0 40px rgba(246,130,31,0.2), 0 0 80px rgba(246,130,31,0.1)'
                  : '0 0 20px rgba(246,130,31,0.08)',
                transition: 'all 0.5s ease',
              }}
            >
              <div
                className="w-20 h-20 rounded-full"
                style={{
                  background: isSpeaking
                    ? 'linear-gradient(135deg, #f6821f 0%, #fbad41 100%)'
                    : 'linear-gradient(135deg, #e7e5e4 0%, #d6d3d1 100%)',
                  transition: 'all 0.5s ease',
                }}
              />
            </div>
          </div>

          <p className="text-base font-medium" style={{ color: isSpeaking ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
            {isSpeaking ? 'Halo is speaking...' : 'Listening...'}
          </p>

          {sessionError && (
            <p className="max-w-sm text-center text-sm" style={{ color: 'var(--color-danger)' }}>
              {sessionError}
            </p>
          )}

          <button
            className="px-8 py-3 rounded-2xl text-sm font-medium cursor-pointer transition-all duration-300"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-danger)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220, 38, 38, 0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-surface)'; }}
            onClick={() => endSession()}
          >
            End conversation
          </button>
        </div>
      </div>
    );
  }

  // ===== IDLE STATE =====
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6" style={{ zIndex: 2 }}>
      {/* Top bar */}
      <div className="absolute top-6 left-8 animate-in">
        <span className="text-xs tracking-[0.25em] uppercase font-medium" style={{ color: 'var(--color-text-dim)' }}>Halo</span>
      </div>
      <div className="absolute top-6 right-8 animate-in flex items-center gap-4">
        <button
          onClick={() => setShowAbout(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        >
          <span className="text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>?</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
          <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Online</span>
        </div>
      </div>

      {/* About popup */}
      {showAbout && (
        <div className="fixed inset-0 flex items-center justify-center p-6" style={{ zIndex: 1000 }}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} onClick={() => setShowAbout(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-8 space-y-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 24px 80px rgba(0,0,0,0.1)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium" style={{ color: 'var(--color-text)' }}>Why Halo?</h2>
              <button onClick={() => setShowAbout(false)} className="text-lg cursor-pointer" style={{ color: 'var(--color-text-dim)' }}>&times;</button>
            </div>
            <div className="space-y-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              <div className="flex gap-3"><span className="text-lg">🌍</span><div><p className="font-medium" style={{ color: 'var(--color-text)' }}>1 in 3 adults feel seriously lonely</p><p className="mt-1">The US Surgeon General declared loneliness a public health crisis. Same health impact as smoking 15 cigarettes a day.</p></div></div>
              <div className="flex gap-3"><span className="text-lg">🌙</span><div><p className="font-medium" style={{ color: 'var(--color-text)' }}>No one to call at 2 AM</p><p className="mt-1">Friends are asleep. Therapy is $200/hour. Sometimes you just need a warm voice.</p></div></div>
              <div className="flex gap-3"><span className="text-lg">🎧</span><div><p className="font-medium" style={{ color: 'var(--color-text)' }}>Voice creates real connection</p><p className="mt-1">Hearing a warm voice triggers oxytocin. It's the closest thing to having someone there.</p></div></div>
              <div className="flex gap-3"><span className="text-lg">💛</span><div><p className="font-medium" style={{ color: 'var(--color-text)' }}>Not a therapist. A friend.</p><p className="mt-1">Halo listens, talks, laughs, and cares — like the friend everyone deserves.</p></div></div>
            </div>
            <div className="pt-2 text-xs" style={{ color: 'var(--color-text-dim)' }}>Powered by ElevenLabs + Cloudflare</div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col items-center gap-4 sm:gap-6 mt-0 sm:-mt-8">
        <div className="relative animate-in float">
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none" className="sm:w-[100px] sm:h-[100px]">
            <defs>
              <linearGradient id="haloGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f6821f" />
                <stop offset="100%" stopColor="#fbad41" />
              </linearGradient>
            </defs>
            <ellipse cx="50" cy="28" rx="28" ry="8" stroke="url(#haloGrad)" strokeWidth="2.5" fill="none" opacity="0.7" />
            <circle cx="50" cy="42" r="14" fill="url(#haloGrad)" opacity="0.15" stroke="url(#haloGrad)" strokeWidth="1.5" />
            <path d="M26 82 C26 65, 38 58, 50 58 C62 58, 74 65, 74 82" fill="url(#haloGrad)" opacity="0.1" stroke="url(#haloGrad)" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="text-center animate-in-delay-1">
          <h1 className="text-4xl sm:text-6xl font-medium tracking-[0.15em] sm:tracking-[0.2em]" style={{ color: '#000000' }}>Halo</h1>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base font-normal tracking-wide" style={{ color: '#292524' }}>A friend who's always here</p>
        </div>

        <p className="max-w-sm text-center text-sm leading-relaxed font-normal animate-in-delay-2" style={{ color: '#57534e' }}>
          No judgment. No advice you didn't ask for. Just a warm voice to talk to whenever you need one.
        </p>

        {sessionError && (
          <p className="max-w-sm text-center text-sm animate-in-delay-2" style={{ color: 'var(--color-danger)' }}>
            {sessionError}
          </p>
        )}

        <button
          className="w-full max-w-md mt-4 py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-medium tracking-wide cursor-pointer transition-all duration-300 animate-in-delay-2"
          style={{
            background: 'linear-gradient(135deg, #f6821f 0%, #e06b10 100%)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 4px 24px rgba(246, 130, 31, 0.3), 0 0 60px rgba(246, 130, 31, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = '0 6px 32px rgba(246, 130, 31, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 24px rgba(246, 130, 31, 0.3)';
          }}
          onClick={handleStartSession}
        >
          Start talking
        </button>

        {/* Wake word status */}
        <div className="flex flex-col items-center gap-2 mt-2 animate-in-delay-3">
          {wakeWordStatus === 'listening' ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs listening-pulse"
              style={{ background: 'var(--color-accent-dim)', border: '1px solid var(--color-accent-light)', color: 'var(--color-accent)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-accent)' }} />
              or say "Hello Halo"
            </div>
          ) : wakeWordStatus === 'heard' ? (
            <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>Heard you! Connecting...</span>
          ) : (
            <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>or say "Hello Halo"</span>
          )}
        </div>
      </div>

      {/* Dashboard link */}
      <div className="absolute bottom-20 text-center animate-in-delay-3">
        <button
          className="px-4 py-2 rounded-full text-xs cursor-pointer transition-all duration-200"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          onClick={() => setShowDashboard(true)}
        >
          Your journey →
        </button>
      </div>

      <div className="absolute bottom-6 text-center animate-in-delay-3">
        <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
          Powered by <span style={{ color: 'var(--color-accent)' }}>ElevenLabs</span> + <span style={{ color: 'var(--color-accent)' }}>Cloudflare</span>
        </p>
      </div>
    </div>
  );
}

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
