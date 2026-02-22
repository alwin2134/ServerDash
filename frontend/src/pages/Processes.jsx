import { Search, X } from 'lucide-react';
import { useState } from 'react';
import DataTable from '../components/DataTable';
import useServerStore from '../store/serverStore';
import { killProcess } from '../api/client';

export default function Processes() {
    const activeServerId = useServerStore((s) => s.activeServerId);
    const processes = useServerStore((s) => s.processes);
    const list = processes[activeServerId] || [];
    const [q, setQ] = useState('');
    const [confirmPid, setConfirmPid] = useState(null);
    const [killing, setKilling] = useState(null);

    const filtered = q ? list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : list;

    const handleKill = async (pid) => {
        setKilling(pid);
        try {
            await killProcess(activeServerId, pid, 'SIGTERM');
            setConfirmPid(null);
        } catch (e) {
            console.error('Kill failed:', e);
        } finally {
            setTimeout(() => setKilling(null), 2000);
        }
    };

    const columns = [
        { key: 'pid', label: 'PID', width: '8%', align: 'right', mono: true },
        { key: 'name', label: 'Name', width: '30%' },
        {
            key: 'cpu_percent', label: 'CPU %', width: '12%', align: 'right', mono: true,
            render: (v) => {
                const c = v > 50 ? 'var(--color-red)' : v > 20 ? 'var(--color-amber)' : v > 5 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)';
                return <span style={{ color: c, fontWeight: v > 5 ? 700 : 400 }}>{v?.toFixed(1)}</span>;
            },
        },
        {
            key: 'memory_percent', label: 'MEM %', width: '12%', align: 'right', mono: true,
            render: (v) => {
                const c = v > 50 ? 'var(--color-red)' : v > 20 ? 'var(--color-amber)' : v > 5 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)';
                return <span style={{ color: c, fontWeight: v > 5 ? 700 : 400 }}>{v?.toFixed(1)}</span>;
            },
        },
        {
            key: 'status', label: 'State', width: '12%',
            render: (v) => <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{v}</span>,
        },
        {
            key: 'pid', label: '', width: '10%', align: 'center',
            render: (pid, row) => {
                const isConfirming = confirmPid === pid;
                const isKilling = killing === pid;

                if (isKilling) {
                    return (
                        <span style={{ fontSize: 11, color: '#34c759', fontWeight: 600 }}>
                            Sent ✓
                        </span>
                    );
                }

                if (isConfirming) {
                    return (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleKill(pid); }}
                                style={{
                                    padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                    fontSize: 11, fontWeight: 700, background: 'rgba(255,69,58,0.15)', color: '#ff453a',
                                }}
                            >
                                Kill
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setConfirmPid(null); }}
                                style={{
                                    width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)',
                                }}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    );
                }

                return (
                    <button
                        onClick={(e) => { e.stopPropagation(); setConfirmPid(pid); }}
                        style={{
                            padding: '3px 10px', borderRadius: 6, border: '1px solid var(--color-border-subtle)',
                            cursor: 'pointer', fontSize: 11, fontWeight: 600,
                            background: 'transparent', color: 'var(--color-text-tertiary)',
                            transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.target.style.borderColor = '#ff453a'; e.target.style.color = '#ff453a'; }}
                        onMouseLeave={(e) => { e.target.style.borderColor = 'var(--color-border-subtle)'; e.target.style.color = 'var(--color-text-tertiary)'; }}
                    >
                        Stop
                    </button>
                );
            },
        },
    ];

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>Processes</h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                        <span className="text-mono" style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>{list.length}</span>
                        {' '}active · sorted by CPU
                    </p>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: 220,
                    padding: '8px 12px', borderRadius: 10,
                    background: 'var(--color-surface-1)', border: '1px solid var(--color-border-subtle)',
                }}>
                    <Search size={14} style={{ color: 'var(--color-text-quaternary)', flexShrink: 0 }} />
                    <input
                        type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter processes…"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}
                    />
                </div>
            </div>
            <DataTable columns={columns} data={filtered} emptyMessage="Waiting for process data…" />
        </div>
    );
}
