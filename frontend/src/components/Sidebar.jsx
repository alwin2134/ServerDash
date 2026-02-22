import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Server,
    ListTree,
    Network,
    Bell,
    Clock,
    Settings,
    Command,
} from 'lucide-react';
import useServerStore from '../store/serverStore';

const mainNav = [
    { to: '/overview', icon: LayoutDashboard, label: 'Overview' },
    { to: '/services', icon: Server, label: 'Services' },
    { to: '/processes', icon: ListTree, label: 'Processes' },
    { to: '/ports', icon: Network, label: 'Ports' },
    { to: '/alerts', icon: Bell, label: 'Alerts', badge: true },
];

const secondaryNav = [
    { to: '#', icon: Clock, label: 'Timeline', disabled: true },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
    const unreadAlertCount = useServerStore((s) => s.unreadAlertCount);

    return (
        <aside
            style={{
                width: 232,
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--color-surface-0)',
                borderRight: '1px solid var(--color-border-subtle)',
                userSelect: 'none',
            }}
        >
            {/* ── Brand ───────────────────────────────────────── */}
            <div style={{ padding: '24px 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-purple) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <rect x="1" y="1" width="6.5" height="6.5" rx="2" fill="white" fillOpacity="0.9" />
                            <rect x="10.5" y="1" width="6.5" height="6.5" rx="2" fill="white" fillOpacity="0.5" />
                            <rect x="1" y="10.5" width="6.5" height="6.5" rx="2" fill="white" fillOpacity="0.5" />
                            <rect x="10.5" y="10.5" width="6.5" height="6.5" rx="2" fill="white" fillOpacity="0.25" />
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
                            ServerDash
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-quaternary)', marginTop: 1 }}>
                            Command Center
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Nav ────────────────────────────────────── */}
            <div style={{ padding: '0 12px' }}>
                <SectionLabel>Monitor</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {mainNav.map((item) => (
                        <NavItem
                            key={item.label}
                            {...item}
                            badgeCount={item.badge ? unreadAlertCount : 0}
                        />
                    ))}
                </div>
            </div>

            {/* ── Secondary Nav ───────────────────────────────── */}
            <div style={{ padding: '16px 12px 0' }}>
                <SectionLabel>System</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {secondaryNav.map((item) => (
                        <NavItem key={item.label} {...item} />
                    ))}
                </div>
            </div>

            {/* ── Spacer ──────────────────────────────────────── */}
            <div style={{ flex: 1 }} />

            {/* ── Keyboard shortcut hint ──────────────────────── */}
            <div style={{ padding: '0 16px 12px' }}>
                <div
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 14px', borderRadius: 10,
                        background: 'var(--color-surface-1)',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                    }}
                    onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface-1)'}
                >
                    <Command size={13} style={{ color: 'var(--color-text-quaternary)' }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-quaternary)', flex: 1 }}>
                        Command Palette
                    </span>
                    <kbd style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
                        background: 'var(--color-surface-3)', color: 'var(--color-text-quaternary)',
                        border: '1px solid var(--color-border-subtle)',
                    }}>
                        Ctrl K
                    </kbd>
                </div>
            </div>

            {/* ── Footer ──────────────────────────────────────── */}
            <div style={{ padding: '0 16px 20px' }}>
                <div
                    style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: 'var(--color-surface-1)',
                        border: '1px solid var(--color-border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-quaternary)' }}>
                        v2.0 · Phase 2
                    </span>
                    <span
                        style={{
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--color-green)',
                            background: 'var(--color-green-muted)',
                            padding: '3px 8px',
                            borderRadius: 6,
                        }}
                    >
                        Live
                    </span>
                </div>
            </div>
        </aside>
    );
}

function SectionLabel({ children }) {
    return (
        <div
            style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-text-quaternary)',
                padding: '0 8px 8px',
            }}
        >
            {children}
        </div>
    );
}

function NavItem({ to, icon: Icon, label, disabled, badgeCount = 0 }) {
    const location = useLocation();
    const isActive = !disabled && location.pathname === to;

    return (
        <NavLink
            to={disabled ? '#' : to}
            onClick={(e) => disabled && e.preventDefault()}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                position: 'relative',
                transition: 'all 0.15s ease',
                background: isActive ? 'var(--color-surface-3)' : 'transparent',
                color: disabled
                    ? 'var(--color-text-quaternary)'
                    : isActive
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-tertiary)',
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
                if (!disabled && !isActive) {
                    e.currentTarget.style.background = 'var(--color-surface-2)';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                }
            }}
            onMouseLeave={(e) => {
                if (!disabled && !isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-tertiary)';
                }
            }}
        >
            {isActive && (
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 3,
                        height: 16,
                        borderRadius: '0 3px 3px 0',
                        background: 'var(--color-accent)',
                        boxShadow: '0 0 8px var(--color-accent-muted)',
                    }}
                />
            )}
            <Icon size={17} strokeWidth={isActive ? 2 : 1.7} />
            <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, flex: 1 }}>{label}</span>

            {/* Badge count */}
            {badgeCount > 0 && (
                <span style={{
                    fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: 'center',
                    padding: '2px 6px', borderRadius: 8,
                    background: 'var(--color-red)', color: 'white',
                }}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                </span>
            )}

            {disabled && (
                <span
                    style={{
                        marginLeft: 'auto',
                        fontSize: 9,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--color-text-quaternary)',
                        background: 'var(--color-surface-3)',
                        padding: '2px 6px',
                        borderRadius: 5,
                    }}
                >
                    Soon
                </span>
            )}
        </NavLink>
    );
}
