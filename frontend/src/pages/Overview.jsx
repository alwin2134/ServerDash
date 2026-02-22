import { useEffect, useState } from 'react';
import { Cpu, HardDrive, Activity, Sparkles, ArrowUpRight } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import Sparkline from '../components/Sparkline';
import useServerStore from '../store/serverStore';
import { getHistory } from '../api/client';

export default function Overview() {
    const activeServerId = useServerStore((s) => s.activeServerId);
    const metrics = useServerStore((s) => s.metrics);
    const services = useServerStore((s) => s.services);
    const processes = useServerStore((s) => s.processes);
    const ports = useServerStore((s) => s.ports);
    const health = useServerStore((s) => s.health);
    const history = useServerStore((s) => s.history);
    const setHistory = useServerStore((s) => s.setHistory);
    const m = metrics[activeServerId] || {};
    const h = health[activeServerId] || {};
    const svcList = services[activeServerId] || [];
    const procList = processes[activeServerId] || [];
    const portList = ports[activeServerId] || [];
    const hist = history[activeServerId] || [];

    const critical = svcList
        .filter((s) => s.status === 'running' || s.status === 'failed')
        .slice(0, 6);

    const hasData = Object.keys(m).length > 0;

    const fmtGB = (b) => b ? `${(b / 1073741824).toFixed(1)} GB` : '—';

    // Fetch history for sparklines
    useEffect(() => {
        if (!activeServerId) return;
        const load = async () => {
            try {
                const data = await getHistory(activeServerId, 60);
                setHistory(activeServerId, data);
            } catch { /* silent */ }
        };
        load();
        const interval = setInterval(load, 15000);
        return () => clearInterval(interval);
    }, [activeServerId]);

    // Health state for banner
    const healthState = h.state || (hasData ? 'healthy' : 'unknown');
    const healthScore = h.score ?? (hasData ? 100 : 0);
    const healthColors = {
        healthy: { bg: 'var(--color-green-muted)', fg: 'var(--color-green)' },
        warning: { bg: 'var(--color-amber-muted)', fg: 'var(--color-amber)' },
        degraded: { bg: 'var(--color-amber-muted)', fg: 'var(--color-orange)' },
        critical: { bg: 'var(--color-red-muted)', fg: 'var(--color-red)' },
        unknown: { bg: 'var(--color-surface-3)', fg: 'var(--color-text-quaternary)' },
    };
    const hc = healthColors[healthState] || healthColors.unknown;

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* ── Header ───────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
                        Overview
                    </h1>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                        Real-time system health
                    </p>
                </div>
                {hasData && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <QuickPill icon={Activity} value={procList.length} label="processes" />
                        <QuickPill icon={HardDrive} value={portList.length} label="ports" />
                    </div>
                )}
            </div>

            {/* ── Status Banner ────────────────────────────────── */}
            <div
                className="card"
                style={{
                    padding: '18px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    ...(!hasData ? { opacity: 0.5 } : {}),
                }}
            >
                <div style={{
                    width: 40, height: 40, borderRadius: 14,
                    background: hc.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div
                        className={healthState === 'healthy' || healthState === 'unknown' ? 'pulse-live' : ''}
                        style={{ width: 10, height: 10, borderRadius: '50%', background: hc.fg }}
                    />
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-text-primary)' }}>
                        {hasData
                            ? healthState === 'healthy'
                                ? 'System Operational'
                                : healthState === 'warning'
                                    ? 'Elevated Resource Usage'
                                    : healthState === 'degraded'
                                        ? 'System Degraded'
                                        : 'Critical Issues Detected'
                            : 'Awaiting Agent Connection'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                        {hasData
                            ? h.reasons?.length
                                ? h.reasons.join(' · ')
                                : 'All monitored services are within normal parameters'
                            : 'Start the agent to begin collecting system data'}
                    </div>
                </div>

                {hasData && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="text-mono" style={{ fontSize: 18, fontWeight: 800, color: hc.fg }}>
                            {healthScore}
                        </span>
                        <span style={{
                            fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8,
                            background: hc.bg, color: hc.fg, textTransform: 'capitalize',
                        }}>
                            {healthState}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Metric Gauges + Sparklines ───────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <MetricCardWithSparkline
                    label="CPU" value={m.cpu_percent ?? 0} color="var(--color-accent)"
                    subtitle="Processing load" data={hist.map((d) => d.cpu)}
                />
                <MetricCardWithSparkline
                    label="Memory" value={m.ram_percent ?? 0} color="var(--color-purple)"
                    subtitle={fmtGB(m.ram_total)} data={hist.map((d) => d.ram)}
                />
                <MetricCardWithSparkline
                    label="Disk" value={m.disk_percent ?? 0} color="var(--color-orange)"
                    subtitle={fmtGB(m.disk_total)} data={hist.map((d) => d.disk)}
                />
            </div>

            {/* ── Bottom Grid ──────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Services */}
                <div className="card-flush">
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px', borderBottom: '1px solid var(--color-border-subtle)',
                    }}>
                        <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--color-text-secondary)' }}>
                            Active Services
                        </span>
                        <span className="text-mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-quaternary)' }}>
                            {critical.length}
                        </span>
                    </div>

                    {critical.length > 0 ? critical.map((s, i) => (
                        <div
                            key={i}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '10px 20px',
                                borderBottom: i < critical.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                                transition: 'background 0.1s',
                                cursor: 'default',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <span className="truncate-line" style={{ fontSize: 13, fontWeight: 500, maxWidth: 220, color: 'var(--color-text-primary)' }}>
                                {s.display_name || s.name}
                            </span>
                            <StatusBadge status={s.status} />
                        </div>
                    )) : (
                        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                            <span style={{ fontSize: 12, color: 'var(--color-text-quaternary)' }}>Waiting for data…</span>
                        </div>
                    )}
                </div>

                {/* Network Stats */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    {hasData && m.net_sent != null ? (
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
                            <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--color-text-secondary)' }}>
                                Network
                            </span>
                            <NetStat label="Data Sent" value={fmtBytes(m.net_sent)} color="var(--color-teal)" />
                            <NetStat label="Data Received" value={fmtBytes(m.net_recv)} color="var(--color-accent-light)" />
                            <div style={{ flex: 1 }} />
                            <div style={{ fontSize: 11, color: 'var(--color-text-quaternary)' }}>
                                Since agent start
                            </div>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.45 }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: 18,
                                background: 'var(--color-accent-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Sparkles size={22} style={{ color: 'var(--color-accent-light)' }} />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                    Intelligent Insights
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--color-text-quaternary)', marginTop: 4, maxWidth: 200 }}>
                                    AI-powered analysis coming in Phase 3
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MetricCardWithSparkline({ label, value, color, subtitle, data }) {
    const [expanded, setExpanded] = useState(false);

    const hasHistory = data && data.length > 1;
    const validData = hasHistory ? data.filter((v) => v != null) : [];
    const min = validData.length ? Math.min(...validData).toFixed(1) : '—';
    const max = validData.length ? Math.max(...validData).toFixed(1) : '—';
    const avg = validData.length ? (validData.reduce((a, b) => a + b, 0) / validData.length).toFixed(1) : '—';
    const current = validData.length ? validData[validData.length - 1].toFixed(1) : '—';

    return (
        <div
            style={{
                display: 'flex', flexDirection: 'column',
                cursor: hasHistory ? 'pointer' : 'default',
            }}
            onClick={() => hasHistory && setExpanded((v) => !v)}
        >
            {/* Metric card with integrated expand hint */}
            <div
                className="card card-hover"
                style={{
                    padding: '20px 16px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: expanded ? 'var(--radius-lg) var(--radius-lg) 0 0' : 'var(--radius-lg)',
                    transition: 'border-radius 0.2s',
                }}
            >
                {/* Ambient glow */}
                <div style={{
                    position: 'absolute',
                    top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 100, height: 100, borderRadius: '50%',
                    background: color,
                    opacity: 0.06,
                    filter: 'blur(30px)',
                    pointerEvents: 'none',
                }} />

                <MetricCard label={label} value={value} color={color} subtitle={subtitle} />

                {/* Subtle chevron hint */}
                {hasHistory && (
                    <svg
                        width="16" height="8" viewBox="0 0 16 8"
                        style={{
                            transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
                            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            opacity: 0.25,
                        }}
                    >
                        <path d="M2 1.5L8 6.5L14 1.5" stroke="var(--color-text-tertiary)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>

            {/* Expandable detail panel */}
            <div style={{
                maxHeight: expanded ? 260 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
            }}>
                <div className="card" style={{
                    padding: '16px 20px',
                    borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                    marginTop: -1,
                    borderTop: '1px solid var(--color-border-subtle)',
                    display: 'flex', flexDirection: 'column', gap: 14,
                }}>
                    {/* Larger sparkline */}
                    <Sparkline data={validData} color={color} width={350} height={80} />

                    {/* Stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        <StatBubble label="Current" value={`${current}%`} color={color} bold />
                        <StatBubble label="Average" value={`${avg}%`} />
                        <StatBubble label="Min" value={`${min}%`} color="var(--color-green)" />
                        <StatBubble label="Max" value={`${max}%`} color="var(--color-red)" />
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, color: 'var(--color-text-quaternary)' }}>
                            {validData.length} data points · 15s refresh
                        </span>
                        <span style={{
                            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                            padding: '2px 6px', borderRadius: 4,
                            background: 'var(--color-surface-3)', color: 'var(--color-text-quaternary)',
                        }}>
                            Last {Math.round(validData.length * 5 / 60)}min
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatBubble({ label, value, color, bold }) {
    return (
        <div style={{
            padding: '8px 10px', borderRadius: 10,
            background: 'var(--color-surface-2)',
            textAlign: 'center',
        }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-quaternary)', marginBottom: 3 }}>{label}</div>
            <div className="text-mono" style={{
                fontSize: 13,
                fontWeight: bold ? 800 : 600,
                color: color || 'var(--color-text-secondary)',
                letterSpacing: '-0.01em',
            }}>
                {value}
            </div>
        </div>
    );
}

function QuickPill({ icon: Icon, value, label }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 10,
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-subtle)',
        }}>
            <Icon size={13} style={{ color: 'var(--color-text-quaternary)' }} />
            <span className="text-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>{value}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-quaternary)' }}>{label}</span>
        </div>
    );
}

function NetStat({ label, value, color }) {
    return (
        <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-quaternary)', marginBottom: 4 }}>{label}</div>
            <div className="text-mono" style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: '-0.01em' }}>{value}</div>
        </div>
    );
}

function fmtBytes(b) {
    if (b == null) return '—';
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
    return `${(b / 1073741824).toFixed(2)} GB`;
}
