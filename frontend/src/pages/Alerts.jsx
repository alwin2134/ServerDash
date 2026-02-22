import { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Check, CheckCheck, RefreshCw } from 'lucide-react';
import useServerStore from '../store/serverStore';
import { getAlerts, acknowledgeAlert, acknowledgeAllAlerts } from '../api/client';

export default function Alerts() {
    const activeServerId = useServerStore((s) => s.activeServerId);
    const setUnreadAlertCount = useServerStore((s) => s.setUnreadAlertCount);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        try {
            const data = await getAlerts(activeServerId);
            setAlerts(data);
            setUnreadAlertCount(data.filter((a) => !a.acknowledged).length);
        } catch { /* silent */ }
        setLoading(false);
    }

    useEffect(() => { load(); }, [activeServerId]);

    async function handleAck(id) {
        await acknowledgeAlert(id);
        setAlerts((prev) => {
            const updated = prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a));
            setUnreadAlertCount(updated.filter((a) => !a.acknowledged).length);
            return updated;
        });
    }

    async function handleAckAll() {
        await acknowledgeAllAlerts(activeServerId);
        setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
        setUnreadAlertCount(0);
    }

    const unread = alerts.filter((a) => !a.acknowledged).length;

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
                        Alerts
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                        <span className="text-mono" style={{ fontWeight: 700, color: unread > 0 ? 'var(--color-amber)' : 'var(--color-text-secondary)' }}>{unread}</span>
                        {' '}unread · {alerts.length} total
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <IconBtn icon={RefreshCw} label="Refresh" onClick={load} />
                    {unread > 0 && <IconBtn icon={CheckCheck} label="Ack All" onClick={handleAckAll} accent />}
                </div>
            </div>

            {loading ? (
                <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Loading…</span>
                </div>
            ) : alerts.length === 0 ? (
                <div className="card" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 18,
                        background: 'var(--color-green-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Check size={24} style={{ color: 'var(--color-green)' }} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>All clear</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-quaternary)' }}>No alerts have been triggered</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {alerts.map((a) => (
                        <AlertRow key={a.id} alert={a} onAck={handleAck} />
                    ))}
                </div>
            )}
        </div>
    );
}

function AlertRow({ alert, onAck }) {
    const isCrit = alert.severity === 'critical';
    const Icon = isCrit ? AlertCircle : AlertTriangle;
    const accentColor = isCrit ? 'var(--color-red)' : 'var(--color-amber)';
    const bgColor = isCrit ? 'var(--color-red-muted)' : 'var(--color-amber-muted)';

    const ts = alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

    return (
        <div
            className="card"
            style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px',
                opacity: alert.acknowledged ? 0.45 : 1,
                transition: 'opacity 0.2s',
            }}
        >
            <div style={{
                width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                background: bgColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon size={18} style={{ color: accentColor }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {alert.message}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-quaternary)', marginTop: 2 }}>
                    <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        padding: '2px 6px', borderRadius: 5,
                        background: bgColor, color: accentColor, marginRight: 8,
                    }}>
                        {alert.severity}
                    </span>
                    {ts}
                </div>
            </div>

            {!alert.acknowledged && (
                <button
                    onClick={() => onAck(alert.id)}
                    style={{
                        padding: '6px 12px', borderRadius: 8, border: 'none',
                        background: 'var(--color-surface-3)', color: 'var(--color-text-secondary)',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-4)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface-3)'}
                >
                    Acknowledge
                </button>
            )}
        </div>
    );
}

function IconBtn({ icon: Icon, label, onClick, accent }) {
    return (
        <button
            onClick={onClick}
            title={label}
            style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 10, border: 'none',
                background: accent ? 'var(--color-accent-muted)' : 'var(--color-surface-1)',
                color: accent ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = accent ? 'var(--color-accent-glow)' : 'var(--color-surface-2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = accent ? 'var(--color-accent-muted)' : 'var(--color-surface-1)'}
        >
            <Icon size={14} />
            {label}
        </button>
    );
}
