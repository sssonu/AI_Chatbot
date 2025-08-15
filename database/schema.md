# Hasura Database Schema and Configuration

## Tables

### 1. Users Table (handled by Nhost Auth)
The users table is automatically managed by Nhost Auth.

### 2. Chats Table

```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_updated_at ON chats(updated_at);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chats
CREATE POLICY "Users can view their own chats" ON chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats" ON chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" ON chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats" ON chats
  FOR DELETE USING (auth.uid() = user_id);
```

### 3. Messages Table

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_bot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view messages from their chats" ON messages
  FOR SELECT USING (
    auth.uid() = user_id OR 
    chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert messages to their chats" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid())
  );

CREATE POLICY "System can insert bot messages" ON messages
  FOR INSERT WITH CHECK (
    is_bot = TRUE AND
    chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid())
  );
```

## Hasura Permissions

### Chats Table Permissions (user role)

#### Select Permission
```json
{
  "filter": {
    "user_id": {
      "_eq": "X-Hasura-User-Id"
    }
  },
  "allow_aggregations": true
}
```

#### Insert Permission
```json
{
  "check": {
    "user_id": {
      "_eq": "X-Hasura-User-Id"
    }
  },
  "set": {
    "user_id": "X-Hasura-User-Id"
  }
}
```

#### Update Permission
```json
{
  "filter": {
    "user_id": {
      "_eq": "X-Hasura-User-Id"
    }
  },
  "check": {
    "user_id": {
      "_eq": "X-Hasura-User-Id"
    }
  }
}
```

#### Delete Permission
```json
{
  "filter": {
    "user_id": {
      "_eq": "X-Hasura-User-Id"
    }
  }
}
```

### Messages Table Permissions (user role)

#### Select Permission
```json
{
  "filter": {
    "_or": [
      {
        "user_id": {
          "_eq": "X-Hasura-User-Id"
        }
      },
      {
        "chat": {
          "user_id": {
            "_eq": "X-Hasura-User-Id"
          }
        }
      }
    ]
  }
}
```

#### Insert Permission
```json
{
  "check": {
    "_and": [
      {
        "user_id": {
          "_eq": "X-Hasura-User-Id"
        }
      },
      {
        "chat": {
          "user_id": {
            "_eq": "X-Hasura-User-Id"
          }
        }
      }
    ]
  },
  "set": {
    "user_id": "X-Hasura-User-Id"
  }
}
```

## Relationships

### Chats Table
- **messages**: Array relationship to messages table (chat_id → messages.chat_id)
- **user**: Object relationship to auth.users table (user_id → auth.users.id)

### Messages Table
- **chat**: Object relationship to chats table (chat_id → chats.id)
- **user**: Object relationship to auth.users table (user_id → auth.users.id)

## Functions and Triggers

### Update chat updated_at timestamp
```sql
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats 
  SET updated_at = NOW() 
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_updated_at
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_updated_at();
```
