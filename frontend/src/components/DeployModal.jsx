import { useState } from 'react';
import { X, Plus, Minus, Rocket } from 'lucide-react';

/**
 * DeployModal — Modal form for deploying a Docker container with full config.
 * Supports image, name, port mapping, env vars, volumes, restart policy.
 */
export default function DeployModal({ onClose, onDeploy }) {
    const [form, setForm] = useState({
        image: '',
        name: '',
        restart_policy: 'unless-stopped',
    });
    const [ports, setPorts] = useState([{ container: '', host: '' }]);
    const [envVars, setEnvVars] = useState([{ key: '', value: '' }]);
    const [volumes, setVolumes] = useState([{ host: '', container: '' }]);
    const [deploying, setDeploying] = useState(false);

    const handleDeploy = async () => {
        if (!form.image || !form.name) return;
        setDeploying(true);

        const portMap = {};
        ports.forEach((p) => {
            if (p.container && p.host) portMap[`${p.container}/tcp`] = parseInt(p.host);
        });

        const envMap = {};
        envVars.forEach((e) => {
            if (e.key && e.value) envMap[e.key] = e.value;
        });

        const volumeList = volumes
            .filter((v) => v.host && v.container)
            .map((v) => `${v.host}:${v.container}`);

        await onDeploy({
            image: form.image,
            name: form.name,
            ports: Object.keys(portMap).length ? portMap : null,
            env: Object.keys(envMap).length ? envMap : null,
            volumes: volumeList.length ? volumeList : null,
            restart_policy: form.restart_policy,
        });

        setDeploying(false);
    };

    const addRow = (setter, template) => setter((prev) => [...prev, template]);
    const removeRow = (setter, idx) => setter((prev) => prev.filter((_, i) => i !== idx));
    const updateRow = (setter, idx, field, val) =>
        setter((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));

    return (
        <div style={overlay} onClick={onClose}>
            <div style={modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Rocket size={18} style={{ color: 'var(--color-accent)' }} />
                        Deploy Container
                    </h2>
                    <button onClick={onClose} style={closeBtnStyle}>
                        <X size={16} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 'calc(80vh - 120px)', overflowY: 'auto', paddingRight: 4 }}>
                    {/* Image + Name */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Image *</label>
                            <input
                                style={inputStyle}
                                placeholder="e.g. nginx:alpine"
                                value={form.image}
                                onChange={(e) => setForm({ ...form, image: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Container Name *</label>
                            <input
                                style={inputStyle}
                                placeholder="e.g. my-nginx"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Ports */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label style={labelStyle}>Port Mapping</label>
                            <button onClick={() => addRow(setPorts, { container: '', host: '' })} style={addBtnStyle}>
                                <Plus size={12} /> Add
                            </button>
                        </div>
                        {ports.map((p, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                                <input
                                    style={{ ...inputStyle, flex: 1 }}
                                    placeholder="Host port"
                                    value={p.host}
                                    onChange={(e) => updateRow(setPorts, i, 'host', e.target.value)}
                                />
                                <span style={{ color: 'var(--color-text-quaternary)', fontSize: 13 }}>→</span>
                                <input
                                    style={{ ...inputStyle, flex: 1 }}
                                    placeholder="Container port"
                                    value={p.container}
                                    onChange={(e) => updateRow(setPorts, i, 'container', e.target.value)}
                                />
                                {ports.length > 1 && (
                                    <button onClick={() => removeRow(setPorts, i)} style={removeBtnStyle}>
                                        <Minus size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Env Vars */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label style={labelStyle}>Environment Variables</label>
                            <button onClick={() => addRow(setEnvVars, { key: '', value: '' })} style={addBtnStyle}>
                                <Plus size={12} /> Add
                            </button>
                        </div>
                        {envVars.map((e, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                                <input
                                    style={{ ...inputStyle, flex: 1 }}
                                    placeholder="KEY"
                                    value={e.key}
                                    onChange={(ev) => updateRow(setEnvVars, i, 'key', ev.target.value)}
                                />
                                <span style={{ color: 'var(--color-text-quaternary)', fontSize: 13 }}>=</span>
                                <input
                                    style={{ ...inputStyle, flex: 1 }}
                                    placeholder="value"
                                    value={e.value}
                                    onChange={(ev) => updateRow(setEnvVars, i, 'value', ev.target.value)}
                                />
                                {envVars.length > 1 && (
                                    <button onClick={() => removeRow(setEnvVars, i)} style={removeBtnStyle}>
                                        <Minus size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Volumes */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label style={labelStyle}>Volume Mounts</label>
                            <button onClick={() => addRow(setVolumes, { host: '', container: '' })} style={addBtnStyle}>
                                <Plus size={12} /> Add
                            </button>
                        </div>
                        {volumes.map((v, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                                <input
                                    style={{ ...inputStyle, flex: 1 }}
                                    placeholder="Host path or volume"
                                    value={v.host}
                                    onChange={(e) => updateRow(setVolumes, i, 'host', e.target.value)}
                                />
                                <span style={{ color: 'var(--color-text-quaternary)', fontSize: 13 }}>:</span>
                                <input
                                    style={{ ...inputStyle, flex: 1 }}
                                    placeholder="Container path"
                                    value={v.container}
                                    onChange={(e) => updateRow(setVolumes, i, 'container', e.target.value)}
                                />
                                {volumes.length > 1 && (
                                    <button onClick={() => removeRow(setVolumes, i)} style={removeBtnStyle}>
                                        <Minus size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Restart Policy */}
                    <div>
                        <label style={labelStyle}>Restart Policy</label>
                        <select
                            style={inputStyle}
                            value={form.restart_policy}
                            onChange={(e) => setForm({ ...form, restart_policy: e.target.value })}
                        >
                            <option value="no">No</option>
                            <option value="always">Always</option>
                            <option value="unless-stopped">Unless Stopped</option>
                            <option value="on-failure">On Failure</option>
                        </select>
                    </div>
                </div>

                {/* Deploy Button */}
                <button
                    onClick={handleDeploy}
                    disabled={!form.image || !form.name || deploying}
                    style={{
                        marginTop: 20,
                        width: '100%',
                        padding: '12px 20px',
                        borderRadius: 12,
                        border: 'none',
                        background: (!form.image || !form.name) ? 'var(--color-surface-2)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: (!form.image || !form.name) ? 'var(--color-text-quaternary)' : '#fff',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: (!form.image || !form.name) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.2s ease',
                    }}
                >
                    <Rocket size={16} />
                    {deploying ? 'Deploying…' : 'Deploy Container'}
                </button>
            </div>
        </div>
    );
}

const overlay = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease',
};

const modal = {
    background: 'var(--color-surface-0)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: 20,
    padding: 28,
    width: 520,
    maxWidth: '90vw',
    maxHeight: '90vh',
    boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
};

const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-text-tertiary)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 10,
    border: '1px solid var(--color-border-subtle)',
    background: 'var(--color-surface-1)',
    color: 'var(--color-text-primary)',
    fontSize: 13,
    fontWeight: 500,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
};

const closeBtnStyle = {
    width: 32, height: 32, borderRadius: 10, border: 'none',
    background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const addBtnStyle = {
    padding: '4px 10px', borderRadius: 8, border: 'none',
    background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 4,
};

const removeBtnStyle = {
    width: 28, height: 28, borderRadius: 8, border: 'none',
    background: 'rgba(255, 69, 58, 0.12)', color: '#ff453a',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
};
