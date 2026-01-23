import React, { useState, useEffect } from 'react';
import { Layers, X, Save, ChevronRight } from 'lucide-react';

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
                <ContextEditSection
                    title="Chat Context"
                    initialText={chat.context_text}
                    onSave={(text) => onUpdateContext('chat', chat.id, text)}
                />
            )}
        </div>
    );
};

export default ContextPanel;
