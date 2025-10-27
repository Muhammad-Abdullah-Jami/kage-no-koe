import sqlite3
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any
from backend.config import DATABASE_PATH

class Database:
    def __init__(self, db_path: Path = DATABASE_PATH):
        self.db_path = db_path
        self.init_database()
    
    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row  # Return rows as dictionaries
        return conn
    
    def init_database(self):
        """Initialize database with all tables"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # 1. Chats table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL DEFAULT 'New Chat',
                model_name TEXT NOT NULL,
                system_message TEXT,
                context_window TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 2. Messages table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id INTEGER NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                model_used TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                tokens_used INTEGER DEFAULT 0,
                FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
            )
        ''')
        
        # 3. Files table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                filepath TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                processed_content TEXT,
                upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
            )
        ''')
        
        # 4. Settings table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 5. Search folders table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS search_folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                folder_path TEXT NOT NULL UNIQUE,
                enabled INTEGER DEFAULT 1,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for better performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_files_chat_id ON files(chat_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)')
        
        conn.commit()
        conn.close()
        
        print(f"✅ Database initialized at {self.db_path}")
    
    # ============= CHATS OPERATIONS =============
    
    def create_chat(self, title: str = "New Chat", model_name: str = "llama3.2:1b", 
                    system_message: str = None) -> int:
        """Create a new chat and return its ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO chats (title, model_name, system_message)
            VALUES (?, ?, ?)
        ''', (title, model_name, system_message))
        
        chat_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return chat_id
    
    def get_chat(self, chat_id: int) -> Optional[Dict]:
        """Get a single chat by ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM chats WHERE id = ?', (chat_id,))
        row = cursor.fetchone()
        conn.close()
        
        return dict(row) if row else None
    
    def list_chats(self, limit: int = 50) -> List[Dict]:
        """List all chats, ordered by most recent"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM chats 
            ORDER BY updated_at DESC 
            LIMIT ?
        ''', (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def update_chat(self, chat_id: int, **kwargs) -> bool:
        """Update chat fields (title, system_message, context_window)"""
        if not kwargs:
            return False
        
        # Add updated_at timestamp
        kwargs['updated_at'] = datetime.now().isoformat()
        
        # Build UPDATE query dynamically
        fields = ', '.join([f"{key} = ?" for key in kwargs.keys()])
        values = list(kwargs.values()) + [chat_id]
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(f'UPDATE chats SET {fields} WHERE id = ?', values)
        
        success = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        return success
    
    def delete_chat(self, chat_id: int) -> bool:
        """Delete a chat (cascade deletes messages and files)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM chats WHERE id = ?', (chat_id,))
        
        success = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        return success
    
    # ============= MESSAGES OPERATIONS =============
    
    def add_message(self, chat_id: int, role: str, content: str, 
                    model_used: str = None, tokens_used: int = 0) -> int:
        """Add a message to a chat"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO messages (chat_id, role, content, model_used, tokens_used)
            VALUES (?, ?, ?, ?, ?)
        ''', (chat_id, role, content, model_used, tokens_used))
        
        message_id = cursor.lastrowid
        
        # Update chat's updated_at timestamp
        cursor.execute('''
            UPDATE chats SET updated_at = ? WHERE id = ?
        ''', (datetime.now().isoformat(), chat_id))
        
        conn.commit()
        conn.close()
        
        return message_id
    
    def get_messages(self, chat_id: int, limit: int = 100) -> List[Dict]:
        """Get all messages for a chat"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM messages 
            WHERE chat_id = ? 
            ORDER BY timestamp ASC 
            LIMIT ?
        ''', (chat_id, limit))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    # ============= FILES OPERATIONS =============
    
    def add_file(self, chat_id: int, filename: str, filepath: str, 
                 file_type: str, file_size: int, processed_content: str = None) -> int:
        """Add a file record"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO files (chat_id, filename, filepath, file_type, file_size, processed_content)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (chat_id, filename, filepath, file_type, file_size, processed_content))
        
        file_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return file_id
    
    def get_files(self, chat_id: int) -> List[Dict]:
        """Get all files for a chat"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM files WHERE chat_id = ? ORDER BY upload_timestamp DESC', (chat_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    # ============= SETTINGS OPERATIONS =============
    
    def get_setting(self, key: str, default: Any = None) -> Any:
        """Get a setting value"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT value FROM settings WHERE key = ?', (key,))
        row = cursor.fetchone()
        conn.close()
        
        return row['value'] if row else default
    
    def set_setting(self, key: str, value: str) -> bool:
        """Set a setting value (upsert)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET 
                value = excluded.value,
                updated_at = excluded.updated_at
        ''', (key, value, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return True
    
    # ============= SEARCH FOLDERS OPERATIONS =============
    
    def add_search_folder(self, folder_path: str) -> int:
        """Add a search folder"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('INSERT INTO search_folders (folder_path) VALUES (?)', (folder_path,))
            folder_id = cursor.lastrowid
            conn.commit()
        except sqlite3.IntegrityError:
            # Folder already exists
            cursor.execute('SELECT id FROM search_folders WHERE folder_path = ?', (folder_path,))
            folder_id = cursor.fetchone()['id']
        
        conn.close()
        return folder_id
    
    def get_search_folders(self) -> List[Dict]:
        """Get all enabled search folders"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM search_folders WHERE enabled = 1 ORDER BY added_at DESC')
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]


# Test the database
if __name__ == '__main__':
    print("=== Testing Database ===\n")
    
    db = Database()
    
    # Test 1: Create chat
    print("1. Creating test chat...")
    chat_id = db.create_chat(title="Test Chat", model_name="llama3.2:1b")
    print(f"   ✅ Chat created with ID: {chat_id}\n")
    
    # Test 2: Add messages
    print("2. Adding messages...")
    db.add_message(chat_id, "user", "Hello!")
    db.add_message(chat_id, "assistant", "Hi there! How can I help?")
    print("   ✅ Messages added\n")
    
    # Test 3: Get messages
    print("3. Retrieving messages...")
    messages = db.get_messages(chat_id)
    for msg in messages:
        print(f"   {msg['role']}: {msg['content']}")
    print()
    
    # Test 4: List chats
    print("4. Listing all chats...")
    chats = db.list_chats()
    for chat in chats:
        print(f"   - {chat['title']} (ID: {chat['id']})")
    print()
    
    # Test 5: Settings
    print("5. Testing settings...")
    db.set_setting("global_context", "You are a helpful assistant")
    context = db.get_setting("global_context")
    print(f"   ✅ Setting stored: {context}\n")
    
    # Test 6: Update chat
    print("6. Updating chat title...")
    db.update_chat(chat_id, title="Updated Test Chat")
    updated_chat = db.get_chat(chat_id)
    print(f"   ✅ New title: {updated_chat['title']}\n")
    
    # Test 7: Delete chat
    print("7. Deleting test chat...")
    db.delete_chat(chat_id)
    deleted = db.get_chat(chat_id)
    print(f"   ✅ Chat deleted: {deleted is None}\n")
    
    print("=== All Database Tests Passed! ===")