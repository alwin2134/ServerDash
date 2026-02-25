import React, { useState, useEffect, useRef } from 'react';
import useServerStore from '../store/serverStore';
import ServerSelector from '../components/ServerSelector';
import { Terminal as TerminalIcon, Play, Loader2, Sparkles, AlertCircle, X, Check, BrainCircuit } from 'lucide-react';
import { runShellCommand, getCommandStatus, aiGenerateCommand, aiExplainOutput } from '../api/client';

export default function Terminal() {
    const activeServerId = useServerStore(s => s.activeServerId);
    const server = useServerStore(s => s.servers.find(srv => srv.id === activeServerId));

    const [input, setInput] = useState('');
    const [history, setHistory] = useState([]); // { type: 'cmd'|'stdout'|'stderr'|'ai'|'error', text: string }
    const [runningCmdId, setRunningCmdId] = useState(null);
    const [isPolling, setIsPolling] = useState(false);

    // Dynamic shell state
    const [shellUser, setShellUser] = useState(null);
    const [shellHost, setShellHost] = useState(null);
    const [shellDir, setShellDir] = useState('~');

    // AI States
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExplaining, setIsExplaining] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [showAiInput, setShowAiInput] = useState(false);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll to bottom of terminal
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [history]);

    // Poll for command completion
    useEffect(() => {
        if (!runningCmdId || !isPolling) return;

        let iv = setInterval(async () => {
            try {
                const check = await getCommandStatus(runningCmdId);
                if (check.status === 'completed') {
                    setIsPolling(false);
                    setRunningCmdId(null);

                    const res = check.result || {};
                    const out = res.stdout || '';
                    const err = res.stderr || '';
                    const errObj = res.error || '';

                    if (out) appendHistory('stdout', out);
                    if (err) appendHistory('stderr', err);
                    if (errObj) appendHistory('error', errObj);

                    if (!out && !err && !errObj) {
                        appendHistory('stdout', `Exited with code ${res.exit_code || 0}`);
                    }

                    // Update Prompt State
                    if (res.user) setShellUser(res.user);
                    if (res.host) setShellHost(res.host);
                    if (res.cwd) setShellDir(res.cwd);

                    // Small delay, then focus input
                    setTimeout(() => inputRef.current?.focus(), 100);
                }
            } catch (err) {
                console.error("Poll err", err);
                setIsPolling(false);
                setRunningCmdId(null);
                appendHistory('error', `Failed to poll status: ${err.message}`);
            }
        }, 1500);

        return () => clearInterval(iv);
    }, [runningCmdId, isPolling]);

    const appendHistory = (type, text) => {
        setHistory(prev => [...prev, { type, text }]);
    };

    const handleRunCommand = async (e) => {
        e?.preventDefault();
        const cmd = input.trim();
        if (!cmd || !activeServerId || isPolling) return;

        // Display the interactive prompt history
        const promptString = shellUser && shellHost
            ? `${shellUser}@${shellHost}:${shellDir}$`
            : '$';

        appendHistory('cmd', `${promptString} ${cmd}`);
        setInput('');
        setIsPolling(true);
        setShowAiInput(false);

        try {
            const res = await runShellCommand(activeServerId, cmd);
            setRunningCmdId(res.command_id);
        } catch (err) {
            setIsPolling(false);
            appendHistory('error', `Execution failed: ${err.message}`);
        }
    };

    const handleAiGenerate = async (e) => {
        e?.preventDefault();
        const prompt = aiPrompt.trim();
        if (!prompt || isGenerating) return;

        setIsGenerating(true);
        try {
            const res = await aiGenerateCommand(prompt, server?.os_info || 'Unknown OS');
            setInput(res.command);
            setShowAiInput(false);
            setAiPrompt('');
            inputRef.current?.focus();
        } catch (err) {
            appendHistory('error', `AI Generation failed: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAiExplain = async () => {
        // Find the last command and its output
        if (history.length < 2 || isExplaining) return;

        // Walk backwards to find the last command
        let lastCmd = '';
        let lastStdout = '';
        let lastStderr = '';
        let foundCmd = false;

        for (let i = history.length - 1; i >= 0; i--) {
            const h = history[i];
            if (h.type === 'stderr') lastStderr = h.text + '\n' + lastStderr;
            if (h.type === 'stdout') lastStdout = h.text + '\n' + lastStdout;
            if (h.type === 'cmd') {
                lastCmd = h.text.replace(/^\$ /, '');
                foundCmd = true;
                break;
            }
        }

        if (!foundCmd) return;

        setIsExplaining(true);
        appendHistory('ai', `🧠 Analyzing output of '${lastCmd}'...`);
        try {
            const res = await aiExplainOutput(lastCmd, lastStdout, lastStderr, -1, server?.os_info || 'Unknown OS');
            appendHistory('ai', `💡 AI Explanation:\n${res.explanation}`);
        } catch (err) {
            appendHistory('error', `AI Explanation failed: ${err.message}`);
        } finally {
            setIsExplaining(false);
        }
    };

    if (!activeServerId) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                    <Server size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <p>Select a server to open Terminal</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexShrink: 0 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>Terminal</h1>
                    <p style={{ color: 'var(--color-text-tertiary)', fontSize: 13, marginTop: 4 }}>
                        Remote shell execution on {server?.hostname}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <ServerSelector />
                </div>
            </div>

            {/* Terminal Window */}
            <div style={{
                flex: 1,
                background: '#0d1117', // Github dark dim
                borderRadius: 12,
                border: '1px solid var(--color-border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
            }}>
                {/* Header bar */}
                <div style={{
                    padding: '8px 16px',
                    background: '#161b22',
                    borderBottom: '1px solid #30363d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TerminalIcon size={14} color="#8b949e" />
                        <span style={{ fontSize: 12, color: '#8b949e', fontFamily: 'monospace' }}>
                            {server?.os_info?.toLowerCase().includes('windows') ? 'pwsh.exe' : '/bin/bash'} — {server?.hostname}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={() => setHistory([])}
                            style={{
                                background: 'transparent', border: 'none', color: '#8b949e',
                                fontSize: 11, cursor: 'pointer', padding: '2px 8px', borderRadius: 4
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#30363d'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            Clear
                        </button>
                        <button
                            onClick={handleAiExplain}
                            title="Explain output of the last command"
                            disabled={isExplaining || history.length === 0}
                            style={{
                                background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                                color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 6,
                                fontSize: 11, cursor: history.length === 0 ? 'not-allowed' : 'pointer', padding: '2px 8px', borderRadius: 4,
                                opacity: (isExplaining || history.length === 0) ? 0.5 : 1
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                        >
                            {isExplaining ? <Loader2 size={12} className="spin" /> : <BrainCircuit size={12} />}
                            Explain Errors
                        </button>
                    </div>
                </div>

                {/* Output Area */}
                <div
                    style={{
                        flex: 1,
                        padding: 16,
                        overflowY: 'auto',
                        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: '#c9d1d9',
                    }}
                    onClick={() => inputRef.current?.focus()}
                >
                    {history.length === 0 && (
                        <div style={{ color: '#8b949e', fontStyle: 'italic', marginBottom: 16 }}>
                            Connected to {server?.hostname}. Type a command or ask AI to generate one.
                        </div>
                    )}

                    {history.map((h, i) => (
                        <div key={i} style={{
                            marginBottom: 8,
                            color: h.type === 'cmd' ? '#58a6ff' :
                                h.type === 'stderr' || h.type === 'error' ? '#ff7b72' :
                                    h.type === 'ai' ? '#a371f7' : '#c9d1d9',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all'
                        }}>
                            {h.text}
                        </div>
                    ))}

                    {isPolling && (
                        <div style={{ color: '#8b949e', display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                            <Loader2 size={12} className="spin" /> Running command...
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input Area */}
                <div style={{
                    padding: '12px 16px',
                    background: '#161b22',
                    borderTop: '1px solid #30363d',
                }}>

                    {/* AI Prompt Input (Expandable) */}
                    {showAiInput && (
                        <form onSubmit={handleAiGenerate} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <div style={{
                                flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                                background: '#0d1117', border: '1px solid #a371f7', borderRadius: 6, padding: '6px 12px',
                                boxShadow: '0 0 0 1px rgba(163, 113, 247, 0.2)'
                            }}>
                                <Sparkles size={14} color="#a371f7" />
                                <input
                                    autoFocus
                                    value={aiPrompt}
                                    onChange={e => setAiPrompt(e.target.value)}
                                    placeholder="Ask AI to write a command (e.g. 'find all files over 50MB')"
                                    style={{
                                        flex: 1, background: 'transparent', border: 'none', color: '#c9d1d9',
                                        outline: 'none', fontSize: 13, fontFamily: 'inherit'
                                    }}
                                    disabled={isGenerating}
                                />
                                {isGenerating ? (
                                    <Loader2 size={14} color="#a371f7" className="spin" />
                                ) : (
                                    <button type="button" onClick={() => setShowAiInput(false)} style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', display: 'flex' }}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </form>
                    )}

                    {/* Standard Shell Input */}
                    <form onSubmit={handleRunCommand} style={{ display: 'flex', gap: 8 }}>
                        <div style={{
                            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                            background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: '8px 12px',
                            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace", fontSize: 13
                        }}>
                            {shellUser && shellHost ? (
                                <span style={{ whiteSpace: 'nowrap' }}>
                                    <span style={{ color: '#3fb950', fontWeight: 'bold' }}>{shellUser}@{shellHost}</span>
                                    <span style={{ color: '#d2a8ff' }}>:</span>
                                    <span style={{ color: '#79c0ff' }}>{shellDir}</span>
                                    <span style={{ color: '#c9d1d9', marginLeft: 4 }}>$</span>
                                </span>
                            ) : (
                                <span style={{ color: '#3fb950', fontWeight: 'bold' }}>$</span>
                            )}
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder={isPolling ? "Executing..." : "Enter command..."}
                                disabled={isPolling}
                                style={{
                                    flex: 1, background: 'transparent', border: 'none', color: '#c9d1d9',
                                    outline: 'none', fontSize: 13, fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace"
                                }}
                                autoComplete="off"
                                spellCheck="false"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowAiInput(!showAiInput)}
                            disabled={isPolling || isGenerating}
                            style={{
                                background: 'transparent', border: '1px solid #30363d', borderRadius: 6,
                                padding: '0 12px', color: '#a371f7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                fontSize: 13, fontWeight: 500, transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#30363d'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Sparkles size={14} /> AI
                        </button>

                        <button
                            type="submit"
                            disabled={!input.trim() || isPolling}
                            style={{
                                background: '#238636', border: 'none', borderRadius: 6,
                                padding: '0 16px', color: '#ffffff', cursor: (!input.trim() || isPolling) ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500,
                                opacity: (!input.trim() || isPolling) ? 0.6 : 1
                            }}
                        >
                            <Play size={14} fill="currentColor" /> Run
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
