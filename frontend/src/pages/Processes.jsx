import { Search } from 'lucide-react';
import { useState } from 'react';
import DataTable from '../components/DataTable';
import useServerStore from '../store/serverStore';

const columns = [
    { key: 'pid', label: 'PID', width: '10%', align: 'right', mono: true },
    { key: 'name', label: 'Name', width: '35%' },
    {
        key: 'cpu_percent', label: 'CPU %', width: '15%', align: 'right', mono: true,
        render: (v) => {
            const c = v > 50 ? 'var(--color-red)' : v > 20 ? 'var(--color-amber)' : v > 5 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)';
            return <span style={{ color: c, fontWeight: v > 5 ? 700 : 400 }}>{v?.toFixed(1)}</span>;
        },
    },
    {
        key: 'memory_percent', label: 'MEM %', width: '15%', align: 'right', mono: true,
        render: (v) => {
            const c = v > 50 ? 'var(--color-red)' : v > 20 ? 'var(--color-amber)' : v > 5 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)';
            return <span style={{ color: c, fontWeight: v > 5 ? 700 : 400 }}>{v?.toFixed(1)}</span>;
        },
    },
    {
        key: 'status', label: 'State', width: '15%',
        render: (v) => <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{v}</span>,
    },
];

export default function Processes() {
    const activeServerId = useServerStore((s) => s.activeServerId);
    const processes = useServerStore((s) => s.processes);
    const list = processes[activeServerId] || [];
    const [q, setQ] = useState('');

    const filtered = q ? list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : list;

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
