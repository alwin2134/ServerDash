/**
 * ServerDash — WebSocket hook for real-time data.
 * Phase 2.1: JWT auth via query param, health updates, alerts.
 */

import { useEffect, useRef } from 'react';
import useServerStore from '../store/serverStore';

export default function useWebSocket() {
    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);

    useEffect(() => {
        const { setWsConnected, updateMetrics, updateServices, updateProcesses, updatePorts, updateDocker, updateHealth, addAlert, upsertServer } =
            useServerStore.getState();

        function connect() {
            const token = localStorage.getItem('serverdash_token');
            if (!token) return; // Don't connect without auth

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[ws] Connected (authenticated)');
                setWsConnected(true);
                if (reconnectTimer.current) {
                    clearTimeout(reconnectTimer.current);
                    reconnectTimer.current = null;
                }
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);

                    if (msg.type === 'agent_update' && msg.data) {
                        const { server_id } = msg.data;
                        if (msg.data.metrics) updateMetrics(server_id, msg.data.metrics);
                        if (msg.data.services) updateServices(server_id, msg.data.services);
                        if (msg.data.processes) updateProcesses(server_id, msg.data.processes);
                        if (msg.data.ports) updatePorts(server_id, msg.data.ports);
                        if (msg.data.docker) updateDocker(server_id, msg.data.docker);
                    }

                    if (msg.type === 'health' && msg.data) {
                        updateHealth(msg.data.server_id, msg.data);
                    }

                    if (msg.type === 'server_status' && msg.data) {
                        upsertServer(msg.data);
                    }

                    if (msg.type === 'alert' && msg.data) {
                        addAlert(msg.data);
                    }
                } catch (e) {
                    console.warn('[ws] Parse error:', e);
                }
            };

            ws.onclose = (event) => {
                console.log(`[ws] Disconnected (code: ${event.code}), reconnecting in 3s...`);
                setWsConnected(false);
                // Don't reconnect if auth failure
                if (event.code === 4001) {
                    console.warn('[ws] Auth failed — not reconnecting');
                    return;
                }
                reconnectTimer.current = setTimeout(connect, 3000);
            };

            ws.onerror = () => ws.close();
        }

        connect();

        // Keepalive ping every 30s
        const pingInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send('ping');
            }
        }, 30000);

        return () => {
            clearInterval(pingInterval);
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, []);
}
