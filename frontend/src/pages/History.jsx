import { useState, useEffect, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import MetricsChart from '../components/MetricsChart';
import useServerStore from '../store/serverStore';
import { getHistory } from '../api/client';

const RANGES = [
    { key: '1h', label: '1 Hour', limit: 720 },
    { key: '6h', label: '6 Hours', limit: 4320 },
    { key: '24h', label: '24 Hours', limit: 8640 },
];

export default function History() {
    const activeServerId = useServerStore((s) => s.activeServerId);
    const [range, setRange] = useState('1h');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchHistory = useCallback(async () => {
        if (!activeServerId) return;
        try {
            const res = await getHistory(activeServerId, 0, range);
            setData(res || []);
        } catch (e) {
            console.error('Failed to fetch history:', e);
        } finally {
            setLoading(false);
        }
    }, [activeServerId, range]);

    useEffect(() => {
        setLoading(true);
        fetchHistory();
    }, [fetchHistory]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchHistory, 10000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchHistory]);

    const formatBytes = (v) => {
        if (v > 1e9) return `${(v / 1e9).toFixed(1)} GB`;
        if (v > 1e6) return `${(v / 1e6).toFixed(1)} MB`;
        if (v > 1e3) return `${(v / 1e3).toFixed(0)} KB`;
        return `${v} B`;
    };

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <BarChart3 size={22} style={{ color: 'var(--color-accent)' }} />
                        History
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                        <span className="text-mono" style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>{data.length}</span>
                        {' '}data points
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Auto-refresh toggle */}
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        style={{
                            padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border-subtle)',
                            background: autoRefresh ? 'rgba(52,199,89,0.12)' : 'var(--color-surface-1)',
                            color: autoRefresh ? '#34c759' : 'var(--color-text-tertiary)',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        {autoRefresh ? '● Live' : '○ Paused'}
                    </button>
                    {/* Range selector */}
                    <div style={{
                        display: 'flex', borderRadius: 10, overflow: 'hidden',
                        border: '1px solid var(--color-border-subtle)',
                    }}>
                        {RANGES.map((r) => (
                            <button
                                key={r.key}
                                onClick={() => setRange(r.key)}
                                style={{
                                    padding: '6px 14px', border: 'none', cursor: 'pointer',
                                    fontSize: 12, fontWeight: 600,
                                    background: range === r.key ? 'var(--color-accent)' : 'var(--color-surface-1)',
                                    color: range === r.key ? '#fff' : 'var(--color-text-tertiary)',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>Loading history…</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <MetricsChart
                        data={data} dataKey="cpu" label="CPU Usage"
                        color="#007aff" unit="%"
                    />
                    <MetricsChart
                        data={data} dataKey="ram" label="Memory Usage"
                        color="#af52de" unit="%"
                    />
                    <MetricsChart
                        data={data} dataKey="disk" label="Disk Usage"
                        color="#ff9f0a" unit="%"
                    />
                    <MetricsChart
                        data={data} dataKey="net_recv" label="Network In"
                        color="#34c759" unit=""
                        maxValue={Math.max(...data.map((d) => d.net_recv || 0), 1)}
                        formatValue={formatBytes}
                    />
                </div>
            )}
        </div>
    );
}
