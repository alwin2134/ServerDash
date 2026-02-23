import { useState, useEffect } from 'react';
import { Download, Search, Package, Check, Loader } from 'lucide-react';
import useServerStore from '../store/serverStore';
import { getAppCatalog, installApp } from '../api/client';

const categoryIcons = {
    'Web Servers': '🌐',
    'Databases': '🗄️',
    'Management': '🐳',
    'Networking': '🛡️',
    'Monitoring': '📊',
    'Media': '🎬',
    'Storage': '☁️',
    'CMS': '📝',
    'DevOps': '🦊',
    'IoT': '🏠',
};

export default function AppStore() {
    const activeServerId = useServerStore((s) => s.activeServerId);
    const [apps, setApps] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(null); // app id currently installing
    const [installed, setInstalled] = useState(new Set()); // successfully installed ids

    useEffect(() => {
        (async () => {
            try {
                const res = await getAppCatalog();
                setApps(res.apps || []);
                setCategories(['All', ...(res.categories || [])]);
            } catch (e) {
                console.error('Failed to load catalog:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleInstall = async (app) => {
        if (!activeServerId) return;
        setInstalling(app.id);
        try {
            await installApp(activeServerId, {
                package_name: app.id,
                method: app.method,
                image: app.image,
                ports: app.ports,
                env: app.env,
                volumes: app.volumes,
            });
            setInstalled((prev) => new Set([...prev, app.id]));
        } catch (e) {
            console.error(`Failed to install ${app.name}:`, e);
        } finally {
            setTimeout(() => setInstalling(null), 500);
        }
    };

    const filtered = apps.filter((app) => {
        if (selectedCategory !== 'All' && app.category !== selectedCategory) return false;
        if (q && !app.name.toLowerCase().includes(q.toLowerCase()) && !app.description.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
    });

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: 'var(--color-text-tertiary)' }}>
                Loading catalog…
            </div>
        );
    }

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Package size={22} style={{ color: 'var(--color-accent)' }} />
                        App Store
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                        One-click deploy popular self-hosted applications
                    </p>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: 240,
                    padding: '8px 12px', borderRadius: 10,
                    background: 'var(--color-surface-1)', border: '1px solid var(--color-border-subtle)',
                }}>
                    <Search size={14} style={{ color: 'var(--color-text-quaternary)', flexShrink: 0 }} />
                    <input
                        type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps…"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}
                    />
                </div>
            </div>

            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: 20,
                            border: 'none',
                            background: selectedCategory === cat
                                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                : 'var(--color-surface-1)',
                            color: selectedCategory === cat ? '#fff' : 'var(--color-text-secondary)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {cat !== 'All' && categoryIcons[cat] ? `${categoryIcons[cat]} ` : ''}{cat}
                    </button>
                ))}
            </div>

            {/* App Grid */}
            {filtered.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: 60, borderRadius: 16,
                    background: 'var(--color-surface-1)', border: '1px solid var(--color-border-subtle)',
                }}>
                    <Package size={40} style={{ color: 'var(--color-text-quaternary)', marginBottom: 12 }} />
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-secondary)' }}>No apps found</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 16,
                }}>
                    {filtered.map((app) => (
                        <AppCard
                            key={app.id}
                            app={app}
                            onInstall={() => handleInstall(app)}
                            isInstalling={installing === app.id}
                            isInstalled={installed.has(app.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function AppCard({ app, onInstall, isInstalling, isInstalled }) {
    return (
        <div style={{
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Color accent bar */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: app.color || 'var(--color-accent)',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${app.color || 'var(--color-accent)'}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                }}>
                    {app.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {app.name}
                    </h3>
                    <span style={{
                        fontSize: 11, fontWeight: 600, color: app.color || 'var(--color-text-tertiary)',
                        opacity: 0.8,
                    }}>
                        {app.category}
                    </span>
                </div>
            </div>

            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.5, flex: 1 }}>
                {app.description}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-mono" style={{ fontSize: 11, color: 'var(--color-text-quaternary)' }}>
                    {app.image}
                </span>
                <button
                    onClick={onInstall}
                    disabled={isInstalling || isInstalled}
                    style={{
                        padding: '6px 14px',
                        borderRadius: 10,
                        border: 'none',
                        background: isInstalled
                            ? 'rgba(52, 199, 89, 0.12)'
                            : isInstalling
                                ? 'var(--color-surface-2)'
                                : `${app.color || '#6366f1'}18`,
                        color: isInstalled ? '#34c759' : isInstalling ? 'var(--color-text-quaternary)' : (app.color || '#6366f1'),
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: isInstalling || isInstalled ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'all 0.2s ease',
                    }}
                >
                    {isInstalled ? (
                        <>
                            <Check size={13} /> Queued
                        </>
                    ) : isInstalling ? (
                        <>
                            <Loader size={13} className="spin" /> Installing
                        </>
                    ) : (
                        <>
                            <Download size={13} /> Install
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
