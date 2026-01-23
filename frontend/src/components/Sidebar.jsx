import React, { useState, useEffect, useRef } from 'react';
import { Plus, MessageSquare, Folder, Settings, MoreVertical, Trash2, Edit2, ChevronLeft, ChevronRight, LayoutPanelLeft } from 'lucide-react';

const Sidebar = ({
    projects,
    chats,
    onSelectProject,
    onSelectChat,
    onCreateProject,
    onCreateChat,
    onDeleteChat,
    onRenameChat,
    onDeleteProject,
    onRenameProject,
    isCollapsed,
    toggleSidebar
}) => {
    const [activeMenu, setActiveMenu] = useState(null);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMenuClick = (e, id, type) => {
        e.stopPropagation();
        setActiveMenu(activeMenu?.id === id ? null : { id, type });
    };

    if (isCollapsed) {
        return (
            <div className="sidebar collapsed">
                <button className="toggle-btn" onClick={toggleSidebar}>
                    <ChevronRight size={20} />
                </button>
                <div className="collapsed-icons">
                    <button onClick={() => onCreateChat(null)} title="New Chat"><Plus size={20} /></button>
                    <button title="Projects"><Folder size={20} /></button>
                    <button title="Settings"><Settings size={20} /></button>
                </div>
            </div>
        );
    }

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="brand">
                    <span className="icon">🔮</span>
                    <h2>Kage no Koe</h2>
                </div>
                <button className="toggle-btn" onClick={toggleSidebar}>
                    <LayoutPanelLeft size={20} />
                </button>
            </div>

            <button className="new-chat-btn" onClick={() => onCreateChat(null)}>
                <Plus size={18} />
                <span>New Chat</span>
            </button>

            <div className="sidebar-scroll-area">
                <div className="sidebar-section">
                    <div className="section-title">
                        <span>Projects</span>
                        <button className="add-btn" onClick={onCreateProject}><Plus size={14} /></button>
                    </div>
                    <div className="list">
                        {projects.map(p => (
                            <div key={p.id} className="list-item" onClick={() => onSelectProject(p)}>
                                <div className="item-icon"><Folder size={16} /></div>
                                <span className="item-name">{p.name}</span>
                                <button className="menu-btn" onClick={(e) => handleMenuClick(e, p.id, 'project')}>
                                    <MoreVertical size={14} />
                                </button>

                                {activeMenu?.id === p.id && activeMenu?.type === 'project' && (
                                    <div className="context-menu" ref={menuRef}>
                                        <button onClick={(e) => { e.stopPropagation(); onRenameProject(p); setActiveMenu(null); }}>
                                            <Edit2 size={14} /> Rename
                                        </button>
                                        <button className="delete" onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); setActiveMenu(null); }}>
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="sidebar-section">
                    <div className="section-title">
                        <span>Recent Chats</span>
                    </div>
                    <div className="list">
                        {chats.map(c => (
                            <div key={c.id} className="list-item" onClick={() => onSelectChat(c)}>
                                <div className="item-icon"><MessageSquare size={16} /></div>
                                <span className="item-name">{c.title}</span>
                                <button className="menu-btn" onClick={(e) => handleMenuClick(e, c.id, 'chat')}>
                                    <MoreVertical size={14} />
                                </button>

                                {activeMenu?.id === c.id && activeMenu?.type === 'chat' && (
                                    <div className="context-menu" ref={menuRef}>
                                        <button onClick={(e) => { e.stopPropagation(); onRenameChat(c); setActiveMenu(null); }}>
                                            <Edit2 size={14} /> Rename
                                        </button>
                                        <button className="delete" onClick={(e) => { e.stopPropagation(); onDeleteChat(c.id); setActiveMenu(null); }}>
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="sidebar-footer">
                <button className="settings-btn">
                    <Settings size={18} />
                    <span>Settings</span>
                </button>
                <div className="location-info">
                    <span>📍 LocalMind</span>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
