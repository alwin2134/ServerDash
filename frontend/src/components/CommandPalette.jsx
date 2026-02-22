/**
 * CommandPalette — Ctrl+K / Cmd+K quick-action overlay.
 * Keyboard-navigable, filterable command list.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutDashboard, Server, ListTree, Network, Bell, Settings, LogOut } from 'lucide-react';
import useServerStore from '../store/serverStore';

const NAV_COMMANDS = [
    { id: 'go-overview', label: 'Go to Overview', icon: LayoutDashboard, action: 'nav', path: '/overview', group: 'Navigation' },
    { id: 'go-services', label: 'Go to Services', icon: Server, action: 'nav', path: '/services', group: 'Navigation' },
    { id: 'go-processes', label: 'Go to Processes', icon: ListTree, action: 'nav', path: '/processes', group: 'Navigation' },
    { id: 'go-ports', label: 'Go to Ports', icon: Network, action: 'nav', path: '/ports', group: 'Navigation' },
    { id: 'go-alerts', label: 'Go to Alerts', icon: Bell, action: 'nav', path: '/alerts', group: 'Navigation' },
    { id: 'go-settings', label: 'Go to Settings', icon: Settings, action: 'nav', path: '/settings', group: 'Navigation' },
];

const ACTION_COMMANDS = [
    { id: 'logout', label: 'Sign Out', icon: LogOut, action: 'logout', group: 'Actions' },
];

const ALL_COMMANDS = [...NAV_COMMANDS, ...ACTION_COMMANDS];

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const setToken = useServerStore((s) => s.setToken);

    const filtered = query
        ? ALL_COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
        : ALL_COMMANDS;

    // Group by category
    const groups = {};
    filtered.forEach((c) => {
        if (!groups[c.group]) groups[c.group] = [];
        groups[c.group].push(c);
    });

    const flatList = filtered;

    function runCommand(cmd) {
        setOpen(false);
        setQuery('');
        if (cmd.action === 'nav') navigate(cmd.path);
        else if (cmd.action === 'logout') {
            setToken(null);
            navigate('/login');
        }
    }

    const handleKeyDown = useCallback((e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setOpen((v) => !v);
            setQuery('');
            setActive(0);
        }
        if (e.key === 'Escape') {
            setOpen(false);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 50);
    }, [open]);

    useEffect(() => { setActive(0); }, [query]);

    function onListKeyDown(e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, flatList.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
        if (e.key === 'Enter' && flatList[active]) { e.preventDefault(); runCommand(flatList[active]); }
    }

    if (!open) return null;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                paddingTop: '20vh',
            }}
            onClick={() => setOpen(false)}
        >
            <div
                className="slide-in"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: 520, maxHeight: 420,
                    background: 'var(--color-surface-1)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 16,
                    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                }}
            >
                {/* Search input */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--color-border-subtle)',
                }}>
                    <Search size={18} style={{ color: 'var(--color-text-quaternary)', flexShrink: 0 }} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onListKeyDown}
                        placeholder="Type a command…"
                        style={{
                            flex: 1, background: 'transparent', border: 'none', outline: 'none',
                            fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)',
                        }}
                    />
                    <kbd style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 5,
                        background: 'var(--color-surface-3)', color: 'var(--color-text-quaternary)',
                        border: '1px solid var(--color-border-subtle)',
                    }}>
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                    {Object.entries(groups).map(([group, cmds]) => (
                        <div key={group}>
                            <div style={{
                                fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                                color: 'var(--color-text-quaternary)', padding: '8px 10px 4px',
                            }}>
                                {group}
                            </div>
                            {cmds.map((cmd) => {
                                const idx = flatList.indexOf(cmd);
                                const isActive = idx === active;
                                return (
                                    <div
                                        key={cmd.id}
                                        onClick={() => runCommand(cmd)}
                                        onMouseEnter={() => setActive(idx)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '10px 12px', borderRadius: 10,
                                            cursor: 'pointer',
                                            background: isActive ? 'var(--color-surface-3)' : 'transparent',
                                            color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                            transition: 'background 0.08s',
                                        }}
                                    >
                                        <cmd.icon size={16} strokeWidth={1.8} />
                                        <span style={{ fontSize: 13, fontWeight: 500 }}>{cmd.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                    {flatList.length === 0 && (
                        <div style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--color-text-quaternary)', fontSize: 13 }}>
                            No matching commands
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
