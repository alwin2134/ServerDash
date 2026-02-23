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
export function getHistory(serverId, limit = 60, range = null) {
    let q = `?limit=${limit}`;
    if (range) q += `&range=${range}`;
    return apiFetch(`/api/history/${serverId}${q}`);
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

// Phase 3: Docker
export function getDockerContainers(serverId) {
    const q = serverId ? `?server_id=${serverId}` : '';
    return apiFetch(`/api/docker${q}`);
}

export function dockerAction(serverId, containerId, action) {
    return apiFetch(`/api/docker/${serverId}/action`, {
        method: 'POST',
        body: JSON.stringify({ container_id: containerId, action }),
    });
}

export function getDockerLogs(serverId, containerId, lines = 100) {
    return apiFetch(`/api/docker/${serverId}/logs/${containerId}?lines=${lines}`);
}

// Phase 3: Process kill
export function killProcess(serverId, pid, sig = 'SIGTERM') {
    return apiFetch(`/api/processes/${serverId}/kill`, {
        method: 'POST',
        body: JSON.stringify({ pid, signal: sig }),
    });
}

// Phase 3: Command status
export function getCommandStatus(commandId) {
    return apiFetch(`/api/agent/commands/${commandId}/status`);
}

// Phase 4: Docker deploy/remove
export function dockerDeploy(serverId, config) {
    return apiFetch(`/api/docker/${serverId}/deploy-container`, {
        method: 'POST',
        body: JSON.stringify(config),
    });
}

export function dockerRemove(serverId, containerId, force = true) {
    return apiFetch(`/api/docker/${serverId}/remove`, {
        method: 'POST',
        body: JSON.stringify({ container_id: containerId, force }),
    });
}

// Phase 4: App Store
export function getAppCatalog() {
    return apiFetch('/api/apps/catalog');
}

export function installApp(serverId, appConfig) {
    return apiFetch(`/api/apps/${serverId}/install`, {
        method: 'POST',
        body: JSON.stringify(appConfig),
    });
}
