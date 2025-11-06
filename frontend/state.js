/* ============================================
   KAGE NO KOE - STATE MANAGEMENT
   Observer Pattern for Application State
   ============================================ */

class AppState {
    constructor() {
        // Initialize state
        this.state = {
            // Current chat
            currentChat: null,
            chats: [],
            messages: [],
            
            // UI state
            sidebarOpen: true,
            currentModal: null,
            theme: 'dark', // 'dark' or 'light'
            
            // Connection state
            connected: false,
            currentModel: 'llama3.2:1b',
            availableModels: [],
            
            // Input state
            inputText: '',
            isTyping: false,
            
            // Settings
            globalContext: '',
            
            // File uploads
            attachedFiles: []
        };
        
        // Observers (functions that react to state changes)
        this.observers = {};
    }
    
    /**
     * Subscribe to state changes
     * @param {string} key - State key to watch
     * @param {function} callback - Function to call when state changes
     */
    subscribe(key, callback) {
        if (!this.observers[key]) {
            this.observers[key] = [];
        }
        this.observers[key].push(callback);
    }
    
    /**
     * Unsubscribe from state changes
     * @param {string} key - State key
     * @param {function} callback - Function to remove
     */
    unsubscribe(key, callback) {
        if (!this.observers[key]) return;
        this.observers[key] = this.observers[key].filter(cb => cb !== callback);
    }
    
    /**
     * Update state and notify observers
     * @param {string} key - State key to update
     * @param {any} value - New value
     */
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        // Notify observers
        if (this.observers[key]) {
            this.observers[key].forEach(callback => {
                callback(value, oldValue);
            });
        }
        
        // Log state changes in development
        if (window.DEBUG) {
            console.log(`[State] ${key}:`, value);
        }
    }
    
    /**
     * Get state value
     * @param {string} key - State key
     * @returns {any} State value
     */
    get(key) {
        return this.state[key];
    }
    
    /**
     * Update nested state (for objects/arrays)
     * @param {string} key - State key
     * @param {any} value - Value to merge/push
     */
    update(key, value) {
        const current = this.state[key];
        
        if (Array.isArray(current)) {
            this.set(key, [...current, value]);
        } else if (typeof current === 'object' && current !== null) {
            this.set(key, { ...current, ...value });
        } else {
            this.set(key, value);
        }
    }
    
    /**
     * Reset state to initial values
     */
    reset() {
        const theme = this.state.theme; // Preserve theme
        this.state = {
            currentChat: null,
            chats: [],
            messages: [],
            sidebarOpen: true,
            currentModal: null,
            theme: theme,
            connected: false,
            currentModel: 'llama3.2:1b',
            availableModels: [],
            inputText: '',
            isTyping: false,
            globalContext: '',
            attachedFiles: []
        };
    }
    
    // ============= CONVENIENCE METHODS =============
    
    /**
     * Set current chat and load its messages
     */
    setCurrentChat(chatId) {
        this.set('currentChat', chatId);
        // Messages will be loaded by observer in app.js
    }
    
    /**
     * Add a new message to the current chat
     */
    addMessage(message) {
        this.update('messages', message);
    }
    
    /**
     * Clear all messages
     */
    clearMessages() {
        this.set('messages', []);
    }
    
    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        this.set('sidebarOpen', !this.state.sidebarOpen);
    }
    
    /**
     * Open a modal
     */
    openModal(modalName) {
        this.set('currentModal', modalName);
    }
    
    /**
     * Close current modal
     */
    closeModal() {
        this.set('currentModal', null);
    }
    
    /**
     * Set theme (dark/light)
     */
    setTheme(theme) {
        this.set('theme', theme);
        // Save to localStorage
        localStorage.setItem('kage-theme', theme);
    }
    
    /**
     * Toggle theme
     */
    toggleTheme() {
        const newTheme = this.state.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
    
    /**
     * Load theme from localStorage
     */
    loadTheme() {
        const savedTheme = localStorage.getItem('kage-theme');
        if (savedTheme) {
            this.set('theme', savedTheme);
        }
    }
    
    /**
     * Set connection status
     */
    setConnected(status) {
        this.set('connected', status);
    }
    
    /**
     * Set typing status
     */
    setTyping(status) {
        this.set('isTyping', status);
    }
    
    /**
     * Add attached file
     */
    addFile(file) {
        this.update('attachedFiles', file);
    }
    
    /**
     * Clear attached files
     */
    clearFiles() {
        this.set('attachedFiles', []);
    }
    
    /**
     * Remove specific file
     */
    removeFile(index) {
        const files = [...this.state.attachedFiles];
        files.splice(index, 1);
        this.set('attachedFiles', files);
    }
}

// Create global state instance
const appState = new AppState();

// Load saved theme on startup
appState.loadTheme();

// Debug mode (set to true to see state changes in console)
window.DEBUG = false;

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = appState;
}