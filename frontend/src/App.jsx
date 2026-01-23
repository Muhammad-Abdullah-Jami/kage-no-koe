import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import ContextPanel from './components/ContextPanel';
import './App.css';

const API_BASE = 'http://localhost:8000/api';

function App() {
  const [projects, setProjects] = useState([]);
  const [chats, setChats] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [globalContext, setGlobalContext] = useState("Loading...");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchProjects();
    fetchChats();
    fetchSettings();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects/`);
      if (res.ok) setProjects(await res.json());
    } catch (e) { console.error("Error fetching projects", e); }
  };

  const fetchChats = async () => {
    try {
      const res = await fetch(`${API_BASE}/chats/`);
      if (res.ok) setChats(await res.json());
    } catch (e) { console.error("Error fetching chats", e); }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/`);
      if (res.ok) {
        const data = await res.json();
        setGlobalContext(data.global_context_text || "");
      }
    } catch (e) { console.error("Error fetching settings", e); setGlobalContext(""); }
  };

  const handleSendMessage = async (text) => {
    if (!currentChat) return;

    // Optimistic update
    const newMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const updatedChat = { ...currentChat, messages: [...(currentChat.messages || []), newMessage] };
    setCurrentChat(updatedChat);

    try {
      const response = await fetch(`${API_BASE}/chat_completion/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: currentChat.id, user_message: text })
      });

      if (!response.ok) throw new Error("Server Error");

      const data = await response.json();

      // Add timestamp to response (it comes from DB creation time usually, but we can fake it for immediate UI)
      const aiMessage = { role: 'assistant', content: data.content, timestamp: new Date().toISOString() };

      setCurrentChat(prev => ({
        ...prev,
        messages: [...prev.messages, aiMessage]
      }));
    } catch (e) {
      console.error("Failed to send message", e);
      setCurrentChat(prev => ({
        ...prev,
        messages: [...prev.messages, { role: 'assistant', content: "Error: Could not reach server. Is backend running?", timestamp: new Date().toISOString() }]
      }));
    }
  };

  const handleCreateChat = async (projectId) => {
    const title = prompt("Enter chat title:", "New Chat");
    if (!title) return;

    try {
      const res = await fetch(`${API_BASE}/chats/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, project_id: projectId })
      });
      if (res.ok) {
        const newChat = await res.json();
        // Initialize messages array for UI
        newChat.messages = [];
        setChats([newChat, ...chats]);
        setCurrentChat(newChat);
      }
    } catch (e) { console.error("Error creating chat", e); }
  };

  const handleCreateProject = async () => {
    const name = prompt("Enter project name:", "New Project");
    if (!name) return;
    try {
      const res = await fetch(`${API_BASE}/projects/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const newProj = await res.json();
        setProjects([...projects, newProj]);
      } else {
        console.error("Failed to create project");
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteChat = async (id) => {
    if (!confirm("Delete this chat?")) return;
    try {
      await fetch(`${API_BASE}/chats/${id}`, { method: 'DELETE' });
      const newChats = chats.filter(c => c.id !== id);
      setChats(newChats);
      if (currentChat?.id === id) setCurrentChat(null);
    } catch (e) { console.error(e); }
  };

  const handleRenameChat = async (chat) => {
    const newTitle = prompt("Rename chat:", chat.title);
    if (!newTitle) return;
    try {
      await fetch(`${API_BASE}/chats/${chat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      const updatedChats = chats.map(c => c.id === chat.id ? { ...c, title: newTitle } : c);
      setChats(updatedChats);
      if (currentChat?.id === chat.id) setCurrentChat({ ...currentChat, title: newTitle });
    } catch (e) { console.error(e); }
  };

  const handleDeleteProject = async (id) => {
    if (!confirm("Delete this project?")) return;
    try {
      await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
      setProjects(projects.filter(p => p.id !== id));
      if (currentProject?.id === id) setCurrentProject(null);
    } catch (e) { console.error(e); }
  };

  const handleRenameProject = async (project) => {
    const newName = prompt("Rename project:", project.name);
    if (!newName) return;
    try {
      await fetch(`${API_BASE}/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      const updatedProjects = projects.map(p => p.id === project.id ? { ...p, name: newName } : p);
      setProjects(updatedProjects);
      if (currentProject?.id === project.id) setCurrentProject({ ...currentProject, name: newName });
    } catch (e) { console.error(e); }
  };

  const handleUpdateContext = async (type, id, text) => {
    try {
      if (type === 'global') {
        await fetch(`${API_BASE}/settings/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ global_context_text: text })
        });
        setGlobalContext(text);
      } else if (type === 'project') {
        await fetch(`${API_BASE}/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context_text: text })
        });
        setProjects(projects.map(p => p.id === id ? { ...p, context_text: text } : p));
        setCurrentProject(prev => ({ ...prev, context_text: text }));
      } else if (type === 'chat') {
        await fetch(`${API_BASE}/chats/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context_text: text })
        });
        setChats(chats.map(c => c.id === id ? { ...c, context_text: text } : c));
        setCurrentChat(prev => ({ ...prev, context_text: text }));
      }
      alert("Context updated!");
    } catch (e) { console.error(e); alert("Failed to save context"); }
  };

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        projects={projects}
        chats={chats}
        onSelectProject={setCurrentProject}
        onSelectChat={(chat) => {
          setCurrentChat(chat);
          if (!chat.messages || chat.messages.length === 0) {
            fetch(`${API_BASE}/chats/${chat.id}/messages`).then(r => r.json()).then(msgs => {
              setCurrentChat(prev => ({ ...prev, messages: msgs }));
            });
          }
        }}
        onCreateChat={() => handleCreateChat(currentProject?.id)}
        onCreateProject={handleCreateProject}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <Workspace
        currentChat={currentChat}
        onSendMessage={handleSendMessage}
      />
      <ContextPanel
        project={currentProject}
        chat={currentChat}
        globalContext={globalContext}
        onUpdateContext={handleUpdateContext}
      />
    </div>
  );
}

export default App;
