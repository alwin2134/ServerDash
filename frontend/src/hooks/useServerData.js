/**
 * ServerDash — Hook for initial data fetch + conditional polling fallback.
 * Polling only runs when WebSocket is disconnected.
 */

import { useEffect, useCallback } from 'react';
import useServerStore from '../store/serverStore';
import { getServers, getMetrics, getServices, getProcesses, getPorts } from '../api/client';

export default function useServerData() {
    const activeServerId = useServerStore((s) => s.activeServerId);
    const wsConnected = useServerStore((s) => s.wsConnected);
    const setServers = useServerStore((s) => s.setServers);
    const updateMetrics = useServerStore((s) => s.updateMetrics);
    const updateServices = useServerStore((s) => s.updateServices);
    const updateProcesses = useServerStore((s) => s.updateProcesses);
    const updatePorts = useServerStore((s) => s.updatePorts);

    const fetchAll = useCallback(async () => {
        try {
            const servers = await getServers();
            setServers(servers);
        } catch (e) {
            console.warn('[data] Failed to fetch servers:', e);
        }

        const sid = useServerStore.getState().activeServerId;
        if (!sid) return;

        try {
            const metrics = await getMetrics(sid);
            if (Array.isArray(metrics) && metrics.length > 0) {
                updateMetrics(sid, metrics[0]);
            }
        } catch (e) { /* silent */ }

        try {
            const svcData = await getServices(sid);
            if (svcData?.services) updateServices(sid, svcData.services);
        } catch (e) { /* silent */ }

        try {
            const procData = await getProcesses(sid);
            if (procData?.processes) updateProcesses(sid, procData.processes);
        } catch (e) { /* silent */ }

        try {
            const portData = await getPorts(sid);
            if (portData?.ports) updatePorts(sid, portData.ports);
        } catch (e) { /* silent */ }
    }, [activeServerId]);

    useEffect(() => {
        // Always fetch once on mount / server change
        fetchAll();

        // Poll only when WS is disconnected
        if (!wsConnected) {
            const interval = setInterval(fetchAll, 10000);
            return () => clearInterval(interval);
        }
    }, [fetchAll, wsConnected]);

    return { refresh: fetchAll };
}
