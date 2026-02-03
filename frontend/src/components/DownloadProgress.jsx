import React, { useState, useEffect } from 'react';
import { X, Download, CheckCircle, AlertCircle, Minimize2 } from 'lucide-react';

const DownloadProgress = ({ downloads, onClose, onMinimize }) => {
    const [isMinimized, setIsMinimized] = useState(false);

    if (downloads.length === 0) return null;

    const handleMinimize = () => {
        setIsMinimized(!isMinimized);
        if (onMinimize) onMinimize(!isMinimized);
    };

    const activeDownloads = downloads.filter(d => d.status === 'downloading');
    const completedDownloads = downloads.filter(d => d.status === 'completed');
    const failedDownloads = downloads.filter(d => d.status === 'failed');

    if (isMinimized) {
        return (
            <div className="download-progress-minimized" onClick={handleMinimize}>
                <Download size={16} />
                <span>{activeDownloads.length} downloading</span>
            </div>
        );
    }

    return (
        <div className="download-progress-panel">
            <div className="download-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Download size={16} />
                    <span>Model Downloads</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={handleMinimize} className="icon-btn" title="Minimize">
                        <Minimize2 size={14} />
                    </button>
                    <button onClick={onClose} className="icon-btn" title="Close">
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div className="download-list">
                {activeDownloads.map((download, idx) => (
                    <div key={idx} className="download-item downloading">
                        <div className="download-info">
                            <span className="download-name">{download.modelName}</span>
                            <span className="download-status">
                                {download.progress ? `${download.progress}%` : 'Downloading...'}
                            </span>
                        </div>
                        <div className="download-bar">
                            <div
                                className="download-bar-fill"
                                style={{ width: `${download.progress || 0}%` }}
                            />
                        </div>
                        {download.size && (
                            <div className="download-size">
                                {download.downloaded || '0'} / {download.size}
                            </div>
                        )}
                    </div>
                ))}

                {completedDownloads.map((download, idx) => (
                    <div key={idx} className="download-item completed">
                        <CheckCircle size={16} style={{ color: 'var(--accent-color)' }} />
                        <div className="download-info">
                            <span className="download-name">{download.modelName}</span>
                            <span className="download-status">Completed</span>
                        </div>
                    </div>
                ))}

                {failedDownloads.map((download, idx) => (
                    <div key={idx} className="download-item failed">
                        <AlertCircle size={16} style={{ color: '#f85149' }} />
                        <div className="download-info">
                            <span className="download-name">{download.modelName}</span>
                            <span className="download-status">Failed</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DownloadProgress;
