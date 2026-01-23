const chatArea = document.getElementById('chat-area');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

let messageHistory = [];

// Auto-resize textarea
userInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Handle Enter key (Shift+Enter for newline)
userInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener('click', sendMessage);

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';

    // Remove welcome message if it exists
    const welcome = document.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    // Add User Message
    addMessage(text, 'user');
    messageHistory.push({ role: 'user', content: text });

    // Show typing indicator
    const typingIndicator = showTypingIndicator();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages: messageHistory })
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();

        // Remove typing indicator
        typingIndicator.remove();

        let aiContent = "Something went wrong.";
        if (data.message && data.message.content) {
            aiContent = data.message.content;
            messageHistory.push({ role: 'assistant', content: aiContent });
            addMessage(aiContent, 'ai');
        } else if (data.error) {
            addMessage("Error: " + data.error, 'ai');
        }

    } catch (error) {
        console.error('Error:', error);
        typingIndicator.remove();
        addMessage("Sorry, I couldn't reach the server. Make sure it's running.", 'ai');
    }
}

function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');

    // Simple markdown-like parsing (optional, can be improved)
    // For now dealing with newlines
    contentDiv.innerHTML = formatText(text);

    messageDiv.appendChild(contentDiv);
    chatArea.appendChild(messageDiv);

    // Scroll to bottom
    chatArea.scrollTop = chatArea.scrollHeight;
}

function formatText(text) {
    // Basic formatting: newlines to <br>, bold to <b>, etc.
    // Ideally use a library like marked.js, but minimal implementation here:
    let formatted = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Code blocks (simple detection)
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Newlines
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
}

function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    chatArea.appendChild(indicator);
    chatArea.scrollTop = chatArea.scrollHeight;
    return indicator;
}
