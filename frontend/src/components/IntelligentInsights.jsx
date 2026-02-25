import { useEffect, useState } from 'react';
import { Sparkles, X, Brain, AlertTriangle, TrendingDown } from 'lucide-react';
import { getInsights, dismissInsight } from '../api/client';
import useServerStore from '../store/serverStore';

export default function IntelligentInsights() {
    const activeServerId = useServerStore((s) => s.activeServerId);
    const [insights, setInsights] = useState([]);

    useEffect(() => {
        if (!activeServerId) return;

        const loadInsights = async () => {
            try {
                const res = await getInsights(activeServerId);
                setInsights(res.insights || []);
            } catch (err) {
                console.error("Failed to load insights:", err);
            }
        };

        loadInsights();
        const interval = setInterval(loadInsights, 15000); // Check every 15s to keep responsive
        return () => clearInterval(interval);
    }, [activeServerId]);

    const handleDismiss = async (id) => {
        try {
            await dismissInsight(id);
            setInsights((prev) => prev.filter((i) => i.id !== id));
        } catch (err) {
            console.error("Failed to dismiss insight:", err);
        }
    };

    if (insights.length === 0) {
        return (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.6 }}>
                <div style={{
                    width: 52, height: 52, borderRadius: 18,
                    background: 'var(--color-surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Brain size={22} style={{ color: 'var(--color-text-tertiary)' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        Intelligent Insights
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-quaternary)', marginTop: 4, maxWidth: 200 }}>
                        System is running optimally. No anomalies or optimizations detected.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card-flush" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '14px 20px', borderBottom: '1px solid var(--color-border-subtle)',
            }}>
                <Sparkles size={16} color="var(--color-accent)" />
                <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--color-text-primary)' }}>
                    Intelligent Insights
                </span>
                <span className="text-mono" style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--color-text-quaternary)' }}>
                    {insights.length}
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px', gap: 12, overflowY: 'auto', maxHeight: 310 }}>
                {insights.map((insight) => {
                    let bg = 'var(--color-surface-2)';
                    let fg = 'var(--color-text-primary)';
                    let border = '1px solid var(--color-border-subtle)';
                    let Icon = Brain;

                    if (insight.type === 'anomaly') {
                        Icon = AlertTriangle;
                        bg = 'var(--color-amber-muted)';
                        border = '1px solid var(--color-amber)';
                        fg = 'var(--color-orange)';
                    } else if (insight.type === 'prediction') {
                        Icon = TrendingDown;
                        bg = 'var(--color-red-muted)';
                        border = '1px solid var(--color-red)';
                        fg = 'var(--color-red)';
                    } else if (insight.type === 'optimization') {
                        Icon = Sparkles;
                        bg = 'var(--color-green-muted)';
                        border = '1px solid var(--color-green)';
                        fg = 'var(--color-green)';
                    }

                    return (
                        <div key={insight.id} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            padding: '12px 14px', borderRadius: 'var(--radius-md)',
                            background: bg, border: border,
                            position: 'relative'
                        }}>
                            <div style={{ marginTop: 2, color: fg }}>
                                <Icon size={16} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: fg, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                                    {insight.type}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.4, fontWeight: 500 }}>
                                    {insight.message}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
                                    {new Date(insight.created_at).toLocaleTimeString()}
                                </div>
                            </div>
                            <button
                                onClick={() => handleDismiss(insight.id)}
                                style={{
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: 'var(--color-text-quaternary)', padding: 4, borderRadius: 4,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.background = 'var(--color-surface-3)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-quaternary)'; e.currentTarget.style.background = 'transparent'; }}
                                title="Dismiss insight"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
