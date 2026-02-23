import { useState, useEffect } from 'react';
import { Download, Search, Package, Check, Loader, ExternalLink, Box } from 'lucide-react';
import useServerStore from '../store/serverStore';
import { getAppCatalog, installApp, getDockerContainers } from '../api/client';

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
    const servers = useServerStore((s) => s.servers);
    const [apps, setApps] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(null);
    const [containers, setContainers] = useState([]);
    const [justQueued, setJustQueued] = useState(new Set());

    // Load catalog
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

    // Poll Docker containers
    useEffect(() => {
        if (!activeServerId) return;
        const check = async () => {
            try {
                const res = await getDockerContainers(activeServerId);
                setContainers(res.containers || []);
            } catch (e) { /* Docker not available */ }
        };
        check();
        const interval = setInterval(check, 8000);
        return () => clearInterval(interval);
    }, [activeServerId]);

    // Get server IP for open links
    const activeServer = servers.find((s) => s.id === activeServerId);
    const serverHost = activeServer?.ip_address || window.location.hostname;

    // Match containers to catalog apps
    const getInstalledApps = () => {
        return containers
            .filter((c) => c.state === 'running')
            .map((c) => {
                const baseImage = c.image?.split(':')[0]?.toLowerCase();
                const catalogApp = apps.find((a) => a.image?.split(':')[0]?.toLowerCase() === baseImage);
                // Parse first host port from container ports string: "8080->80/tcp"
                const portMatch = c.ports?.match(/(\d+)->/);
                const hostPort = portMatch ? portMatch[1] : null;
                return {
                    container: c,
                    catalogApp,
                    hostPort,
                    name: catalogApp?.name || c.name,
                    icon: catalogApp?.icon || '📦',
                    color: catalogApp?.color || '#6366f1',
                    description: catalogApp?.description || c.image,
                };
            });
    };

    const installedApps = getInstalledApps();
    const installedImages = new Set(containers.map((c) => c.image?.split(':')[0]?.toLowerCase()));

    const isAppInstalled = (app) => {
        const baseImage = app.image?.split(':')[0]?.toLowerCase();
        return installedImages.has(baseImage);
    };

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
            setJustQueued((prev) => new Set([...prev, app.id]));
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

            {/* ── Installed Apps ──────────────────────────────── */}
            {installedApps.length > 0 && (
                <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Box size={16} style={{ color: '#34c759' }} />
                        Running Apps
                        <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                            background: 'rgba(52, 199, 89, 0.12)', color: '#34c759',
                        }}>
                            {installedApps.length}
                        </span>
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: 12,
                    }}>
                        {installedApps.map((app) => (
                            <InstalledAppCard key={app.container.container_id} app={app} serverHost={serverHost} />
                        ))}
                    </div>
                </div>
            )}

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
                        <CatalogAppCard
                            key={app.id}
                            app={app}
                            onInstall={() => handleInstall(app)}
                            isInstalling={installing === app.id}
                            isInstalled={isAppInstalled(app)}
                            isQueued={justQueued.has(app.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}


/* ── Installed App Card (compact, with Open button) ─────── */
function InstalledAppCard({ app, serverHost }) {
    const hasWebUI = app.hostPort && !['5432', '3306', '6379', '27017', '53'].includes(app.hostPort);
    const openUrl = hasWebUI ? `http://${serverHost}:${app.hostPort}` : null;

    return (
        <div style={{
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 14,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
        }}>
            {/* Green accent bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#34c759' }} />

            <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${app.color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
            }}>
                {app.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {app.name}
                </h3>
                <span className="text-mono" style={{ fontSize: 11, color: 'var(--color-text-quaternary)' }}>
                    {app.hostPort ? `:${app.hostPort}` : app.container.image}
                </span>
            </div>

            {openUrl ? (
                <a
                    href={openUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        padding: '6px 12px', borderRadius: 8, border: 'none',
                        background: `${app.color}18`, color: app.color,
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                        textDecoration: 'none', flexShrink: 0,
                        transition: 'all 0.2s ease',
                    }}
                >
                    <ExternalLink size={12} /> Open
                </a>
            ) : (
                <span style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    background: 'rgba(52, 199, 89, 0.12)', color: '#34c759',
                }}>
                    Running
                </span>
            )}
        </div>
    );
}


/* ── Catalog App Card (full size, with Install button) ──── */
function CatalogAppCard({ app, onInstall, isInstalling, isInstalled, isQueued }) {
    const getButtonState = () => {
        if (isInstalled) return { label: 'Running', icon: <Check size={13} />, bg: 'rgba(52, 199, 89, 0.12)', color: '#34c759', disabled: true };
        if (isInstalling) return { label: 'Installing…', icon: <Loader size={13} className="spin" />, bg: 'var(--color-surface-2)', color: 'var(--color-text-quaternary)', disabled: true };
        if (isQueued) return { label: 'Deploying…', icon: <Loader size={13} className="spin" />, bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', disabled: true };
        return { label: 'Install', icon: <Download size={13} />, bg: `${app.color || '#6366f1'}18`, color: app.color || '#6366f1', disabled: false };
    };

    const btn = getButtonState();

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
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: isInstalled ? '#34c759' : (app.color || 'var(--color-accent)'),
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            {app.name}
                        </h3>
                        {isInstalled && (
                            <span style={{
                                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                background: 'rgba(52, 199, 89, 0.12)', color: '#34c759',
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}>
                                Active
                            </span>
                        )}
                    </div>
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
                    disabled={btn.disabled}
                    style={{
                        padding: '6px 14px', borderRadius: 10, border: 'none',
                        background: btn.bg, color: btn.color,
                        fontSize: 12, fontWeight: 700,
                        cursor: btn.disabled ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                        transition: 'all 0.2s ease',
                    }}
                >
                    {btn.icon} {btn.label}
                </button>
            </div>
        </div>
    );
}
