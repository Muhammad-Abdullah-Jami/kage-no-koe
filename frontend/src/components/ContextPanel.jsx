import React, { useState, useEffect, useRef } from 'react';
import { Layers, X, Save, ChevronRight, Plus, Upload, ToggleLeft, ToggleRight, Edit2, Trash2 } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const ContextItemBlock = ({ item, onUpdate, onDelete, onToggle }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(item.name);
    const [content, setContent] = useState(item.content);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setName(item.name);
        setContent(item.content);
        setIsDirty(false);
    }, [item]);

    const handleSave = () => {
        onUpdate(item.id, { name, content });
        setIsDirty(false);
        setIsEditing(false);
    };

    return (
        <div className={`context-item ${item.is_active ? 'active' : 'inactive'}`} style={{ display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
            <div className="item-header" style={{ width: '100%', overflow: 'hidden' }}>
                <button className="toggle-active-btn" onClick={() => onToggle(item.id, !item.is_active)} title={item.is_active ? "Disable" : "Enable"}>
                    {item.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
                {isEditing ? (
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                        className="name-input"
                        style={{ flex: 1, minWidth: 0 }}
                    />
                ) : (
                    <span className="item-name" onClick={() => setIsEditing(true)} style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                )}
                <span className="item-type" style={{ fontSize: '0.6rem', padding: '2px 4px' }}>{item.type}</span>
                <div className="item-actions">
                    {isDirty && <button className="save-btn" onClick={handleSave}><Save size={14} /></button>}
                    <button className="edit-btn" onClick={() => setIsEditing(!isEditing)}><Edit2 size={14} /></button>
                    <button className="delete-btn" onClick={() => onDelete(item.id)}><Trash2 size={14} /></button>
                </div>
            </div>
            {isEditing && (
                <textarea
                    value={content}
                    onChange={(e) => { setContent(e.target.value); setIsDirty(true); }}
                    placeholder="Enter context content..."
                    rows={6}
                    style={{ width: '100%', marginTop: 8, boxSizing: 'border-box' }}
                />
            )}
        </div>
    );
};

const ContextEditSection = ({ title, initialText, onSave }) => {
    const [text, setText] = useState(initialText || "");
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setText(initialText || "");
        setIsDirty(false);
    }, [initialText]);

    const handleChange = (e) => {
        setText(e.target.value);
        setIsDirty(true);
    };

    const handleSave = () => {
        onSave(text);
        setIsDirty(false);
    };

    return (
        <div className="context-layer">
            <div className="layer-header">
                <h4>{title}</h4>
                {isDirty && (
                    <button className="save-btn" onClick={handleSave} title="Save Context">
                        <Save size={14} /> Update
                    </button>
                )}
            </div>
            <textarea
                value={text}
                onChange={handleChange}
                placeholder="Enter instructions..."
            />
        </div>
    );
};

const ContextPanel = ({ project, chat, globalContext, onUpdateContext }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [contextItems, setContextItems] = useState([]);
    const fileInputRef = useRef(null);

    // Fetch context items when chat changes
    useEffect(() => {
        if (chat?.id) {
            fetchContextItems(chat.id);
        } else {
            setContextItems([]);
        }
    }, [chat?.id]);

    const fetchContextItems = async (chatId) => {
        try {
            const res = await fetch(`${API_BASE}/chat_completion/${chatId}/context`);
            if (res.ok) {
                const items = await res.json();
                setContextItems(items);
            }
        } catch (e) {
            console.error("Error fetching context items", e);
        }
    };

    const handleAddContextItem = async () => {
        if (!chat?.id) return;
        const name = prompt("Enter context block name:", "New Context");
        if (!name) return;

        try {
            const res = await fetch(`${API_BASE}/chat_completion/${chat.id}/context`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, content: "", type: "text" })
            });
            if (res.ok) {
                const newItem = await res.json();
                setContextItems([...contextItems, newItem]);
            }
        } catch (e) {
            console.error("Error adding context", e);
        }
    };

    const handleUpdateContextItem = async (itemId, updates) => {
        try {
            const res = await fetch(`${API_BASE}/chat_completion/context/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const updated = await res.json();
                setContextItems(contextItems.map(i => i.id === itemId ? updated : i));
            }
        } catch (e) {
            console.error("Error updating context", e);
        }
    };

    const handleToggleContextItem = async (itemId, isActive) => {
        await handleUpdateContextItem(itemId, { is_active: isActive });
    };

    const handleDeleteContextItem = async (itemId) => {
        if (!confirm("Delete this context block?")) return;
        try {
            await fetch(`${API_BASE}/chat_completion/context/${itemId}`, { method: 'DELETE' });
            setContextItems(contextItems.filter(i => i.id !== itemId));
        } catch (e) {
            console.error("Error deleting context", e);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !chat?.id) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const uploadRes = await fetch(`${API_BASE}/chat_completion/upload`, {
                method: 'POST',
                body: formData
            });
            if (uploadRes.ok) {
                const { filename, content } = await uploadRes.json();
                // Add as context item
                const res = await fetch(`${API_BASE}/chat_completion/${chat.id}/context`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: filename, content, type: "file" })
                });
                if (res.ok) {
                    const newItem = await res.json();
                    setContextItems([...contextItems, newItem]);
                }
            }
        } catch (e) {
            console.error("Error uploading file", e);
        }
        // Reset file input
        e.target.value = '';
    };

    if (isCollapsed) {
        return (
            <div className="context-panel collapsed">
                <button className="toggle-btn" onClick={() => setIsCollapsed(false)}>
                    <Layers size={20} />
                </button>
            </div>
        );
    }

    return (
        <div className="context-panel">
            <div className="panel-header">
                <h3><Layers size={18} /> Context Stack</h3>
                <button className="toggle-btn" onClick={() => setIsCollapsed(true)}>
                    <ChevronRight size={18} />
                </button>
            </div>

            <ContextEditSection
                title="Global Context"
                initialText={globalContext}
                onSave={(text) => onUpdateContext('global', null, text)}
            />

            {project && (
                <ContextEditSection
                    title={`Project: ${project.name}`}
                    initialText={project.context_text}
                    onSave={(text) => onUpdateContext('project', project.id, text)}
                />
            )}

            {chat && (
                <>
                    <div className="context-stack-header">
                        <h4>Chat Context Stack</h4>
                        <div className="stack-actions">
                            <button className="add-btn" onClick={handleAddContextItem} title="Add Context Block">
                                <Plus size={14} />
                            </button>
                            <button className="upload-btn" onClick={() => fileInputRef.current?.click()} title="Upload File">
                                <Upload size={14} />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                                accept=".txt,.json,.csv,.md"
                            />
                        </div>
                    </div>

                    {contextItems.length === 0 ? (
                        <div className="empty-context">No context blocks yet. Click + to add.</div>
                    ) : (
                        <div className="context-items-list">
                            {contextItems.map(item => (
                                <ContextItemBlock
                                    key={item.id}
                                    item={item}
                                    onUpdate={handleUpdateContextItem}
                                    onDelete={handleDeleteContextItem}
                                    onToggle={handleToggleContextItem}
                                />
                            ))}
                        </div>
                    )}

                    {/* Conversation History Indicator */}
                    <div className="conversation-history-indicator">
                        <span>💬 Conversation History</span>
                        <span className="msg-count">{chat.messages?.length || 0} messages</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default ContextPanel;
