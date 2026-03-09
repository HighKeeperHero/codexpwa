import { useEffect, useState } from 'react';

interface Props { onComplete: () => void; }

export function SplashScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState(0);
  // phase 0: mount → 1: lines/glyph → 2: wordmark → 3: subtitle → 4: fade out

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 3200),
      setTimeout(() => onComplete(), 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      onClick={() => { setPhase(4); setTimeout(onComplete, 400); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0B0F1A',          // ← navy bg (new theme)
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        opacity: phase === 4 ? 0 : 1,
        transition: phase === 4 ? 'opacity 0.6s ease' : 'none',
      }}
    >
      <style>{`
        @keyframes lineGrow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes glyphPulse {
          0%   { opacity: 0; transform: scale(0.4) rotate(-45deg); }
          60%  { opacity: 1; transform: scale(1.15) rotate(0deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes wordReveal {
          from { opacity: 0; letter-spacing: 0.6em; filter: blur(8px); }
          to   { opacity: 1; letter-spacing: 0.35em; filter: blur(0); }
        }
        @keyframes subReveal {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes goldGlow {
          0%, 100% { text-shadow: 0 0 20px rgba(255,165,0,0.35); }
          50%       { text-shadow: 0 0 48px rgba(255,165,0,0.7), 0 0 90px rgba(255,165,0,0.25); }
        }
        @keyframes shimmerLine {
          from { background-position: -200% center; }
          to   { background-position:  200% center; }
        }
      `}</style>

      {/* Atmospheric vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.75) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Grain texture */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.02,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
      }}>
        {/* Top ornamental row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28,
          width: 240,
          opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.3s ease',
        }}>
          <div style={{
            flex: 1, height: 1,
            background: 'linear-gradient(90deg, transparent, #FFA500, transparent)',
            transformOrigin: 'left center',
            animation: phase >= 1 ? 'lineGrow 0.8s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
          }} />
          <div style={{
            width: 8, height: 8, background: '#FFA500',
            transform: 'rotate(45deg)', margin: '0 10px',
            animation: phase >= 1 ? 'glyphPulse 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both' : 'none',
            boxShadow: '0 0 14px rgba(255,165,0,0.7)',
          }} />
          <div style={{
            flex: 1, height: 1,
            background: 'linear-gradient(90deg, transparent, #FFA500, transparent)',
            transformOrigin: 'right center',
            animation: phase >= 1 ? 'lineGrow 0.8s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
          }} />
        </div>

        {/* CODEX wordmark */}
        <div style={{
          fontFamily: "'Cinzel', 'Trajan Pro', Georgia, serif",
          fontSize: 'clamp(52px, 14vw, 72px)',
          fontWeight: 700,
          color: '#FFA500',
          letterSpacing: '0.35em', lineHeight: 1,
          animation: phase >= 2
            ? 'wordReveal 0.9s cubic-bezier(0.16,1,0.3,1) forwards, goldGlow 3s ease-in-out 1s infinite'
            : 'none',
          opacity: phase >= 2 ? 1 : 0,
          userSelect: 'none',
        }}>
          CODEX
        </div>

        {/* Subtitle */}
        <div style={{
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: 11, letterSpacing: '0.4em',
          color: 'rgba(255,165,0,0.5)', marginTop: 14,
          animation: phase >= 3 ? 'subReveal 0.7s ease forwards' : 'none',
          opacity: phase >= 3 ? 1 : 0,
          userSelect: 'none',
        }}>
          HEROES' VERITAS
        </div>

        {/* Bottom ornamental row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0, marginTop: 28,
          width: 240,
          opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.3s ease',
        }}>
          <div style={{
            flex: 1, height: 1,
            background: 'linear-gradient(90deg, transparent, #FFA500, transparent)',
            transformOrigin: 'left center',
            animation: phase >= 1 ? 'lineGrow 0.8s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
          }} />
          <div style={{
            width: 8, height: 8, background: '#FFA500',
            transform: 'rotate(45deg)', margin: '0 10px',
            animation: phase >= 1 ? 'glyphPulse 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both' : 'none',
            boxShadow: '0 0 14px rgba(255,165,0,0.7)',
          }} />
          <div style={{
            flex: 1, height: 1,
            background: 'linear-gradient(90deg, transparent, #FFA500, transparent)',
            transformOrigin: 'right center',
            animation: phase >= 1 ? 'lineGrow 0.8s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
          }} />
        </div>

        {/* Tagline */}
        <p style={{
          marginTop: 36,
          fontFamily: 'system-ui, sans-serif',
          fontSize: 11, letterSpacing: '0.15em',
          color: 'rgba(143,168,204,0.45)',    // ← blue-grey to match navy theme
          animation: phase >= 3 ? 'subReveal 1s ease 0.3s both' : 'none',
          opacity: phase >= 3 ? 1 : 0,
          userSelect: 'none',
        }}>
          The official record of your heroic journey
        </p>
      </div>

      {/* Skip hint */}
      {phase >= 3 && (
        <div style={{
          position: 'absolute', bottom: 48,
          fontSize: 9, letterSpacing: '0.2em',
          color: 'rgba(74,94,122,0.7)',        // ← muted navy-blue
          animation: 'subReveal 0.5s ease forwards',
          userSelect: 'none',
        }}>
          TAP TO CONTINUE
        </div>
      )}
    </div>
  );
}
