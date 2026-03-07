import { useState, useEffect } from 'react';

export type AlignmentChoice = 'ORDER' | 'CHAOS' | 'LIGHT' | 'DARK';

interface Props {
  show:       boolean;
  heroName:   string;
  fateLevel:  number;
  onConfirm:  (choice: AlignmentChoice) => void;
  onDismiss:  () => void;
}

const CHOICES: {
  key: AlignmentChoice;
  label: string;
  realm: string;
  icon: string;
  color: string;
  borderColor: string;
  desc: string;
  oath: string;
}[] = [
  {
    key: 'ORDER',
    label: 'Order',
    realm: 'The Realm of Structure',
    icon: '⚖',
    color: '#4A7EC8',
    borderColor: 'rgba(74,126,200,0.5)',
    desc: 'Law, celestial balance, and unyielding discipline. Champions of Order hold the line when all others break.',
    oath: 'I will hold the line.',
  },
  {
    key: 'CHAOS',
    label: 'Chaos',
    realm: 'The Realm of Entropy',
    icon: '🜲',
    color: '#C85E28',
    borderColor: 'rgba(200,94,40,0.5)',
    desc: 'Untamed power, constant change, and the thrill of the unpredictable. Chaos hunters strike first and ask nothing.',
    oath: 'I will break the pattern.',
  },
  {
    key: 'LIGHT',
    label: 'Light',
    realm: 'The Realm of Radiance',
    icon: '☀',
    color: '#C8A04E',
    borderColor: 'rgba(200,160,78,0.5)',
    desc: 'Solar force, truth, and blinding clarity. Light-sworn are drawn to sacred hunts and the exposure of hidden things.',
    oath: 'I will reveal the truth.',
  },
  {
    key: 'DARK',
    label: 'Dark',
    realm: 'The Realm of Shadow',
    icon: '☽',
    color: '#7A5888',
    borderColor: 'rgba(122,88,136,0.5)',
    desc: 'Lunar mystery, hidden knowledge, and the strength found in silence. Dark-sworn walk where others dare not look.',
    oath: 'I will embrace the shadow.',
  },
];

export function AlignmentModal({ show, heroName, fateLevel, onConfirm, onDismiss }: Props) {
  const [selected,  setSelected]  = useState<AlignmentChoice | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [phase, setPhase] = useState<'choose' | 'confirm'>('choose');

  useEffect(() => { if (!show) { setSelected(null); setPhase('choose'); setConfirming(false); } }, [show]);

  if (!show) return null;

  const choice = CHOICES.find(c => c.key === selected);

  const handleConfirm = async () => {
    if (!selected || confirming) return;
    setConfirming(true);
    await new Promise(r => setTimeout(r, 600)); // brief dramatic pause
    onConfirm(selected);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes oathReveal {
          from { opacity: 0; letter-spacing: 0.3em; }
          to   { opacity: 1; letter-spacing: 0.15em; }
        }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(12px)',
      }} />

      {/* Modal */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 440,
        maxHeight: '90dvh', overflowY: 'auto',
        borderRadius: 16,
        background: 'linear-gradient(180deg, #141210 0%, #0B0A08 100%)',
        border: `1px solid ${choice ? choice.borderColor : 'rgba(200,160,78,0.2)'}`,
        boxShadow: choice ? `0 24px 80px rgba(0,0,0,0.8), 0 0 60px ${choice.color}18` : '0 24px 80px rgba(0,0,0,0.8)',
        padding: '28px 22px 22px',
        animation: 'modalIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}>

        {/* Dismiss */}
        <button onClick={onDismiss} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 6, width: 28, height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-3)', fontSize: 12, cursor: 'pointer',
        }}>✕</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="orn-row" style={{ width: 140, margin: '0 auto 16px' }}>
            <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
          </div>
          <h2 className="serif-bold" style={{ fontSize: 22, color: 'var(--text-1)', letterSpacing: '0.05em', marginBottom: 8 }}>
            Choose Your Realm
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7, maxWidth: 300, margin: '0 auto' }}>
            <strong style={{ color: 'var(--gold)' }}>{heroName}</strong> has reached Fate Level{' '}
            <strong style={{ color: 'var(--ember)' }}>{fateLevel}</strong>. Your alignment unlocks
            realm-specific hunts, titles, and the paths ahead.{' '}
            <span style={{ color: 'var(--ember)' }}>This choice is permanent.</span>
          </p>
        </div>

        {/* Realm choices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {CHOICES.map(c => {
            const isSelected = selected === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setSelected(c.key)}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: isSelected ? `${c.color}10` : 'rgba(255,255,255,0.02)',
                  border: `2px solid ${isSelected ? c.borderColor : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  transition: 'all 0.18s ease',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                  background: isSelected ? `${c.color}18` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isSelected ? c.borderColor : 'rgba(255,255,255,0.06)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: isSelected ? c.color : 'var(--text-3)',
                  transition: 'all 0.18s ease',
                }}>
                  {c.icon}
                </div>

                {/* Text */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span className="serif-bold" style={{ fontSize: 15, color: isSelected ? c.color : 'var(--text-1)', transition: 'color 0.18s' }}>
                      {c.label}
                    </span>
                    <span style={{ fontSize: 9, color: isSelected ? `${c.color}88` : 'var(--text-3)', letterSpacing: '0.08em', fontWeight: 600 }}>
                      {c.realm.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>{c.desc}</p>
                </div>

                {/* Radio */}
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  border: `2px solid ${isSelected ? c.color : 'rgba(255,255,255,0.15)'}`,
                  background: isSelected ? c.color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.18s ease',
                }}>
                  {isSelected && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Oath preview */}
        {choice && (
          <div style={{
            padding: '12px 16px', borderRadius: 8, textAlign: 'center', marginBottom: 16,
            background: `${choice.color}08`,
            border: `1px solid ${choice.color}20`,
          }}>
            <p style={{
              fontSize: 13, fontStyle: 'italic', color: choice.color,
              fontFamily: 'var(--font-serif)',
              animation: 'oathReveal 0.5s ease forwards',
            }}>
              "{choice.oath}"
            </p>
          </div>
        )}

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          disabled={!selected || confirming}
          style={{
            width: '100%', padding: '14px',
            borderRadius: 10, border: 'none',
            cursor: selected && !confirming ? 'pointer' : 'not-allowed',
            background: selected && choice
              ? `linear-gradient(135deg, ${choice.color}CC, ${choice.color}88)`
              : 'var(--surface)',
            color: selected ? '#fff' : 'var(--text-3)',
            fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
            fontFamily: 'var(--font-serif)',
            transition: 'all 0.2s ease',
            boxShadow: selected && choice ? `0 4px 20px ${choice.color}30` : 'none',
            opacity: confirming ? 0.7 : 1,
          }}
        >
          {confirming
            ? 'Sealing your fate…'
            : selected && choice
            ? `Pledge to ${choice.label}`
            : 'Select a Realm'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 10, fontSize: 10, color: 'var(--text-3)', opacity: 0.5 }}>
          This choice cannot be changed.
        </p>
      </div>
    </div>
  );
}
