import { useState, useEffect } from 'react';
import { Box, ExternalLink } from 'lucide-react';
import useServerStore from '../store/serverStore';
import { getAppCatalog, getDockerContainers } from '../api/client';

export default function RunningAppsWidget() {
    const activeServerId = useServerStore((s) => s.activeServerId);
    const servers = useServerStore((s) => s.servers);
    const [apps, setApps] = useState([]);
    const [containers, setContainers] = useState([]);

    // Load catalog once
    useEffect(() => {
        getAppCatalog().then((res) => setApps(res.apps || [])).catch(() => { });
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

    const activeServer = servers.find((s) => s.id === activeServerId);
    if (!activeServer) return null;

    const serverHost = activeServer.ip_address || window.location.hostname;

    // Match containers to catalog apps
    const installedApps = containers
        .filter((c) => c.state === 'running')
        .map((c) => {
            const baseImage = c.image?.split(':')[0]?.toLowerCase();
            const catalogApp = apps.find((a) => a.image?.split(':')[0]?.toLowerCase() === baseImage);
            const portMatch = c.ports?.match(/(\d+)->/);
            const hostPort = portMatch ? portMatch[1] : null;

            return {
                id: c.container_id,
                name: catalogApp?.name || c.name,
                icon: catalogApp?.icon || '📦',
                color: catalogApp?.color || '#6366f1',
                image: c.image,
                hostPort,
                catalogApp,
            };
        })
        .filter((app) => {
            if (app.catalogApp) return true;
            return app.hostPort && !['5432', '3306', '6379', '27017', '53'].includes(app.hostPort);
        });

    if (installedApps.length === 0) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 650, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Box size={14} style={{ color: '#34c759' }} />
                Running Apps
                <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
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
                    <InstalledAppCard key={app.id} app={app} serverHost={serverHost} />
                ))}
            </div>
        </div>
    );
}

function InstalledAppCard({ app, serverHost }) {
    const hasWebUI = app.hostPort && !['5432', '3306', '6379', '27017', '53'].includes(app.hostPort);
    const openUrl = hasWebUI ? `http://${serverHost}:${app.hostPort}` : null;

    return (
        <div className="card-hover" style={{
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            position: 'relative',
            overflow: 'hidden',
        }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#34c759' }} />

            <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: `${app.color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
            }}>
                {app.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 13, fontWeight: 650, color: 'var(--color-text-primary)' }}>
                    {app.name}
                </h3>
            </div>

            {openUrl ? (
                <a
                    href={openUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        padding: '4px 8px', borderRadius: 6, border: 'none',
                        background: `${app.color}18`, color: app.color,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                        textDecoration: 'none', flexShrink: 0,
                        transition: 'all 0.2s ease',
                    }}
                >
                    <ExternalLink size={10} /> Open
                </a>
            ) : (
                <span style={{
                    padding: '3px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                    background: 'rgba(52, 199, 89, 0.12)', color: '#34c759',
                }}>
                    LIVE
                </span>
            )}
        </div>
    );
}
