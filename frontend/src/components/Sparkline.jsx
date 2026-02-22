/**
 * Sparkline — Lightweight SVG sparkline chart.
 * No dependencies, renders time-series data as a smooth line.
 */

export default function Sparkline({ data = [], color = 'var(--color-accent)', width = 120, height = 32 }) {
    if (!data.length) return null;

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    const pad = 2;
    const w = width - pad * 2;
    const h = height - pad * 2;

    const points = data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * w;
        const y = pad + h - ((v - min) / range) * h;
        return `${x},${y}`;
    });

    const polyline = points.join(' ');

    // Gradient fill area
    const last = points[points.length - 1];
    const first = points[0];
    const areaPath = `M${first} ${points.slice(1).map((p) => `L${p}`).join(' ')} L${pad + w},${pad + h} L${pad},${pad + h} Z`;

    return (
        <svg width={width} height={height} style={{ display: 'block' }}>
            <defs>
                <linearGradient id={`sp-fill-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#sp-fill-${color.replace(/[^a-z0-9]/gi, '')})`} />
            <polyline
                points={polyline}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Current value dot */}
            {data.length > 1 && (
                <circle
                    cx={pad + w}
                    cy={pad + h - ((data[data.length - 1] - min) / range) * h}
                    r="2.5"
                    fill={color}
                />
            )}
        </svg>
    );
}
