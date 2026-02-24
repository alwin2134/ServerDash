import React, { useState, useEffect } from 'react';
import { getEvents, getServers } from '../api/client';
import { Activity, AlertTriangle, AlertCircle, Info, RefreshCw, PowerOff, Power } from 'lucide-react';

export default function Timeline() {
    const [events, setEvents] = useState([]);
    const [servers, setServers] = useState([]);
    const [selectedServer, setSelectedServer] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        getServers()
            .then(data => setServers(data.servers || []))
            .catch(err => console.error("Failed to fetch servers", err));
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [selectedServer]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const data = await getEvents(selectedServer || null, 100);
            setEvents(data.events || []);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getIconForEvent = (type) => {
        switch (type) {
            case 'alert_created': return <AlertCircle size={18} color="var(--color-red)" />;
            case 'alert_resolved': return <Activity size={18} color="var(--color-green)" />;
            case 'state_changed': return <RefreshCw size={18} color="var(--color-accent)" />;
            case 'agent_offline': return <PowerOff size={18} color="var(--color-text-tertiary)" />;
            case 'agent_online': return <Power size={18} color="var(--color-green)" />;
            default: return <Info size={18} color="var(--color-text-tertiary)" />;
        }
    };

    const getSeverityStyles = (severity) => {
        switch (severity) {
            case 'critical':
                return { border: '1px solid var(--color-red-muted)', background: 'rgba(255, 69, 58, 0.05)' };
            case 'warning':
                return { border: '1px solid var(--color-amber-muted)', background: 'rgba(255, 214, 10, 0.05)' };
            default:
                return {};
        }
    };

    const getServerName = (id) => {
        const s = servers.find(svr => svr.id === id);
        return s ? s.hostname : (id || 'System');
    };

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 860, margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
                        Timeline
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                        Chronological history of operational events across your infrastructure.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <select
                        style={{
                            background: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border-default)',
                            color: 'var(--color-text-primary)',
                            fontSize: 13,
                            borderRadius: 10,
                            padding: '8px 12px',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                        value={selectedServer}
                        onChange={e => setSelectedServer(e.target.value)}
                    >
                        <option value="">All Servers</option>
                        {servers.map(s => (
                            <option key={s.id} value={s.id}>{s.hostname}</option>
                        ))}
                    </select>

                    <button
                        onClick={fetchEvents}
                        disabled={loading}
                        style={{
                            padding: '8px 12px',
                            background: 'var(--color-surface-2)',
                            color: 'var(--color-text-primary)',
                            borderRadius: 10,
                            border: '1px solid var(--color-border-default)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: loading ? 'default' : 'pointer',
                            opacity: loading ? 0.5 : 1,
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'var(--color-surface-3)')}
                        onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'var(--color-surface-2)')}
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? 'pulse-live' : ''} />
                    </button>
                </div>
            </header>

            {error && (
                <div style={{
                    background: 'var(--color-red-muted)',
                    border: '1px solid var(--color-red)',
                    color: 'var(--color-red)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <AlertCircle size={18} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{error}</span>
                    </div>
                </div>
            )}

            {loading && events.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                    <RefreshCw size={24} style={{ color: 'var(--color-accent)', animation: 'spin 1s linear infinite' }} className="pulse-live" />
                </div>
            ) : events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                    No operational events logged yet.
                </div>
            ) : (
                <div style={{ position: 'relative', marginLeft: 16, borderLeft: '1px solid var(--color-border-subtle)', paddingLeft: 32, paddingBottom: 20, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {events.map((evt, idx) => (
                        <div key={evt.id || idx} style={{ position: 'relative' }}>
                            {/* Horizontal connector line */}
                            <div style={{
                                position: 'absolute',
                                left: -32,
                                top: 20,
                                width: 32,
                                height: 1,
                                background: 'var(--color-border-subtle)',
                                zIndex: 0
                            }}></div>

                            {/* Icon Marker */}
                            <div style={{
                                position: 'absolute',
                                left: -32,
                                top: 20,
                                transform: 'translate(-50%, -50%)',
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: 'var(--color-surface-1)',
                                border: '1px solid var(--color-border-default)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10,
                                boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
                            }}>
                                {getIconForEvent(evt.event_type)}
                            </div>

                            <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, ...getSeverityStyles(evt.severity) }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                                            {evt.message}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{
                                                fontSize: 11,
                                                padding: '2px 8px',
                                                borderRadius: 6,
                                                background: 'var(--color-surface-2)',
                                                border: '1px solid var(--color-border-subtle)',
                                                color: 'var(--color-text-secondary)',
                                                fontFamily: 'monospace'
                                            }}>
                                                {getServerName(evt.server_id)}
                                            </span>
                                            <span style={{
                                                fontSize: 11,
                                                padding: '2px 8px',
                                                borderRadius: 6,
                                                background: 'var(--color-surface-2)',
                                                border: '1px solid var(--color-border-subtle)',
                                                color: 'var(--color-text-secondary)',
                                                fontFamily: 'monospace'
                                            }}>
                                                {evt.event_type}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-quaternary)', whiteSpace: 'nowrap', fontWeight: 500 }}>
                                        {new Date(evt.timestamp).toLocaleString()}
                                    </div>
                                </div>
                                {evt.metadata && (
                                    <div style={{
                                        marginTop: 4,
                                        fontSize: 11,
                                        fontFamily: 'monospace',
                                        color: 'var(--color-text-tertiary)',
                                        background: 'rgba(0,0,0,0.4)',
                                        padding: '8px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--color-border-subtle)',
                                        overflowX: 'auto'
                                    }}>
                                        {evt.metadata}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
