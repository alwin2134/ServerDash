import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';
import useServerStore from '../store/serverStore';

export default function Login() {
    const navigate = useNavigate();
    const setToken = useServerStore((s) => s.setToken);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { access_token } = await login(username, password);
            setToken(access_token);
            navigate('/overview');
        } catch {
            setError('Invalid username or password');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-bg)',
            fontFamily: 'var(--font-sans)',
        }}>
            <div className="slide-in" style={{
                width: 400, padding: 44,
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 24,
                boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                    }}>
                        <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
                            <rect x="1" y="1" width="6.5" height="6.5" rx="2" fill="white" fillOpacity="0.9" />
                            <rect x="10.5" y="1" width="6.5" height="6.5" rx="2" fill="white" fillOpacity="0.5" />
                            <rect x="1" y="10.5" width="6.5" height="6.5" rx="2" fill="white" fillOpacity="0.5" />
                            <rect x="10.5" y="10.5" width="6.5" height="6.5" rx="2" fill="white" fillOpacity="0.25" />
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
                            ServerDash
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-quaternary)', fontWeight: 500 }}>
                            Command Center
                        </div>
                    </div>
                </div>

                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                    Sign in
                </h2>
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 28 }}>
                    Enter your credentials to access the dashboard
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <InputField label="Username" value={username} onChange={setUsername} autoFocus />
                    <InputField label="Password" type="password" value={password} onChange={setPassword} />

                    {error && (
                        <div style={{
                            padding: '10px 14px', borderRadius: 10,
                            background: 'var(--color-red-muted)', color: 'var(--color-red)',
                            fontSize: 12, fontWeight: 600,
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !username || !password}
                        style={{
                            marginTop: 8, padding: '13px 0', borderRadius: 12, border: 'none',
                            background: loading ? 'var(--color-surface-3)' : 'linear-gradient(135deg, var(--color-accent), var(--color-purple))',
                            color: 'white', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: (!username || !password) ? 0.5 : 1,
                            boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.25)',
                        }}
                    >
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-quaternary)' }}>
                        Default: admin / serverdash
                    </span>
                </div>
            </div>
        </div>
    );
}

function InputField({ label, type = 'text', value, onChange, autoFocus }) {
    return (
        <div>
            <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: 'var(--color-text-tertiary)', marginBottom: 6,
            }}>
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoFocus={autoFocus}
                style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10,
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border-default)',
                    color: 'var(--color-text-primary)',
                    fontSize: 14, fontWeight: 500,
                    outline: 'none', transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border-default)'}
            />
        </div>
    );
}
