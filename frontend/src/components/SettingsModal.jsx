import React, { useState, useEffect } from 'react';
import { Settings, X, Sun, Moon, Monitor, Box, Download, Check } from 'lucide-react';

const ACCENT_COLORS = [
    { name: 'Blue', value: '#79c0ff' },
    { name: 'Purple', value: '#a371f7' },
    { name: 'Green', value: '#7ee787' },
    { name: 'Orange', value: '#ffa657' },
    { name: 'Pink', value: '#ff7b72' },
    { name: 'Cyan', value: '#56d4dd' },
];

const SettingsModal = ({ isOpen, onClose }) => {
    const [theme, setTheme] = useState('system');
    const [accentColor, setAccentColor] = useState('#79c0ff');
    const [aiBubbleColor, setAiBubbleColor] = useState(null);
    const [models, setModels] = useState([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadTarget, setDownloadTarget] = useState('deepseek-r1:1.5b');

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('kage-theme') || 'system';
        const savedAccent = localStorage.getItem('kage-accent') || '#79c0ff';
        const savedAiColor = localStorage.getItem('kage-ai-color');

        setTheme(savedTheme);
        setAccentColor(savedAccent);
        setAiBubbleColor(savedAiColor);

        applyTheme(savedTheme, savedAiColor);
        applyAccentColor(savedAccent);
        fetchModels();
    }, []);

    const fetchModels = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/settings/models');
            if (res.ok) {
                const data = await res.json();
                setModels(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error("Error fetching models", e);
        }
    };

    const handleDownloadModel = async (modelName) => {
        const targetModel = modelName || downloadTarget;
        if (!targetModel) {
            alert("Please enter a model name");
            return;
        }
        setIsDownloading(true);
        try {
            const res = await fetch(`http://localhost:8000/api/settings/models/download?model_name=${targetModel}`, {
                method: 'POST'
            });
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'started') {
                    // Download started successfully - progress will be shown in DownloadProgress component
                    // Start polling for completion to refresh models list
                    const checkCompletion = setInterval(async () => {
                        const progressRes = await fetch('http://localhost:8000/api/settings/models/download/progress');
                        const downloads = await progressRes.json();
                        const thisDownload = downloads.find(d => d.modelName === targetModel);

                        if (thisDownload && thisDownload.status === 'completed') {
                            clearInterval(checkCompletion);
                            fetchModels(); // Refresh models list
                            setIsDownloading(false);
                        } else if (thisDownload && thisDownload.status === 'failed') {
                            clearInterval(checkCompletion);
                            alert(`Download of ${targetModel} failed`);
                            setIsDownloading(false);
                        }
                    }, 2000);

                    // Auto-clear after 5 minutes timeout
                    setTimeout(() => {
                        clearInterval(checkCompletion);
                        setIsDownloading(false);
                    }, 300000);
                } else {
                    alert(`Failed to start download: ${data.error || 'Unknown error'}`);
                    setIsDownloading(false);
                }
            } else {
                alert(`Failed to download ${targetModel}. Is Ollama running?`);
                setIsDownloading(false);
            }
        } catch (e) {
            console.error("Download failed", e);
            alert("Download failed. Make sure backend is running.");
            setIsDownloading(false);
        }
    };

    const applyTheme = (newTheme, customAiColor) => {
        const root = document.documentElement;

        // Use provided customAiColor if available, otherwise check state, then localStorage
        const aiColor = customAiColor !== undefined ? customAiColor : (aiBubbleColor || localStorage.getItem('kage-ai-color'));

        if (newTheme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            newTheme = prefersDark ? 'dark' : 'light';
        }

        if (newTheme === 'light') {
            root.style.setProperty('--bg-color', '#f6f8fa');
            root.style.setProperty('--sidebar-bg', '#ffffff');
            root.style.setProperty('--workspace-bg', 'rgba(246, 248, 250, 0.6)');
            root.style.setProperty('--panel-bg', '#ffffff');
            root.style.setProperty('--text-primary', '#24292f');
            root.style.setProperty('--text-secondary', '#57606a');
            root.style.setProperty('--border-color', '#d0d7de');
            root.style.setProperty('--input-bg', '#f6f8fa');
            // Chat element theming - Light
            root.style.setProperty('--message-assistant-bg', aiColor || '#ffffff');
            root.style.setProperty('--input-container-bg', 'rgba(255, 255, 255, 0.9)');
            root.style.setProperty('--context-layer-bg', 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(31, 111, 235, 0.05) 100%)');
            root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.8)');
            root.style.setProperty('--glass-border', 'rgba(0, 0, 0, 0.1)');
        } else {
            root.style.setProperty('--bg-color', '#0d1117');
            root.style.setProperty('--sidebar-bg', '#161b22');
            root.style.setProperty('--workspace-bg', 'rgba(13, 17, 23, 0.6)');
            root.style.setProperty('--panel-bg', '#161b22');
            root.style.setProperty('--text-primary', '#e6edf3');
            root.style.setProperty('--text-secondary', '#8b949e');
            root.style.setProperty('--border-color', '#30363d');
            root.style.setProperty('--input-bg', '#21262d');
            // Chat element theming - Dark
            root.style.setProperty('--message-assistant-bg', aiColor || '#161b22');
            root.style.setProperty('--input-container-bg', 'rgba(22, 27, 34, 0.8)');
            root.style.setProperty('--context-layer-bg', 'linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, rgba(31, 111, 235, 0.05) 100%)');
            root.style.setProperty('--glass-bg', 'rgba(22, 27, 34, 0.8)');
            root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.1)');
        }
    };

    const applyAccentColor = (color) => {
        const root = document.documentElement;
        root.style.setProperty('--accent-color', color);

        // Generate matching gradient
        const gradientEnd = adjustColor(color, 40);
        root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${color} 0%, ${gradientEnd} 100%)`);
    };

    // Helper to shift hue for gradient
    const adjustColor = (hex, amount) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        const newR = Math.min(255, Math.max(0, r + amount));
        const newG = Math.min(255, Math.max(0, g - amount));
        const newB = Math.min(255, Math.max(0, b + amount));

        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    };

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem('kage-theme', newTheme);
        applyTheme(newTheme);
    };

    const handleAccentChange = (color) => {
        setAccentColor(color);
        localStorage.setItem('kage-accent', color);
        applyAccentColor(color);
    };

    const handleAiColorChange = (color) => {
        const newVal = aiBubbleColor === color ? null : color;
        setAiBubbleColor(newVal);
        if (newVal) localStorage.setItem('kage-ai-color', newVal);
        else localStorage.removeItem('kage-ai-color');
        applyTheme(theme, newVal);
    };

    if (!isOpen) return null;

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2><Settings size={20} /> Settings</h2>
                    <button className="settings-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="settings-content">
                    <div className="settings-section">
                        <h3>Appearance</h3>

                        <div className="settings-option">
                            <label>Theme</label>
                            <div className="theme-selector">
                                <button
                                    className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
                                    onClick={() => handleThemeChange('system')}
                                >
                                    <Monitor size={14} /> System
                                </button>
                                <button
                                    className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                                    onClick={() => handleThemeChange('light')}
                                >
                                    <Sun size={14} /> Light
                                </button>
                                <button
                                    className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                                    onClick={() => handleThemeChange('dark')}
                                >
                                    <Moon size={14} /> Dark
                                </button>
                            </div>
                        </div>

                        <div className="settings-option">
                            <label>Accent Color</label>
                            <div className="color-picker-row">
                                {ACCENT_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        className={`color-swatch ${accentColor === c.value ? 'active' : ''}`}
                                        style={{ backgroundColor: c.value }}
                                        onClick={() => handleAccentChange(c.value)}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="settings-option">
                            <label>AI Bubble Color</label>
                            <div className="color-picker-row">
                                <button
                                    className={`color-swatch ${aiBubbleColor === null ? 'active' : ''}`}
                                    style={{ backgroundColor: 'var(--sidebar-bg)', borderStyle: 'dashed' }}
                                    onClick={() => handleAiColorChange(null)}
                                    title="Default"
                                />
                                {ACCENT_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        className={`color-swatch ${aiBubbleColor === c.value ? 'active' : ''}`}
                                        style={{ backgroundColor: c.value }}
                                        onClick={() => handleAiColorChange(c.value)}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h3><Box size={14} style={{ marginRight: 8 }} /> Models</h3>

                        {/* Recommended DeepSeek Models */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
                                💡 Recommended for Reasoning
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {['deepseek-r1:1.5b', 'deepseek-r1:3b'].map(model => {
                                    const isInstalled = models.some(m => m.name === model);
                                    return (
                                        <button
                                            key={model}
                                            onClick={() => { if (!isInstalled) handleDownloadModel(model); }}
                                            disabled={isInstalled || isDownloading}
                                            style={{
                                                padding: '8px 12px',
                                                background: isInstalled ? 'rgba(0,200,0,0.1)' : 'var(--input-bg)',
                                                border: `1px solid ${isInstalled ? 'var(--accent-color)' : 'var(--border-color)'}`,
                                                borderRadius: 8,
                                                color: 'var(--text-primary)',
                                                fontSize: '0.8rem',
                                                cursor: isInstalled ? 'default' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 8,
                                            }}
                                        >
                                            <span>{model.replace('deepseek-r1:', 'R1-')}</span>
                                            {isInstalled ? <Check size={14} style={{ color: 'var(--accent-color)' }} /> : <Download size={14} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Low-Spec Open Source Models */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
                                ⚡ Low-Spec / Fast Models
                            </label>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr',
                                gap: 8,
                                maxHeight: '120px',
                                overflowY: 'auto',
                                border: '1px solid var(--border-color)',
                                borderRadius: 8,
                                padding: 8,
                                background: 'rgba(0,0,0,0.1)'
                            }}>
                                {['qwen:0.5b', 'qwen:1.8b', 'phi:2.7b', 'tinyllama', 'gemma:2b', 'stablelm2:1.6b'].map(model => {
                                    const isInstalled = models.some(m => m.name === model);
                                    return (
                                        <button
                                            key={model}
                                            onClick={() => { if (!isInstalled) handleDownloadModel(model); }}
                                            disabled={isInstalled || isDownloading}
                                            style={{
                                                padding: '8px 12px',
                                                background: isInstalled ? 'rgba(0,200,0,0.1)' : 'var(--input-bg)',
                                                border: 'none',
                                                borderBottom: '1px solid var(--border-color)',
                                                textAlign: 'left',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.85rem',
                                                cursor: isInstalled ? 'default' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <span style={{ display: 'flex', flexDirection: 'column' }}>
                                                <strong>{model.split(':')[0]}</strong>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{model.split(':')[1] || '1.1b'}</span>
                                            </span>
                                            {isInstalled ? <Check size={14} style={{ color: 'var(--accent-color)' }} /> : <Download size={14} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="settings-option" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <label>All Installed Models</label>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{models.length} total</span>
                            </div>

                            <div className="model-list-mini" style={{ width: '100%', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 8, maxHeight: '150px', overflowY: 'auto' }}>
                                {models.length === 0 ? (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '8px 0' }}>No models installed yet.</div>
                                ) : (
                                    models.map((m, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                                            <Check size={12} style={{ color: 'var(--accent-color)' }} />
                                            <span style={{ fontSize: '0.85rem' }}>{m.name}</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 8 }}>
                                <input
                                    type="text"
                                    value={downloadTarget}
                                    onChange={(e) => setDownloadTarget(e.target.value)}
                                    placeholder="Custom model (e.g. llama3.3:70b)"
                                    style={{
                                        flex: 1,
                                        background: 'var(--input-bg)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 8,
                                        padding: '8px 12px',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.9rem'
                                    }}
                                />
                                <button
                                    className="theme-btn"
                                    onClick={handleDownloadModel}
                                    disabled={isDownloading}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                                >
                                    {isDownloading ? 'Downloading...' : <><Download size={14} /> Download</>}
                                </button>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                ℹ️ Downloads happen in background. Check terminal for progress.
                            </div>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h3>About</h3>
                        <div className="settings-option">
                            <label>Version</label>
                            <span style={{ color: 'var(--text-secondary)' }}>1.0.0 Alpha</span>
                        </div>
                        <div className="settings-option">
                            <label>Model</label>
                            <span style={{ color: 'var(--text-secondary)' }}>llama3.2:1b (Ollama)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
