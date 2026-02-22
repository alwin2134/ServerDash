import { Search } from 'lucide-react';
import { useState } from 'react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import useServerStore from '../store/serverStore';

const columns = [
    { key: 'name', label: 'Service', width: '28%' },
    { key: 'display_name', label: 'Display Name', width: '28%' },
    { key: 'status', label: 'Status', width: '14%', render: (v) => <StatusBadge status={v} /> },
    {
        key: 'enabled', label: 'Auto Start', width: '12%',
        render: (v) => (
            <span style={{ fontSize: 12, fontWeight: 600, color: v ? 'var(--color-green)' : 'var(--color-text-quaternary)' }}>
                {v ? 'On' : 'Off'}
            </span>
        ),
    },
    {
        key: 'action', label: '', width: '14%', sortable: false, align: 'right',
        render: (_, row) => {
            if (row.status === 'running') return <ActionBtn label="Restart" variant="muted" />;
            if (row.status === 'stopped') return <ActionBtn label="Start" variant="accent" />;
            return null;
        },
    },
];

function ActionBtn({ label, variant }) {
    const isAccent = variant === 'accent';
    return (
        <button
            style={{
                fontSize: 11, fontWeight: 650, padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isAccent ? 'var(--color-accent-muted)' : 'var(--color-surface-3)',
                color: isAccent ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
                transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = isAccent ? 'var(--color-accent-glow)' : 'var(--color-surface-4)';
                e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = isAccent ? 'var(--color-accent-muted)' : 'var(--color-surface-3)';
                e.currentTarget.style.transform = 'scale(1)';
            }}
        >
            {label}
        </button>
    );
}

export default function Services() {
    const activeServerId = useServerStore((s) => s.activeServerId);
    const services = useServerStore((s) => s.services);
    const list = services[activeServerId] || [];
    const [q, setQ] = useState('');

    const filtered = q
        ? list.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) || (s.display_name || '').toLowerCase().includes(q.toLowerCase()))
        : list;

    const running = list.filter((s) => s.status === 'running').length;

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>Services</h1>
                    <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                        <Pill val={list.length} txt="total" />
                        <Pill val={running} txt="running" color="var(--color-green)" />
                        <Pill val={list.length - running} txt="stopped" />
                    </div>
                </div>
                <SearchBox value={q} onChange={setQ} placeholder="Filter services…" />
            </div>
            <DataTable columns={columns} data={filtered} emptyMessage="Waiting for service data…" />
        </div>
    );
}

function Pill({ val, txt, color }) {
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <span className="text-mono" style={{ fontWeight: 700, color: color || 'var(--color-text-secondary)' }}>{val}</span>
            <span style={{ color: 'var(--color-text-quaternary)' }}>{txt}</span>
        </span>
    );
}

function SearchBox({ value, onChange, placeholder }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8, width: 220,
            padding: '8px 12px', borderRadius: 10,
            background: 'var(--color-surface-1)', border: '1px solid var(--color-border-subtle)',
            transition: 'border-color 0.15s',
        }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-border-hover)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border-subtle)'}
        >
            <Search size={14} style={{ color: 'var(--color-text-quaternary)', flexShrink: 0 }} />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)',
                }}
            />
        </div>
    );
}
