/**
 * ServerDash — Zustand store for server state.
 * Phase 2: Added health state, alerts, history.
 */

import { create } from 'zustand';

const useServerStore = create((set, get) => ({
    // Server list
    servers: [],
    activeServerId: null,

    setServers: (servers) => {
        const state = get();
        set({
            servers,
            activeServerId: state.activeServerId || (servers.length > 0 ? servers[0].id : null),
        });
    },

    setActiveServer: (id) => set({ activeServerId: id }),

    // Real-time data
    metrics: {},
    services: {},
    processes: {},
    ports: {},

    updateMetrics: (serverId, data) =>
        set((s) => ({ metrics: { ...s.metrics, [serverId]: data } })),

    updateServices: (serverId, data) =>
        set((s) => ({ services: { ...s.services, [serverId]: data } })),

    updateProcesses: (serverId, data) =>
        set((s) => ({ processes: { ...s.processes, [serverId]: data } })),

    updatePorts: (serverId, data) =>
        set((s) => ({ ports: { ...s.ports, [serverId]: data } })),

    // Phase 2: Health state
    health: {},
    updateHealth: (serverId, data) =>
        set((s) => ({ health: { ...s.health, [serverId]: data } })),

    // Phase 2: Alerts
    alerts: [],
    unreadAlertCount: 0,
    setAlerts: (alerts) => set({ alerts }),
    setUnreadAlertCount: (count) => set({ unreadAlertCount: count }),
    addAlert: (alert) =>
        set((s) => ({
            alerts: [alert, ...s.alerts].slice(0, 100),
            unreadAlertCount: s.unreadAlertCount + 1,
        })),

    // Phase 2: Historical metrics
    history: {},
    setHistory: (serverId, data) =>
        set((s) => ({ history: { ...s.history, [serverId]: data } })),

    // Auth
    token: localStorage.getItem('serverdash_token') || null,
    setToken: (token) => {
        if (token) localStorage.setItem('serverdash_token', token);
        else localStorage.removeItem('serverdash_token');
        set({ token });
    },

    // WebSocket connection status
    wsConnected: false,
    setWsConnected: (v) => set({ wsConnected: v }),
}));

export default useServerStore;
