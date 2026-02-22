import { useState, useEffect } from 'react';
import { Construction, Palette, Bell, Shield, Users, Trash2, Monitor, Wifi, WifiOff } from 'lucide-react';
import useServerStore from '../store/serverStore';
import { getServers, deleteServer } from '../api/client';

const futureItems = [
    { icon: Palette, label: 'Appearance', desc: 'Theme, layout density, dashboard customization' },
    { icon: Bell, label: 'Notifications', desc: 'Alert rules, channels, severity thresholds' },
];

export default function Settings() {
    const servers = useServerStore((s) => s.servers);
    const setServers = useServerStore((s) => s.setServers);
    const token = useServerStore((s) => s.token);
    const setToken = useServerStore((s) => s.setToken);
    const [deleting, setDeleting] = useState(null);

    useEffect(() => {
        getServers().then(setServers).catch(() => { });
    }, []);

    async function handleDelete(id) {
        if (!confirm('Remove this server and all its data?')) return;
        setDeleting(id);
        try {
            await deleteServer(id);
            const updated = await getServers();
            setServers(updated);
        } catch { /* silent */ }
        setDeleting(null);
    }

    function handleLogout() {
        setToken(null);
        window.location.href = '/login';
    }

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>Settings</h1>
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>Configuration & agent management</p>
            </div>

            {/* ── Connected Agents ─────────────────────────────── */}
            <Section title="Connected Agents" count={servers.length}>
                {servers.length > 0 ? servers.map((s) => (
                    <div
                        key={s.id}
                        className="card"
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', marginBottom: 8 }}
                    >
                        <div style={{
                            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                            background: s.status === 'online' ? 'var(--color-green-muted)' : 'var(--color-surface-3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {s.status === 'online' ? (
                                <Wifi size={18} style={{ color: 'var(--color-green)' }} />
                            ) : (
                                <WifiOff size={18} style={{ color: 'var(--color-text-quaternary)' }} />
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-text-primary)' }}>
                                {s.hostname}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-quaternary)', marginTop: 2 }}>
                                {s.ip_address || 'Unknown IP'} · {s.os_info || 'Unknown OS'} · v{s.agent_version}
                            </div>
                        </div>

                        {/* Health badge */}
                        {s.health_state && s.health_state !== 'unknown' && (
                            <span style={{
                                fontSize: 10, fontWeight: 700, textTransform: 'capitalize',
                                padding: '3px 8px', borderRadius: 6,
                                background: s.health_state === 'healthy' ? 'var(--color-green-muted)' :
                                    s.health_state === 'warning' ? 'var(--color-amber-muted)' : 'var(--color-red-muted)',
                                color: s.health_state === 'healthy' ? 'var(--color-green)' :
                                    s.health_state === 'warning' ? 'var(--color-amber)' : 'var(--color-red)',
                            }}>
                                {s.health_state}
                            </span>
                        )}

                        <button
                            onClick={() => handleDelete(s.id)}
                            disabled={deleting === s.id}
                            style={{
                                padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: 'var(--color-surface-3)', color: 'var(--color-text-tertiary)',
                                transition: 'all 0.15s',
                                opacity: deleting === s.id ? 0.4 : 1,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-red-muted)'; e.currentTarget.style.color = 'var(--color-red)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )) : (
                    <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--color-text-quaternary)' }}>No agents connected</span>
                    </div>
                )}
            </Section>

            {/* ── Session ──────────────────────────────────────── */}
            <Section title="Session">
                <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Signed In</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-quaternary)', marginTop: 2 }}>
                            Token: {token ? `${token.slice(0, 12)}…${token.slice(-6)}` : 'None'}
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'var(--color-red-muted)', color: 'var(--color-red)',
                            fontSize: 12, fontWeight: 650, transition: 'all 0.15s',
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </Section>

            {/* ── Coming Soon ──────────────────────────────────── */}
            <Section title="Coming Soon">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {futureItems.map(({ icon: Icon, label, desc }) => (
                        <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', opacity: 0.4 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                                background: 'var(--color-surface-3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Icon size={18} style={{ color: 'var(--color-text-tertiary)' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--color-text-secondary)' }}>{label}</div>
                                <div style={{ fontSize: 11, color: 'var(--color-text-quaternary)', marginTop: 2 }}>{desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>
        </div>
    );
}

function Section({ title, count, children }) {
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-secondary)' }}>{title}</span>
                {count != null && (
                    <span className="text-mono" style={{
                        fontSize: 11, fontWeight: 700, color: 'var(--color-text-quaternary)',
                        background: 'var(--color-surface-3)', padding: '2px 8px', borderRadius: 6,
                    }}>
                        {count}
                    </span>
                )}
            </div>
            {children}
        </div>
    );
}
