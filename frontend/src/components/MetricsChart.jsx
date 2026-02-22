import { useMemo } from 'react';

/**
 * SVG-based time-series chart component.
 * Renders a smooth polyline with gradient fill and optional tooltip.
 */
export default function MetricsChart({
    data = [],
    dataKey = 'cpu',
    label = 'CPU',
    color = '#007aff',
    unit = '%',
    height = 180,
    maxValue = 100,
    formatValue,
}) {
    const W = 600;
    const H = height;
    const PADDING_TOP = 20;
    const PADDING_BOTTOM = 24;
    const CHART_H = H - PADDING_TOP - PADDING_BOTTOM;

    const points = useMemo(() => {
        if (!data.length) return '';
        const stepX = W / Math.max(data.length - 1, 1);
        return data
            .map((d, i) => {
                const v = typeof d === 'number' ? d : (d[dataKey] ?? 0);
                const y = PADDING_TOP + CHART_H - (Math.min(v, maxValue) / maxValue) * CHART_H;
                return `${i * stepX},${y}`;
            })
            .join(' ');
    }, [data, dataKey, maxValue, CHART_H]);

    const areaPath = useMemo(() => {
        if (!data.length) return '';
        const stepX = W / Math.max(data.length - 1, 1);
        const pts = data.map((d, i) => {
            const v = typeof d === 'number' ? d : (d[dataKey] ?? 0);
            const y = PADDING_TOP + CHART_H - (Math.min(v, maxValue) / maxValue) * CHART_H;
            return `${i * stepX},${y}`;
        });
        return `M0,${PADDING_TOP + CHART_H} L${pts.join(' L')} L${(data.length - 1) * stepX},${PADDING_TOP + CHART_H} Z`;
    }, [data, dataKey, maxValue, CHART_H]);

    const latest = data.length > 0
        ? (typeof data[data.length - 1] === 'number' ? data[data.length - 1] : data[data.length - 1][dataKey] ?? 0)
        : 0;

    const fmt = formatValue ? formatValue(latest) : `${latest.toFixed(1)}${unit}`;
    const gradientId = `grad-${dataKey}-${color.replace('#', '')}`;

    return (
        <div style={{
            background: 'var(--color-surface-1)', borderRadius: 16,
            border: '1px solid var(--color-border-subtle)', padding: '16px 20px',
            overflow: 'hidden',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>
                    {label}
                </span>
                <span className="text-mono" style={{ fontSize: 20, fontWeight: 800, color }}>
                    {fmt}
                </span>
            </div>

            {data.length === 0 ? (
                <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-quaternary)', fontSize: 13 }}>
                    Waiting for data…
                </div>
            ) : (
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                        </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((pct) => {
                        const y = PADDING_TOP + CHART_H - (pct / 100) * CHART_H;
                        return (
                            <g key={pct}>
                                <line x1="0" y1={y} x2={W} y2={y}
                                    stroke="var(--color-border-subtle)" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                                <text x={W - 4} y={y - 4} textAnchor="end"
                                    fill="var(--color-text-quaternary)" fontSize="10" fontFamily="var(--font-mono)">
                                    {maxValue === 100 ? `${pct}%` : Math.round(pct / 100 * maxValue)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Area fill */}
                    <path d={areaPath} fill={`url(#${gradientId})`} />

                    {/* Line */}
                    <polyline
                        points={points}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Current value dot */}
                    {data.length > 0 && (() => {
                        const lastIdx = data.length - 1;
                        const stepX = W / Math.max(lastIdx, 1);
                        const y = PADDING_TOP + CHART_H - (Math.min(latest, maxValue) / maxValue) * CHART_H;
                        return (
                            <>
                                <circle cx={lastIdx * stepX} cy={y} r="5" fill={color} />
                                <circle cx={lastIdx * stepX} cy={y} r="8" fill={color} opacity="0.2" />
                            </>
                        );
                    })()}
                </svg>
            )}
        </div>
    );
}
