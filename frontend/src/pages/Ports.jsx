import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import useServerStore from '../store/serverStore';

const columns = [
    { key: 'port', label: 'Port', width: '12%', align: 'right', mono: true },
    {
        key: 'protocol', label: 'Proto', width: '10%',
        render: (v) => (
            <span style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                padding: '3px 8px', borderRadius: 6,
                background: 'var(--color-surface-3)', color: 'var(--color-text-secondary)',
            }}>
                {v}
            </span>
        ),
    },
    { key: 'address', label: 'Address', width: '18%', mono: true },
    { key: 'process_name', label: 'Process', width: '24%' },
    {
        key: 'pid', label: 'PID', width: '12%', align: 'right', mono: true,
        render: (v) => <span style={{ color: v ? 'var(--color-text-secondary)' : 'var(--color-text-quaternary)' }}>{v || '—'}</span>,
    },
    { key: 'status', label: 'Status', width: '14%', render: (v) => <StatusBadge status={v} /> },
];

export default function Ports() {
    const activeServerId = useServerStore((s) => s.activeServerId);
    const ports = useServerStore((s) => s.ports);
    const list = ports[activeServerId] || [];

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>Ports</h1>
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                    <span className="text-mono" style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>{list.length}</span>
                    {' '}listening ports detected
                </p>
            </div>
            <DataTable columns={columns} data={list} emptyMessage="Waiting for port data…" />
        </div>
    );
}
