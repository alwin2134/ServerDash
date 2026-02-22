/**
 * ServerDash — API client & WebSocket helpers.
 * Phase 2: Added auth token, history, alerts endpoints.
 */

const BASE = '';

function getAuthHeaders() {
    const token = localStorage.getItem('serverdash_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

export async function apiFetch(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { ...getAuthHeaders(), ...options.headers },
        ...options,
    });
    if (res.status === 401) {
        localStorage.removeItem('serverdash_token');
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
}

// Auth
export function login(username, password) {
    return apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

// Servers
export function getServers() {
    return apiFetch('/api/servers');
}

export function deleteServer(serverId) {
    return apiFetch(`/api/servers/${serverId}`, { method: 'DELETE' });
}

// Metrics
export function getMetrics(serverId) {
    const q = serverId ? `?server_id=${serverId}` : '';
    return apiFetch(`/api/system/metrics${q}`);
}

export function getServices(serverId) {
    const q = serverId ? `?server_id=${serverId}` : '';
    return apiFetch(`/api/services${q}`);
}

export function getProcesses(serverId) {
    const q = serverId ? `?server_id=${serverId}` : '';
    return apiFetch(`/api/processes${q}`);
}

export function getPorts(serverId) {
    const q = serverId ? `?server_id=${serverId}` : '';
    return apiFetch(`/api/ports${q}`);
}

// Phase 2
export function getHistory(serverId, limit = 60) {
    return apiFetch(`/api/history/${serverId}?limit=${limit}`);
}

export function getAlerts(serverId, limit = 50) {
    const q = serverId ? `?server_id=${serverId}&limit=${limit}` : `?limit=${limit}`;
    return apiFetch(`/api/alerts${q}`);
}

export function getAlertCount() {
    return apiFetch('/api/alerts/count');
}

export function acknowledgeAlert(alertId) {
    return apiFetch(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
}

export function acknowledgeAllAlerts(serverId) {
    const q = serverId ? `?server_id=${serverId}` : '';
    return apiFetch(`/api/alerts/acknowledge-all${q}`, { method: 'POST' });
}
