import useServerStore from '../store/serverStore';
import ServerSelector from './ServerSelector';

export default function TopBar() {
    const activeServerId = useServerStore((s) => s.activeServerId);
    const metrics = useServerStore((s) => s.metrics);
    const wsConnected = useServerStore((s) => s.wsConnected);
    const m = metrics[activeServerId] || {};

    return (
        <header
            style={{
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                background: 'var(--color-surface-0)',
                borderBottom: '1px solid var(--color-border-subtle)',
                flexShrink: 0,
            }}
        >
            {/* Left side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <ServerSelector />
                <Divider />
                <ConnectionDot connected={wsConnected} />
            </div>

            {/* Right side — quick metrics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <MiniMetric label="CPU" value={m.cpu_percent} color="var(--color-accent)" />
                <MiniMetric label="MEM" value={m.ram_percent} color="var(--color-purple)" />
                <MiniMetric label="DISK" value={m.disk_percent} color="var(--color-orange)" />
            </div>
        </header>
    );
}

function ConnectionDot({ connected }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div
                className={connected ? 'pulse-live' : ''}
                style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: connected ? 'var(--color-green)' : 'var(--color-text-quaternary)',
                    boxShadow: connected ? '0 0 6px var(--color-green-muted)' : 'none',
                }}
            />
            <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: connected ? 'var(--color-green)' : 'var(--color-text-quaternary)',
            }}>
                {connected ? 'Live' : 'Offline'}
            </span>
        </div>
    );
}

function MiniMetric({ label, value, color }) {
    const pct = value != null ? Math.min(value, 100) : 0;
    const isHigh = pct > 80;
    const isCritical = pct > 95;
    const barColor = isCritical ? 'var(--color-red)' : isHigh ? 'var(--color-amber)' : color;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-quaternary)' }}>
                    {label}
                </span>
                <span
                    className="text-mono"
                    style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isCritical ? 'var(--color-red)' : isHigh ? 'var(--color-amber)' : 'var(--color-text-primary)',
                    }}
                >
                    {value != null ? `${value.toFixed(1)}%` : '—'}
                </span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'var(--color-surface-3)', overflow: 'hidden' }}>
                <div
                    style={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: 2,
                        background: barColor,
                        transition: 'width 0.6s ease, background 0.3s ease',
                    }}
                />
            </div>
        </div>
    );
}

function Divider() {
    return <div style={{ width: 1, height: 20, background: 'var(--color-border-subtle)' }} />;
}
