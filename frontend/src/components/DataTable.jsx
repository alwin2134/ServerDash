/**
 * DataTable — Premium data table with sort and hover rows.
 */

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function DataTable({ columns, data, emptyMessage = 'No data available' }) {
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortKey(key); setSortDir('desc'); }
    };

    const sorted = [...data].sort((a, b) => {
        if (!sortKey) return 0;
        const av = a[sortKey], bv = b[sortKey];
        if (av == null) return 1;
        if (bv == null) return -1;
        const c = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? c : -c;
    });

    /* Empty state */
    if (data.length === 0) {
        return (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
                <div style={{
                    width: 48, height: 48, borderRadius: 16,
                    background: 'var(--color-surface-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="2" y="4" width="16" height="2" rx="1" fill="var(--color-text-quaternary)" />
                        <rect x="2" y="9" width="12" height="2" rx="1" fill="var(--color-text-quaternary)" opacity="0.6" />
                        <rect x="2" y="14" width="8" height="2" rx="1" fill="var(--color-text-quaternary)" opacity="0.3" />
                    </svg>
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-tertiary)' }}>
                    {emptyMessage}
                </span>
            </div>
        );
    }

    return (
        <div className="card-flush">
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                            {columns.map((col) => {
                                const active = sortKey === col.key;
                                return (
                                    <th
                                        key={col.key}
                                        onClick={() => col.sortable !== false && toggleSort(col.key)}
                                        style={{
                                            padding: '12px 20px',
                                            fontSize: 10,
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.07em',
                                            color: active ? 'var(--color-text-secondary)' : 'var(--color-text-quaternary)',
                                            width: col.width || 'auto',
                                            textAlign: col.align || 'left',
                                            cursor: col.sortable !== false ? 'pointer' : 'default',
                                            userSelect: 'none',
                                            whiteSpace: 'nowrap',
                                            background: 'var(--color-surface-1)',
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 1,
                                        }}
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            {col.label}
                                            {active && (
                                                sortDir === 'asc'
                                                    ? <ChevronUp size={12} strokeWidth={2.5} />
                                                    : <ChevronDown size={12} strokeWidth={2.5} />
                                            )}
                                        </span>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((row, i) => (
                            <tr
                                key={row.id || row.pid || row.port || i}
                                style={{
                                    borderBottom: i < sorted.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                                    transition: 'background 0.1s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        style={{
                                            padding: '11px 20px',
                                            fontSize: col.mono ? 12 : 13,
                                            fontWeight: 500,
                                            color: 'var(--color-text-primary)',
                                            textAlign: col.align || 'left',
                                            ...(col.mono ? {
                                                fontVariantNumeric: 'tabular-nums',
                                                fontFamily: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, monospace",
                                            } : {}),
                                        }}
                                    >
                                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
