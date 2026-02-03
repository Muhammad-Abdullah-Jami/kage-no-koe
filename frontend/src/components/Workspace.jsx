import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Mic, ChevronUp, Cpu, RefreshCw, ArrowUp } from 'lucide-react';

const Workspace = ({ currentChat, onSendMessage, availableModels, selectedModel, onModelChange, onRefreshModels, onFileUpload }) => {
    const [input, setInput] = useState('');
    const [showModelMenu, setShowModelMenu] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [currentChat?.messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        onSendMessage(input);
        setInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileClick = () => {
        fileInputRef.current?.click();
    }

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            onFileUpload(e.target.files[0]);
        }
        // Reset so same file can be selected again if needed
        e.target.value = null;
    }

    const formatTime = (isoString) => {
        if (!isoString) return "";
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return ""; }
    };

    const formatDate = (isoString) => {
        if (!isoString) return "";
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString();
        } catch (e) { return ""; }
    }

    if (!currentChat) {
        return (
            <div className="workspace empty">
                <div className="welcome-hero">
                    <h1>Hello, Developer</h1>
                    <p>How can I help you today?</p>
                </div>
            </div>
        );
    }

    return (
        <div className="workspace">
            <div className="chat-header">
                <h2>{currentChat.title}</h2>
            </div>

            <div className="messages-area">
                {currentChat.messages && currentChat.messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                        <div className="message-content">
                            {msg.content}
                            <div className="message-time">
                                {msg.timestamp ? `${formatDate(msg.timestamp)} ${formatTime(msg.timestamp)}` : formatTime(new Date().toISOString())}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
                <div className="input-container">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                    />
                    <div className="input-actions">
                        <div className="model-selector-container">
                            <button className="model-toggle-btn" onClick={() => setShowModelMenu(!showModelMenu)}>
                                <Cpu size={14} /> <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedModel}</span>
                            </button>
                            {showModelMenu && (
                                <div className="model-menu">
                                    <div className="model-menu-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Select Model</span>
                                        <button onClick={onRefreshModels} title="Refresh Models" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                                            <RefreshCw size={10} />
                                        </button>
                                    </div>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {availableModels.length === 0 ? (
                                            <div className="model-menu-item">No models found</div>
                                        ) : (
                                            availableModels.map((m, i) => (
                                                <div
                                                    key={i}
                                                    className={`model-menu-item ${selectedModel === m.name ? 'active' : ''}`}
                                                    onClick={() => { onModelChange(m.name); setShowModelMenu(false); }}
                                                >
                                                    {m.name}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                        <button className="action-btn" onClick={handleFileClick} title="Attach file to Context">
                            <Paperclip size={18} />
                        </button>

                        <button className="send-btn" onClick={handleSend} title="Send message">
                            <ArrowUp size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Workspace;
