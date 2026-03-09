// src/screens/LandingScreen.tsx
// v2 icon color fixes:
//   - "Create Fate Account" button icon (⚔): color white
//   - "Sign In" button icon (◈): color var(--gold) / #FFA500
import { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';

type Mode = 'choose' | 'login' | 'register';
interface Props { onAuthenticated: () => void; }

export function LandingScreen({ onAuthenticated }: Props) {
  const { loginWithEmail, registerWithEmail } = useAuth();
  const [mode, setMode] = useState<Mode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  const submit = async () => {
    if (!email.trim() || !password.trim()) { setError('Email and password are required'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError(null);
    try {
      if (mode === 'login')    await loginWithEmail(email.trim(), password);
      if (mode === 'register') await registerWithEmail(email.trim(), password);
      onAuthenticated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <style>{`
        @keyframes landIn {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .li { opacity:0; }
        .li.e { animation: landIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
        .auth-input {
          width:100%; padding:14px 16px;
          background:var(--surface); border:1px solid var(--border);
          border-radius:10px; color:var(--text-1); font-size:15px;
          outline:none; transition:border-color 0.2s;
          box-sizing:border-box; font-family:var(--font-body);
        }
        .auth-input:focus { border-color:rgba(255,165,0,0.4); }
        .auth-input::placeholder { color:var(--text-3); }
        .oauth-btn {
          width:100%; padding:14px; border-radius:10px;
          background:var(--surface); border:1px solid var(--border);
          color:var(--text-2); font-size:14px; cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:10px;
          transition:border-color 0.2s;
        }
        .oauth-btn:hover { border-color:rgba(255,165,0,0.25); }
      `}</style>

      {/* Wordmark */}
      <div className={`li ${entered ? 'e' : ''}`} style={{ animationDelay:'0ms', textAlign:'center', marginBottom:36 }}>
        <div className="orn-row" style={{ width:160, margin:'0 auto 16px' }}>
          <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
        </div>
        <h1 className="serif-bold" style={{ fontSize:40, color:'var(--gold)', letterSpacing:'0.35em', marginBottom:6 }}>CODEX</h1>
        <p style={{ fontSize:10, letterSpacing:'0.4em', color:'var(--text-3)', fontFamily:'var(--font-serif)' }}>HEROES' VERITAS</p>
        <div className="orn-row" style={{ width:160, margin:'14px auto 0' }}>
          <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
        </div>
      </div>

      <div className={`li ${entered ? 'e' : ''}`} style={{ animationDelay:'100ms', width:'100%', maxWidth:380 }}>

        {/* ── Mode: choose ─────────────────────────────────── */}
        {mode === 'choose' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

            {/* Create Fate Account */}
            <button
              onClick={() => setMode('register')}
              style={{
                width:'100%', padding:'20px', borderRadius:12, cursor:'pointer', textAlign:'left',
                background:'linear-gradient(135deg,rgba(255,165,0,0.08),rgba(200,94,40,0.03))',
                border:'1px solid rgba(255,165,0,0.25)',
                display:'flex', alignItems:'center', gap:14,
              }}
            >
              <div style={{
                width:44, height:44, borderRadius:10,
                background:'rgba(255,165,0,0.12)', border:'1px solid rgba(255,165,0,0.3)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:20, flexShrink:0,
                /* ← FIXED: Create Fate Account icon is white */
                color: '#FFFFFF',
              }}>⚔</div>
              <div>
                <p style={{ fontSize:15, fontWeight:600, color:'var(--gold)', marginBottom:3, fontFamily:'var(--font-serif)' }}>
                  Create Fate Account
                </p>
                <p style={{ fontSize:12, color:'var(--text-3)' }}>Begin your record in the Codex</p>
              </div>
              <span style={{ marginLeft:'auto', color:'var(--gold)', opacity:0.5, fontSize:18, flexShrink:0 }}>›</span>
            </button>

            {/* Sign In */}
            <button
              onClick={() => setMode('login')}
              style={{
                width:'100%', padding:'20px', borderRadius:12, cursor:'pointer', textAlign:'left',
                background:'var(--surface)', border:'1px solid var(--border)',
                display:'flex', alignItems:'center', gap:14,
              }}
            >
              <div style={{
                width:44, height:44, borderRadius:10,
                background:'rgba(255,165,0,0.08)', border:'1px solid rgba(255,165,0,0.25)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:20, flexShrink:0,
                /* ← FIXED: Sign In icon is gold */
                color: 'var(--gold)',
              }}>◈</div>
              <div>
                <p style={{ fontSize:15, fontWeight:600, color:'var(--text-1)', marginBottom:3, fontFamily:'var(--font-serif)' }}>
                  Sign In
                </p>
                <p style={{ fontSize:12, color:'var(--text-3)' }}>Return to your existing account</p>
              </div>
              <span style={{ marginLeft:'auto', color:'var(--text-3)', opacity:0.5, fontSize:18, flexShrink:0 }}>›</span>
            </button>

          </div>
        )}

        {/* ── Mode: login / register ──────────────────────── */}
        {(mode === 'login' || mode === 'register') && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button
              onClick={() => { setMode('choose'); setError(null); }}
              style={{ background:'none', border:'none', color:'var(--text-3)', fontSize:12, cursor:'pointer', textAlign:'left', padding:'0 0 8px', letterSpacing:'0.05em' }}
            >
              ← Back
            </button>
            <p className="serif-bold" style={{ fontSize:22, color:'var(--text-1)', marginBottom:4 }}>
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </p>
            <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:12, lineHeight:1.5 }}>
              {mode === 'login'
                ? 'Sign in to access your Fate Account and heroes.'
                : 'Your Fate Account holds your identity across all venues.'}
            </p>

            <button className="oauth-btn" onClick={() => alert('Google OAuth coming soon — use email for now')}>
              <span style={{ fontSize:16 }}>G</span>
              <span>Continue with Google</span>
            </button>
            <button className="oauth-btn" onClick={() => alert('Apple Sign In coming soon — use email for now')}>
              <span style={{ fontSize:16 }}></span>
              <span>Continue with Apple</span>
            </button>

            <div style={{ display:'flex', alignItems:'center', gap:10, margin:'4px 0' }}>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
              <span style={{ fontSize:11, color:'var(--text-3)', letterSpacing:'0.06em' }}>OR</span>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
            </div>

            <input className="auth-input" type="email" placeholder="Email address"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              autoCapitalize="none" autoCorrect="off" />
            <input className="auth-input" type="password"
              placeholder={mode === 'register' ? 'Create password (8+ characters)' : 'Password'}
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()} />

            {error && (
              <p style={{ fontSize:12, color:'var(--ember)', padding:'8px 12px', background:'rgba(200,94,40,0.08)', borderRadius:8, border:'1px solid rgba(200,94,40,0.2)' }}>
                {error}
              </p>
            )}

            <button onClick={submit} disabled={loading} style={{
              width:'100%', padding:'15px', borderRadius:10,
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'rgba(255,165,0,0.3)' : 'var(--gold)',
              border:'none', color:'var(--bg)',
              fontSize:14, fontWeight:700, letterSpacing:'0.08em',
              transition:'all 0.2s',
            }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>

            <p style={{ textAlign:'center', fontSize:12, color:'var(--text-3)', marginTop:4 }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
                style={{ background:'none', border:'none', color:'var(--gold)', fontSize:12, cursor:'pointer', padding:0 }}
              >
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`li ${entered ? 'e' : ''}`} style={{ animationDelay:'200ms', marginTop:32, textAlign:'center' }}>
        <p style={{ fontSize:10, color:'var(--text-3)', letterSpacing:'0.05em', opacity:0.5, lineHeight:1.8 }}>
          Your Fate ID is registered with the PIK.<br />
          Each session is permanently recorded.
        </p>
      </div>
    </div>
  );
}
