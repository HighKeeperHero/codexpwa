// src/screens/ShareFateCard.tsx
// Updated for v2 theme: navy bg, brand golden orange #FFA500
// FATE XP stat value now uses gold instead of ember (was reading as negative)
import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/AuthContext';
import { TIER_FOR_LEVEL, ALIGNMENT_COLOR, ALIGNMENT_LABEL } from '@/api/pik';

const W = 1080;
const H = 1920;

const ALIGN_GLYPH: Record<string, string> = {
  ORDER: '⚖', CHAOS: '🜲', LIGHT: '☀', DARK: '☽', NONE: '◇', '': '◇',
};

// ── Updated palette (v2 theme) ──────────────────────────────
const BG_DARK     = '#0B0F1A';          // navy bg
const BG_MID      = '#141E30';          // navy surface
const CREAM       = '#F0EDE6';          // brighter text-1
const CREAM_DIM   = 'rgba(240,237,230,0.50)';
const CREAM_FAINT = 'rgba(240,237,230,0.18)';

export function ShareFateCard({ onClose }: { onClose: () => void }) {
  const { hero } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontsOk, setFontsOk] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        await document.fonts.ready;
        const probe = document.createElement('span');
        probe.style.cssText = 'font-family:Cinzel,serif;position:absolute;visibility:hidden;font-size:1px';
        probe.textContent = 'A';
        document.body.appendChild(probe);
        await new Promise(r => setTimeout(r, 100));
        document.body.removeChild(probe);
        setFontsOk(true);
      } catch { setFontsOk(true); }
    };
    load();
  }, []);

  useEffect(() => {
    if (!fontsOk || !hero || !canvasRef.current) return;
    drawCard(canvasRef.current, hero);
    setReady(true);
  }, [fontsOk, hero]);

  const handleShare = useCallback(async () => {
    if (!canvasRef.current || !hero) return;
    setSharing(true); setError(null);
    try {
      const blob = await new Promise<Blob>((res, rej) =>
        canvasRef.current!.toBlob(b => b ? res(b) : rej(new Error('Canvas export failed')), 'image/png')
      );
      const file = new File([blob], `fate-card-${hero.display_name ?? 'hero'}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${hero.display_name} — Fate Record`,
          text: `My Fate ID is recorded in the Codex. Heroes' Veritas. #PIK #FateRecord`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = file.name; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError('Could not share. Try downloading instead.');
    } finally { setSharing(false); }
  }, [hero]);

  const handleDownload = useCallback(async () => {
    if (!canvasRef.current || !hero) return;
    const blob = await new Promise<Blob>((res, rej) =>
      canvasRef.current!.toBlob(b => b ? res(b) : rej(), 'image/png')
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `fate-card-${hero.display_name ?? 'hero'}.png`; a.click();
    URL.revokeObjectURL(url);
  }, [hero]);

  if (!hero) return null;
  const ac = ALIGNMENT_COLOR[hero.alignment] ?? '#FFA500';

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%', maxWidth: 360, animation: 'slideUp 0.3s ease' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.25em', color: CREAM_DIM, textTransform: 'uppercase', marginBottom: 4 }}>
            Fate Card
          </p>
          <p style={{ fontSize: 11, color: 'rgba(240,237,230,0.25)' }}>Share your identity with the world</p>
        </div>

        {/* Card preview */}
        <div style={{
          position: 'relative', borderRadius: 16, overflow: 'hidden',
          boxShadow: ready
            ? `0 0 0 1px ${ac}40, 0 0 40px ${ac}20, 0 24px 48px rgba(0,0,0,0.6)`
            : '0 0 0 1px rgba(240,237,230,0.1)',
          transition: 'box-shadow 0.6s ease',
          width: '100%', maxWidth: 300, aspectRatio: '9/16',
          background: BG_DARK,
        }}>
          <canvas ref={canvasRef} width={W} height={H}
            style={{ width: '100%', height: '100%', display: 'block', opacity: ready ? 1 : 0, transition: 'opacity 0.4s ease' }} />
          {!ready && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ fontSize: 24, color: ac, opacity: 0.6 }}>◈</div>
              <p style={{ fontSize: 10, color: CREAM_DIM, letterSpacing: '0.2em', fontFamily: 'Cinzel, serif' }}>INSCRIBING…</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button onClick={handleShare} disabled={!ready || sharing} style={{
            flex: 2, padding: '14px 0',
            background: ready ? ac : 'rgba(255,165,0,0.2)',
            color: ready ? '#0B0F1A' : CREAM_DIM,
            border: 'none', borderRadius: 10,
            fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: ready ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            {sharing ? '…' : '↑ Share'}
          </button>
          <button onClick={handleDownload} disabled={!ready} style={{
            flex: 1, padding: '14px 0',
            background: 'rgba(240,237,230,0.06)',
            color: ready ? CREAM : CREAM_DIM,
            border: `1px solid rgba(240,237,230,0.15)`,
            borderRadius: 10,
            fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: ready ? 'pointer' : 'not-allowed',
          }}>
            Save
          </button>
        </div>

        {error && <p style={{ fontSize: 11, color: '#f87171', textAlign: 'center' }}>{error}</p>}

        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'rgba(240,237,230,0.3)',
          fontSize: 11, fontFamily: 'Cinzel, serif', letterSpacing: '0.1em', cursor: 'pointer', padding: '4px 0',
        }}>
          Close
        </button>
      </div>
    </div>,
    document.body
  );
}

