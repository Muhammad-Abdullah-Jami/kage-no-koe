import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';

const Workspace = ({ currentChat, onSendMessage }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

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
                        <button className="action-btn small"><Paperclip size={16} /></button>
                        <button className="action-btn small"><Mic size={16} /></button>
                        <button className="send-btn" onClick={handleSend}><Send size={18} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Workspace;
