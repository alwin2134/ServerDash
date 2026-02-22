/**
 * MetricCard — Gauge content only (no card wrapper).
 * The parent MetricCardWithSparkline provides the card shell.
 */

export default function MetricCard({ label, value = 0, color = 'var(--color-accent)', subtitle }) {
    const percent = Math.min(Math.max(value, 0), 100);
    const r = 46;
    const stroke = 6;
    const C = 2 * Math.PI * r;
    const offset = C - (percent / 100) * C;
    const size = (r + stroke + 4) * 2;
    const cx = size / 2;

    return (
        <>
            {/* Gauge */}
            <div style={{ position: 'relative', width: size, height: size }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke} />
                    <circle
                        cx={cx} cy={cx} r={r}
                        fill="none"
                        stroke={color}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={C}
                        strokeDashoffset={offset}
                        className="metric-ring"
                        style={{ filter: `drop-shadow(0 0 6px ${color}50)` }}
                    />
                </svg>
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span className="text-mono" style={{
                        fontSize: 24, fontWeight: 800,
                        color: 'var(--color-text-primary)',
                        letterSpacing: '-0.02em', lineHeight: 1,
                    }}>
                        {value.toFixed(1)}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-quaternary)', marginTop: 3 }}>%</span>
                </div>
            </div>

            {/* Label */}
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--color-text-secondary)' }}>{label}</div>
                {subtitle && (
                    <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-quaternary)', marginTop: 2 }}>{subtitle}</div>
                )}
            </div>
        </>
    );
}