// ── Canvas drawing engine ───────────────────────────────────
function drawCard(canvas: HTMLCanvasElement, hero: any) {
  const ctx = canvas.getContext('2d')!;
  const w = W; const h = H;
  const alignment = hero.alignment ?? 'NONE';
  const ac = ALIGNMENT_COLOR[alignment] ?? '#FFA500';
  const tier = TIER_FOR_LEVEL(hero.progression?.fate_level ?? 1);
  const narrative = hero.narrative;
  const prog = hero.progression;
  const name = hero.display_name ?? hero.hero_name ?? 'Unknown';
  const titleEntry = prog?.titles?.find((t: any) => t.title_id === prog.equipped_title)
    ?? (prog?.titles?.length > 0 ? prog.titles[0] : null);
  const equippedTitleText = titleEntry?.title_name
    ?? prog?.equipped_title?.replace(/^title_/,'').replace(/_/g,' ').toUpperCase()
    ?? null;
  const rootId = hero.root_id ?? '';
  const level = prog?.fate_level ?? 1;
  const xp = prog?.total_xp ?? 0;
  const sessions = prog?.sessions_completed ?? 0;
  const gearCount = (hero.gear?.inventory ?? []).length;
  const titleCount = (prog?.titles ?? []).length;

  // ── Background ────────────────────────────────────────────
  ctx.fillStyle = BG_DARK;
  ctx.fillRect(0, 0, w, h);

  // Alignment radial wash
  const vignette = ctx.createRadialGradient(w/2, h*0.35, 0, w/2, h*0.35, w * 1.2);
  vignette.addColorStop(0, `${ac}14`);
  vignette.addColorStop(0.5, `${ac}07`);
  vignette.addColorStop(1, 'transparent');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);

  // Bottom dark fade
  const bottomFade = ctx.createLinearGradient(0, h * 0.7, 0, h);
  bottomFade.addColorStop(0, 'transparent');
  bottomFade.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = bottomFade; ctx.fillRect(0, 0, w, h);

  // Noise dots
  ctx.save(); ctx.globalAlpha = 0.015;
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * w; const y = Math.random() * h;
    ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();

  // Top accent bar
  const topBar = ctx.createLinearGradient(0, 0, w, 0);
  topBar.addColorStop(0, 'transparent');
  topBar.addColorStop(0.2, `${ac}20`);
  topBar.addColorStop(0.5, `${ac}35`);
  topBar.addColorStop(0.8, `${ac}20`);
  topBar.addColorStop(1, 'transparent');
  ctx.fillStyle = topBar; ctx.fillRect(0, 0, w, 6);

  // ── TOP ORNAMENT ──────────────────────────────────────────
  const ornY = 110;
  drawOrnamentalRow(ctx, w/2, ornY, ac, 320);

  ctx.save(); ctx.globalAlpha = 0.5;
  ctx.fillStyle = CREAM; ctx.font = `600 28px 'Cinzel', serif`;
  ctx.textAlign = 'center'; ctx.letterSpacing = '12px';
  ctx.fillText('FATE RECORD', w/2, ornY + 60);
  ctx.restore();

  ctx.fillStyle = `${ac}90`; ctx.font = `400 22px 'Cinzel', serif`;
  ctx.textAlign = 'center'; ctx.letterSpacing = '6px';
  ctx.fillText('HEROES\' VERITAS · PIK', w/2, ornY + 96);

  // ── ALIGNMENT GLYPH ───────────────────────────────────────
  const glyphY = ornY + 230;
  const glyph = ALIGN_GLYPH[alignment] ?? '◇';

  ctx.save();
  const glowGrad = ctx.createRadialGradient(w/2, glyphY, 0, w/2, glyphY, 180);
  glowGrad.addColorStop(0, `${ac}32`); glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad; ctx.fillRect(w/2 - 180, glyphY - 180, 360, 360);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = `${ac}45`; ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 8]);
  ctx.beginPath(); ctx.arc(w/2, glyphY, 120, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = `${ac}28`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(w/2, glyphY, 100, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  ctx.fillStyle = ac; ctx.font = `400 148px 'Cinzel', serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(glyph, w/2, glyphY);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = `${ac}CC`; ctx.font = `600 24px 'Cinzel', serif`;
  ctx.textAlign = 'center'; ctx.letterSpacing = '8px';
  ctx.fillText(ALIGNMENT_LABEL[alignment] ?? alignment, w/2, glyphY + 140);

  // ── HERO NAME ─────────────────────────────────────────────
  const nameY = glyphY + 220;
  const maxNameW = w - 120;
  let nameFontSize = 112;
  ctx.font = `700 ${nameFontSize}px 'Cinzel', serif`;
  while (ctx.measureText(name).width > maxNameW && nameFontSize > 48) {
    nameFontSize -= 4; ctx.font = `700 ${nameFontSize}px 'Cinzel', serif`;
  }
  ctx.fillStyle = CREAM; ctx.textAlign = 'center'; ctx.letterSpacing = '4px';
  ctx.fillText(name, w/2, nameY);

  if (equippedTitleText) {
    ctx.fillStyle = `${ac}CC`; ctx.font = `400 italic 30px 'Cinzel', serif`;
    ctx.textAlign = 'center'; ctx.letterSpacing = '3px';
    ctx.fillText(equippedTitleText.toUpperCase(), w/2, nameY + 52);
  }

  // ── NARRATIVE TAGLINE ─────────────────────────────────────
  const taglineY = nameY + (equippedTitleText ? 130 : 90);
  if (narrative) {
    ctx.fillStyle = CREAM_DIM; ctx.font = `600 28px 'Cinzel', serif`;
    ctx.textAlign = 'center'; ctx.letterSpacing = '4px';
    ctx.fillText(`${narrative.class} · ${narrative.region}`, w/2, taglineY);
    ctx.fillStyle = `rgba(240,237,230,0.38)`; ctx.font = `400 italic 26px Georgia, serif`;
    ctx.textAlign = 'center'; ctx.letterSpacing = '1px';
    wrapText(ctx, `"${narrative.calling}"`, w/2, taglineY + 54, w - 160, 38);
  }

  // ── DIVIDER ───────────────────────────────────────────────
  const divY = taglineY + (narrative ? 160 : 80);
  drawDivider(ctx, w/2, divY, ac, 560);

  // ── TIER + LEVEL BLOCK ────────────────────────────────────
  const tierY = divY + 80;
  const tierBoxW = 280; const tierBoxH = 110;
  const tierBoxX = w/2 - tierBoxW/2; const tierBoxY = tierY - tierBoxH/2;

  const tierBg = ctx.createLinearGradient(tierBoxX, tierBoxY, tierBoxX + tierBoxW, tierBoxY + tierBoxH);
  tierBg.addColorStop(0, `${tier.color}1A`); tierBg.addColorStop(1, `${tier.color}0A`);
  ctx.fillStyle = tierBg; roundRect(ctx, tierBoxX, tierBoxY, tierBoxW, tierBoxH, 16); ctx.fill();
  ctx.strokeStyle = `${tier.color}55`; ctx.lineWidth = 1.5;
  roundRect(ctx, tierBoxX, tierBoxY, tierBoxW, tierBoxH, 16); ctx.stroke();

  ctx.fillStyle = tier.color; ctx.font = `600 20px 'Cinzel', serif`;
  ctx.textAlign = 'center'; ctx.letterSpacing = '5px';
  ctx.fillText(tier.name.toUpperCase(), w/2, tierY - 14);
  ctx.font = `700 56px 'Cinzel', serif`; ctx.letterSpacing = '2px';
  ctx.fillText(`LV ${level}`, w/2, tierY + 40);

  // ── XP PROGRESS BAR ───────────────────────────────────────
  const barY = tierY + 100;
  const barW = w - 200; const barH = 8; const barX = 100;
  const xpPct = Math.min(1, (prog?.xp_in_current_level ?? 0) / Math.max(1, prog?.xp_to_next_level ?? 500));

  ctx.fillStyle = 'rgba(240,237,230,0.08)'; roundRect(ctx, barX, barY, barW, barH, 4); ctx.fill();
  if (xpPct > 0) {
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    fillGrad.addColorStop(0, `${tier.color}80`); fillGrad.addColorStop(1, tier.color);
    ctx.fillStyle = fillGrad; roundRect(ctx, barX, barY, barW * xpPct, barH, 4); ctx.fill();
  }
  ctx.fillStyle = CREAM_FAINT; ctx.font = `400 22px monospace`;
  ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
  ctx.fillText(`${(prog?.xp_in_current_level ?? 0).toLocaleString()} XP`, barX, barY + 36);
  ctx.textAlign = 'right';
  ctx.fillText(`${(prog?.xp_to_next_level ?? 0).toLocaleString()} to next`, barX + barW, barY + 36);

  // ── VIRTUE / VICE ─────────────────────────────────────────
  const virtY = barY + 110;
  if (narrative) {
    const leftX = w/2 - 130; const rightX = w/2 + 130;
    ctx.fillStyle = '#6A8A5A'; ctx.font = `600 20px 'Cinzel', serif`;
    ctx.textAlign = 'center'; ctx.letterSpacing = '4px';
    ctx.fillText('VIRTUE', leftX, virtY);
    ctx.fillStyle = CREAM_DIM; ctx.font = `400 24px 'Cinzel', serif`; ctx.letterSpacing = '2px';
    ctx.fillText(narrative.virtue, leftX, virtY + 36);
    ctx.fillStyle = CREAM_FAINT; ctx.font = `400 28px 'Cinzel', serif`;
    ctx.textAlign = 'center'; ctx.fillText('·', w/2, virtY + 36);
    ctx.fillStyle = 'rgba(232,98,26,0.85)'; ctx.font = `600 20px 'Cinzel', serif`;
    ctx.textAlign = 'center'; ctx.letterSpacing = '4px'; ctx.fillText('VICE', rightX, virtY);
    ctx.fillStyle = CREAM_DIM; ctx.font = `400 24px 'Cinzel', serif`; ctx.letterSpacing = '2px';
    ctx.fillText(narrative.vice, rightX, virtY + 36);
  }

  // ── SECOND DIVIDER ────────────────────────────────────────
  const div2Y = virtY + 110;
  drawDivider(ctx, w/2, div2Y, ac, 560);

  // ── STAT ROW ─────────────────────────────────────────────
  const statY = div2Y + 90;
  const stats = [
    { label: 'SESSIONS', value: String(sessions) },
    { label: 'GEAR',     value: String(gearCount) },
    { label: 'TITLES',   value: String(titleCount) },
    // FATE XP: use gold (#FFA500) — NOT ember — so it reads as positive
    { label: 'FATE XP',  value: xp >= 1000 ? `${(xp/1000).toFixed(1)}K` : String(xp), accent: true },
  ];
  const statColW = w / stats.length;
  stats.forEach((s, i) => {
    const sx = statColW * i + statColW / 2;
    if (i > 0) {
      ctx.strokeStyle = 'rgba(240,237,230,0.10)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(statColW * i, statY - 40); ctx.lineTo(statColW * i, statY + 60); ctx.stroke();
    }
    // ← FIXED: was ember/red, now golden orange for FATE XP
    ctx.fillStyle = s.accent ? '#FFA500' : CREAM;
    ctx.font = `700 52px 'Cinzel', serif`; ctx.textAlign = 'center'; ctx.letterSpacing = '1px';
    ctx.fillText(s.value, sx, statY);
    ctx.fillStyle = CREAM_FAINT; ctx.font = `600 18px 'Cinzel', serif`;
    ctx.textAlign = 'center'; ctx.letterSpacing = '4px';
    ctx.fillText(s.label, sx, statY + 40);
  });

  // ── FATE MARKERS ─────────────────────────────────────────
  const markerY = statY + 140;
  const markers = (prog?.fate_markers ?? []).slice(0, 2);
  if (markers.length > 0) {
    drawDivider(ctx, w/2, markerY - 30, ac, 400);
    ctx.fillStyle = CREAM_FAINT; ctx.font = `600 18px 'Cinzel', serif`;
    ctx.textAlign = 'center'; ctx.letterSpacing = '5px';
    ctx.fillText('FATE MARKERS', w/2, markerY + 16);
    markers.forEach((m: string, i: number) => {
      ctx.fillStyle = `rgba(240,237,230,0.38)`;
      ctx.font = `400 italic 22px Georgia, serif`; ctx.textAlign = 'center'; ctx.letterSpacing = '0.5px';
      wrapText(ctx, `"${m}"`, w/2, markerY + 60 + i * 68, w - 160, 30);
    });
  }

  // ── BOTTOM ORNAMENT + FATE ID ─────────────────────────────
  const bottomOrnY = h - 180;
  drawOrnamentalRow(ctx, w/2, bottomOrnY, ac, 400);
  ctx.fillStyle = CREAM_FAINT; ctx.font = `400 20px monospace`;
  ctx.textAlign = 'center'; ctx.letterSpacing = '3px';
  const shortId = rootId.length > 20 ? rootId.slice(0, 20) + '…' : rootId;
  ctx.fillText(`FATE ID: ${shortId}`, w/2, bottomOrnY + 48);

  ctx.fillStyle = `${ac}55`; ctx.font = `600 18px 'Cinzel', serif`;
  ctx.textAlign = 'center'; ctx.letterSpacing = '6px';
  ctx.fillText('PIK · PERSISTENT IDENTITY KERNEL', w/2, h - 52);

  const bottomBar = ctx.createLinearGradient(0, 0, w, 0);
  bottomBar.addColorStop(0, 'transparent');
  bottomBar.addColorStop(0.2, `${ac}28`);
  bottomBar.addColorStop(0.5, `${ac}45`);
  bottomBar.addColorStop(0.8, `${ac}28`);
  bottomBar.addColorStop(1, 'transparent');
  ctx.fillStyle = bottomBar; ctx.fillRect(0, h - 8, w, 8);
}

// ── Helpers ─────────────────────────────────────────────────
function drawOrnamentalRow(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, spread: number) {
  const hw = spread / 2;
  ctx.strokeStyle = `${color}42`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - hw, cy); ctx.lineTo(cx - 44, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 44, cy); ctx.lineTo(cx + hw, cy); ctx.stroke();
  [[cx - hw, cy], [cx + hw, cy]].forEach(([x, y]) => {
    ctx.fillStyle = `${color}52`; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-5, -5, 10, 10); ctx.restore();
  });
  ctx.fillStyle = color; ctx.font = `400 40px 'Cinzel', serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('◈', cx, cy); ctx.textBaseline = 'alphabetic';
}

function drawDivider(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, width: number) {
  const hw = width / 2;
  const grad = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
  grad.addColorStop(0, 'transparent'); grad.addColorStop(0.3, `${color}32`);
  grad.addColorStop(0.5, `${color}55`); grad.addColorStop(0.7, `${color}32`); grad.addColorStop(1, 'transparent');
  ctx.strokeStyle = grad; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - hw, cy); ctx.lineTo(cx + hw, cy); ctx.stroke();
  ctx.fillStyle = `${color}62`; ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
  ctx.fillRect(-4, -4, 8, 8); ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' '); let line = ''; let lineY = y;
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, lineY); line = words[i] + ' '; lineY += lineHeight;
    } else { line = testLine; }
  }
  ctx.fillText(line.trim(), x, lineY);
}
