/**
 * StatusBadge — Minimal semantic pill.
 */

const presets = {
    running: { bg: 'var(--color-green-muted)', fg: 'var(--color-green)' },
    stopped: { bg: 'var(--color-surface-3)', fg: 'var(--color-text-tertiary)' },
    failed: { bg: 'var(--color-red-muted)', fg: 'var(--color-red)' },
    LISTEN: { bg: 'var(--color-green-muted)', fg: 'var(--color-green)' },
    online: { bg: 'var(--color-green-muted)', fg: 'var(--color-green)' },
    offline: { bg: 'var(--color-red-muted)', fg: 'var(--color-red)' },
};

export default function StatusBadge({ status }) {
    const p = presets[status] || { bg: 'var(--color-surface-3)', fg: 'var(--color-text-quaternary)' };

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 7,
                background: p.bg,
                fontSize: 11,
                fontWeight: 600,
                color: p.fg,
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
            }}
        >
            <span
                className={status === 'running' || status === 'LISTEN' || status === 'online' ? 'pulse-live' : ''}
                style={{ width: 5, height: 5, borderRadius: '50%', background: p.fg, flexShrink: 0 }}
            />
            {status}
        </span>
    );
}
