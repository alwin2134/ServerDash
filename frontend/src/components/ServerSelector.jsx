import { ChevronDown, Server } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import useServerStore from '../store/serverStore';

export default function ServerSelector() {
    const servers = useServerStore((s) => s.servers);
    const activeServerId = useServerStore((s) => s.activeServerId);
    const setActiveServer = useServerStore((s) => s.setActiveServer);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const active = servers.find((s) => s.id === activeServerId);

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div style={{ position: 'relative' }} ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    borderRadius: 12, padding: '8px 12px',
                    border: 'none', cursor: 'pointer',
                    background: open ? 'var(--color-surface-2)' : 'transparent',
                    transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                    if (!open) e.currentTarget.style.background = 'var(--color-surface-2)';
                }}
                onMouseLeave={(e) => {
                    if (!open) e.currentTarget.style.background = 'transparent';
                }}
            >
                <div style={{
                    display: 'flex', width: 28, height: 28,
                    alignItems: 'center', justifyContent: 'center',
                    borderRadius: 8, background: 'var(--color-surface-3)',
                }}>
                    <Server size={14} strokeWidth={1.8} style={{ color: 'var(--color-text-secondary)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: 'var(--color-text-primary)' }}>
                        {active ? active.hostname : 'No Servers'}
                    </span>
                    {active && (
                        <span style={{ fontSize: 10, lineHeight: 1.2, color: 'var(--color-text-quaternary)' }}>
                            {active.os_info || active.id}
                        </span>
                    )}
                </div>
                <ChevronDown
                    size={14}
                    strokeWidth={2}
                    style={{
                        color: 'var(--color-text-quaternary)',
                        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                    }}
                />
            </button>

            {open && servers.length > 0 && (
                <div
                    className="slide-in"
                    style={{
                        position: 'absolute', left: 0, top: '100%', zIndex: 50,
                        marginTop: 8, minWidth: 240, overflow: 'hidden',
                        borderRadius: 16, padding: 6,
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border-default)',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--color-border-subtle)',
                    }}
                >
                    {servers.map((s) => {
                        const isSelected = s.id === activeServerId;
                        return (
                            <button
                                key={s.id}
                                onClick={() => { setActiveServer(s.id); setOpen(false); }}
                                style={{
                                    display: 'flex', width: '100%', alignItems: 'center', gap: 12,
                                    borderRadius: 12, padding: '10px 12px', textAlign: 'left',
                                    border: 'none', cursor: 'pointer',
                                    background: isSelected ? 'var(--color-accent-subtle)' : 'transparent',
                                    transition: 'all 0.1s',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-3)';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <div style={{
                                    width: 8, height: 8, flexShrink: 0, borderRadius: '50%',
                                    background: s.status === 'online' ? 'var(--color-green)' : 'var(--color-text-quaternary)',
                                    boxShadow: s.status === 'online' ? '0 0 8px var(--color-green-subtle)' : 'none',
                                }} />
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <span style={{
                                        fontSize: 13, fontWeight: 500,
                                        color: isSelected ? 'var(--color-accent-light)' : 'var(--color-text-primary)',
                                    }}>
                                        {s.hostname}
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--color-text-quaternary)' }}>
                                        {s.ip_address || s.id}
                                    </span>
                                </div>
                                {isSelected && (
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path d="M3 7L6 10L11 4" stroke="var(--color-accent-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
