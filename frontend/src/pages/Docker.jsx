import { useState, useEffect, useCallback } from 'react';
import { Search, Play, Square, RotateCcw, Box, Rocket, Trash2 } from 'lucide-react';
import DataTable from '../components/DataTable';
import DeployModal from '../components/DeployModal';
import useServerStore from '../store/serverStore';
import { getDockerContainers, dockerAction, dockerDeploy, dockerRemove } from '../api/client';

const stateColors = {
    running: { bg: 'rgba(52, 199, 89, 0.12)', text: '#34c759', label: 'Running' },
    exited: { bg: 'rgba(255, 69, 58, 0.12)', text: '#ff453a', label: 'Exited' },
    paused: { bg: 'rgba(255, 159, 10, 0.12)', text: '#ff9f0a', label: 'Paused' },
    created: { bg: 'rgba(142, 142, 147, 0.12)', text: '#8e8e93', label: 'Created' },
};

export default function Docker() {
    const activeServerId = useServerStore((s) => s.activeServerId);
    const [containers, setContainers] = useState([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [showDeploy, setShowDeploy] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(null);

    const fetchContainers = useCallback(async () => {
        if (!activeServerId) return;
        try {
            const res = await getDockerContainers(activeServerId);
            setContainers(res.containers || []);
        } catch (e) {
            console.error('Failed to fetch containers:', e);
        } finally {
            setLoading(false);
        }
    }, [activeServerId]);

    useEffect(() => {
        fetchContainers();
        const interval = setInterval(fetchContainers, 5000);
        return () => clearInterval(interval);
    }, [fetchContainers]);

    const handleAction = async (containerId, action) => {
        setActionLoading(containerId + action);
        try {
            await dockerAction(activeServerId, containerId, action);
            setTimeout(fetchContainers, 1500);
        } catch (e) {
            console.error(`Failed to ${action}:`, e);
        } finally {
            setTimeout(() => setActionLoading(null), 1500);
        }
    };

    const handleDeploy = async (config) => {
        try {
            await dockerDeploy(activeServerId, config);
            setShowDeploy(false);
            setTimeout(fetchContainers, 3000);
        } catch (e) {
            console.error('Deploy failed:', e);
        }
    };

    const handleRemove = async (containerId) => {
        setActionLoading(containerId + 'remove');
        try {
            await dockerRemove(activeServerId, containerId);
            setConfirmRemove(null);
            setTimeout(fetchContainers, 2000);
        } catch (e) {
            console.error('Remove failed:', e);
        } finally {
            setTimeout(() => setActionLoading(null), 2000);
        }
    };

    const filtered = q
        ? containers.filter((c) =>
            c.name.toLowerCase().includes(q.toLowerCase()) ||
            c.image.toLowerCase().includes(q.toLowerCase())
        )
        : containers;

    const columns = [
        {
            key: 'name', label: 'Container', width: '20%',
            render: (v) => <span style={{ fontWeight: 600 }}>{v}</span>,
        },
        { key: 'image', label: 'Image', width: '20%', mono: true },
        {
            key: 'state', label: 'State', width: '10%',
            render: (v) => {
                const s = stateColors[v] || stateColors.created;
                return (
                    <span style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        background: s.bg, color: s.text,
                    }}>
                        {s.label}
                    </span>
                );
            },
        },
        {
            key: 'cpu_percent', label: 'CPU %', width: '8%', align: 'right', mono: true,
            render: (v) => <span style={{ color: v > 50 ? 'var(--color-red)' : 'var(--color-text-secondary)' }}>{v?.toFixed(1)}</span>,
        },
        {
            key: 'memory_usage', label: 'Memory', width: '12%', align: 'right', mono: true,
            render: (v, row) => {
                if (!v) return <span style={{ color: 'var(--color-text-quaternary)' }}>—</span>;
                const mb = (v / 1024 / 1024).toFixed(1);
                const limitMb = row.memory_limit ? (row.memory_limit / 1024 / 1024).toFixed(0) : '—';
                return <span>{mb} / {limitMb} MB</span>;
            },
        },
        {
            key: 'ports', label: 'Ports', width: '10%',
            render: (v) => <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{v || '—'}</span>,
        },
        {
            key: 'container_id', label: 'Actions', width: '20%', align: 'center',
            render: (v, row) => (
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    {row.state !== 'running' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleAction(v, 'start'); }}
                            disabled={actionLoading === v + 'start'}
                            style={actionBtnStyle('#34c759')}
                            title="Start"
                        >
                            <Play size={12} />
                        </button>
                    )}
                    {row.state === 'running' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleAction(v, 'stop'); }}
                            disabled={actionLoading === v + 'stop'}
                            style={actionBtnStyle('#ff453a')}
                            title="Stop"
                        >
                            <Square size={12} />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleAction(v, 'restart'); }}
                        disabled={actionLoading === v + 'restart'}
                        style={actionBtnStyle('#ff9f0a')}
                        title="Restart"
                    >
                        <RotateCcw size={12} />
                    </button>
                    {confirmRemove === v ? (
                        <div style={{ display: 'flex', gap: 3 }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRemove(v); }}
                                disabled={actionLoading === v + 'remove'}
                                style={{
                                    ...actionBtnStyle('#ff453a'),
                                    fontSize: 10, fontWeight: 700, width: 'auto', padding: '0 8px',
                                }}
                            >
                                Remove
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setConfirmRemove(null); }}
                                style={{
                                    ...actionBtnStyle('#8e8e93'),
                                    fontSize: 10, fontWeight: 700, width: 'auto', padding: '0 8px',
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); setConfirmRemove(v); }}
                            style={actionBtnStyle('#ff453a')}
                            title="Remove"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const runningCount = containers.filter((c) => c.state === 'running').length;

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Box size={22} style={{ color: 'var(--color-accent)' }} />
                        Docker
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                        <span className="text-mono" style={{ fontWeight: 700, color: '#34c759' }}>{runningCount}</span>
                        {' '}running · <span className="text-mono" style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>{containers.length}</span> total
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                        onClick={() => setShowDeploy(true)}
                        style={{
                            padding: '8px 16px', borderRadius: 10, border: 'none',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <Rocket size={14} />
                        Deploy Container
                    </button>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: 200,
                        padding: '8px 12px', borderRadius: 10,
                        background: 'var(--color-surface-1)', border: '1px solid var(--color-border-subtle)',
                    }}>
                        <Search size={14} style={{ color: 'var(--color-text-quaternary)', flexShrink: 0 }} />
                        <input
                            type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter containers…"
                            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}
                        />
                    </div>
                </div>
            </div>
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>Loading containers…</div>
            ) : containers.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: 60, borderRadius: 16,
                    background: 'var(--color-surface-1)', border: '1px solid var(--color-border-subtle)',
                }}>
                    <Box size={40} style={{ color: 'var(--color-text-quaternary)', marginBottom: 12 }} />
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-secondary)' }}>No Docker containers found</p>
                    <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>Docker may not be installed, or deploy your first container</p>
                    <button
                        onClick={() => setShowDeploy(true)}
                        style={{
                            marginTop: 16, padding: '10px 20px', borderRadius: 10, border: 'none',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                    >
                        <Rocket size={14} /> Deploy Container
                    </button>
                </div>
            ) : (
                <DataTable columns={columns} data={filtered} emptyMessage="No matching containers" />
            )}

            {showDeploy && (
                <DeployModal onClose={() => setShowDeploy(false)} onDeploy={handleDeploy} />
            )}
        </div>
    );
}

const actionBtnStyle = (color) => ({
    width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `${color}18`, color,
    transition: 'all 0.15s ease',
});
