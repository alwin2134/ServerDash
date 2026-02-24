import React, { useState, useEffect } from 'react';
import { getEvents, getServers } from '../api/client';
import { Activity, AlertTriangle, AlertCircle, Info, RefreshCw, PowerOff, Power } from 'lucide-react';

export default function Timeline() {
    const [events, setEvents] = useState([]);
    const [servers, setServers] = useState([]);
    const [selectedServer, setSelectedServer] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        getServers()
            .then(data => setServers(data.servers || []))
            .catch(err => console.error("Failed to fetch servers", err));
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [selectedServer]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const data = await getEvents(selectedServer || null, 100);
            setEvents(data.events || []);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getIconForEvent = (type) => {
        switch (type) {
            case 'alert_created': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'alert_resolved': return <Activity className="w-5 h-5 text-green-500" />;
            case 'state_changed': return <RefreshCw className="w-5 h-5 text-blue-500" />;
            case 'agent_offline': return <PowerOff className="w-5 h-5 text-gray-500" />;
            case 'agent_online': return <Power className="w-5 h-5 text-green-500" />;
            default: return <Info className="w-5 h-5 text-gray-400" />;
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'border-red-500/50 bg-red-500/10 text-red-400';
            case 'warning': return 'border-amber-500/50 bg-amber-500/10 text-amber-400';
            default: return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
        }
    };

    const getServerName = (id) => {
        const s = servers.find(svr => svr.id === id);
        return s ? s.hostname : (id || 'System');
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Timeline</h1>
                    <p className="text-slate-400 text-sm mt-1">Chronological history of operational events across your infrastructure.</p>
                </div>

                <div className="flex gap-2">
                    <select
                        className="bg-slate-800/80 border border-slate-700/50 text-slate-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3 py-2 outline-none transition-colors"
                        value={selectedServer}
                        onChange={e => setSelectedServer(e.target.value)}
                    >
                        <option value="">All Servers</option>
                        {servers.map(s => (
                            <option key={s.id} value={s.id}>{s.hostname}</option>
                        ))}
                    </select>

                    <button
                        onClick={fetchEvents}
                        disabled={loading}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition flex items-center justify-center disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
                        &times;
                    </button>
                </div>
            )}

            {loading && events.length === 0 ? (
                <div className="flex justify-center p-12">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            ) : events.length === 0 ? (
                <div className="text-center p-12 bg-slate-900/50 rounded-xl border border-slate-800/50 text-slate-400">
                    No operational events logged yet.
                </div>
            ) : (
                <div className="relative border-l border-slate-800 ml-4 space-y-8 pl-8 py-4">
                    {events.map((evt, idx) => (
                        <div key={evt.id || idx} className="relative group">
                            {/* Line connecting marker */}
                            <div className="absolute -left-8 -translate-x-1/2 top-4 w-10 border-t border-slate-800 group-hover:border-slate-600 transition-colors"></div>

                            {/* Icon Marker */}
                            <div className="absolute -left-8 -translate-x-1/2 -translate-y-1/2 top-4 w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center z-10">
                                {getIconForEvent(evt.event_type)}
                            </div>

                            <div className={`p-4 rounded-xl border ${getSeverityColor(evt.severity)} shadow-sm transition-all bg-opacity-50 backdrop-blur-sm`}>
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <div className="text-slate-300 font-medium mb-1">
                                            {evt.message}
                                        </div>
                                        <div className="flex gap-2 text-xs text-slate-400 font-mono flex-wrap">
                                            <span className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/50">
                                                {getServerName(evt.server_id)}
                                            </span>
                                            <span className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/50">
                                                {evt.event_type}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
                                        {new Date(evt.timestamp).toLocaleString()}
                                    </div>
                                </div>
                                {evt.metadata && (
                                    <div className="mt-3 text-xs font-mono text-slate-400 bg-black/20 p-2 rounded overflow-x-auto border border-white/5">
                                        {evt.metadata}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
