# Deployment Guide

This guide will walk you through deploying the Subspace Chatbot application step by step.

## Prerequisites

Before starting, ensure you have accounts for:
- [Nhost](https://nhost.io) - Backend and authentication
- [n8n Cloud](https://n8n.io) - Workflow automation
- [OpenRouter](https://openrouter.ai) - AI API access
- [Netlify](https://netlify.com) - Frontend hosting
- GitHub account for code repository

## Step 1: Nhost Setup

### 1.1 Create Nhost Project

1. Sign up/login to [Nhost](https://nhost.io)
2. Create a new project
3. Choose a subdomain (e.g., `subspace-chatbot`)
4. Select region (e.g., `us-east-1`)
5. Wait for project initialization

### 1.2 Configure Database

1. Go to **Database** → **SQL Editor**
2. Execute the following SQL to create tables:

```sql
-- Create chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_bot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_updated_at ON chats(updated_at);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chats
CREATE POLICY "Users can view their own chats" ON chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats" ON chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" ON chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats" ON chats
  FOR DELETE USING (auth.uid() = user_id);

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

-- Trigger to update chat updated_at
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

### 1.3 Configure Hasura

1. Go to **GraphQL** → **Hasura Console**
2. Navigate to **Data** → **chats** → **Relationships**
3. Add array relationship:
   - Name: `messages`
   - Table: `messages`
   - From: `id`
   - To: `chat_id`

4. Navigate to **Data** → **messages** → **Relationships**
5. Add object relationship:
   - Name: `chat`
   - Table: `chats`
   - From: `chat_id`
   - To: `id`

6. Set up permissions for **user** role:

**Chats table permissions:**
- **Select**: `{"user_id": {"_eq": "X-Hasura-User-Id"}}`
- **Insert**: Check: `{"user_id": {"_eq": "X-Hasura-User-Id"}}`, Set: `{"user_id": "X-Hasura-User-Id"}`
- **Update**: Filter: `{"user_id": {"_eq": "X-Hasura-User-Id"}}`
- **Delete**: Filter: `{"user_id": {"_eq": "X-Hasura-User-Id"}}`

**Messages table permissions:**
- **Select**: `{"_or": [{"user_id": {"_eq": "X-Hasura-User-Id"}}, {"chat": {"user_id": {"_eq": "X-Hasura-User-Id"}}}]}`
- **Insert**: Check: `{"_and": [{"user_id": {"_eq": "X-Hasura-User-Id"}}, {"chat": {"user_id": {"_eq": "X-Hasura-User-Id"}}}]}`, Set: `{"user_id": "X-Hasura-User-Id"}`

## Step 2: OpenRouter Setup

1. Sign up at [OpenRouter](https://openrouter.ai)
2. Go to **API Keys** and create a new key
3. Save the API key for later use
4. Verify you have access to free models (like `openai/gpt-3.5-turbo`)

## Step 3: n8n Setup

### 3.1 Create n8n Account

1. Sign up at [n8n Cloud](https://n8n.io)
2. Create a new instance
3. Access your n8n workspace

### 3.2 Configure Environment Variables

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:
   - `HASURA_ENDPOINT`: `https://your-subdomain.nhost.run/v1/graphql`
   - `HASURA_ADMIN_SECRET`: (from Nhost project settings)
   - `OPENROUTER_API_KEY`: (from OpenRouter)

### 3.3 Create Webhook Workflow

1. Create a new workflow
2. Add **Webhook** trigger node:
   - Method: POST
   - Path: `chatbot`
   - Response Mode: "Respond to Webhook"

3. Add **Code** node for input validation:

```javascript
// Extract and validate input
const chatId = $json.input.chatId;
const message = $json.input.message;
const userId = $json.session_variables['x-hasura-user-id'];

if (!chatId || !message || !userId) {
  $respond.json({
    success: false,
    message: "Missing required parameters",
    response: null
  });
  return;
}

return {
  chatId,
  message,
  userId
};
```

4. Add **HTTP Request** node for chat validation:
   - URL: `{{ $env.HASURA_ENDPOINT }}`
   - Method: POST
   - Headers: `x-hasura-admin-secret: {{ $env.HASURA_ADMIN_SECRET }}`
   - Body:
```json
{
  "query": "query ValidateChat($chatId: uuid!) { chats_by_pk(id: $chatId) { id user_id } }",
  "variables": {
    "chatId": "{{ $('Code').item.json.chatId }}"
  }
}
```

5. Add **Code** node for ownership validation:

```javascript
const chat = $json.data.chats_by_pk;
const userId = $('Code').item.json.userId;

if (!chat || chat.user_id !== userId) {
  $respond.json({
    success: false,
    message: "Chat not found or access denied",
    response: null
  });
  return;
}

return { validated: true };
```

6. Add **HTTP Request** node for OpenRouter:
   - URL: `https://openrouter.ai/api/v1/chat/completions`
   - Method: POST
   - Headers: `Authorization: Bearer {{ $env.OPENROUTER_API_KEY }}`
   - Body:
```json
{
  "model": "openai/gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful AI assistant. Provide concise, accurate, and friendly responses."
    },
    {
      "role": "user",
      "content": "{{ $('Code').item.json.message }}"
    }
  ],
  "max_tokens": 500,
  "temperature": 0.7
}
```

7. Add **HTTP Request** node to save bot response:
   - URL: `{{ $env.HASURA_ENDPOINT }}`
   - Method: POST
   - Headers: `x-hasura-admin-secret: {{ $env.HASURA_ADMIN_SECRET }}`
   - Body:
```json
{
  "query": "mutation InsertBotMessage($chatId: uuid!, $content: String!, $userId: uuid!) { insert_messages_one(object: { chat_id: $chatId, content: $content, is_bot: true, user_id: $userId }) { id } }",
  "variables": {
    "chatId": "{{ $('Code').item.json.chatId }}",
    "content": "{{ $('HTTP Request1').item.json.choices[0].message.content }}",
    "userId": "{{ $('Code').item.json.userId }}"
  }
}
```

8. Add **Respond to Webhook** node:
```json
{
  "success": true,
  "message": "Message processed successfully",
  "response": "{{ $('HTTP Request1').item.json.choices[0].message.content }}"
}
```

9. Connect all nodes and save the workflow
10. Copy the webhook URL for use in Hasura Actions

## Step 4: Hasura Actions Setup

1. In Hasura Console, go to **Actions**
2. Create new action:
   - Name: `sendChatbotMessage`
   - Definition:
```graphql
type Mutation {
  sendChatbotMessage(chatId: String!, message: String!): ChatbotResponse
}

type ChatbotResponse {
  success: Boolean!
  message: String!
  response: String
}
```

3. Set handler URL to your n8n webhook URL
4. Add permissions for **user** role
5. Save the action

## Step 5: Frontend Deployment

### 5.1 Prepare Repository

1. Push your code to a GitHub repository
2. Update `.env` with your actual values:

```env
VITE_NHOST_SUBDOMAIN=your-actual-subdomain
VITE_NHOST_REGION=us-east-1
VITE_HASURA_ENDPOINT=https://your-subdomain.nhost.run/v1/graphql
VITE_HASURA_WS_ENDPOINT=wss://your-subdomain.nhost.run/v1/graphql
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.n8n.cloud/webhook/chatbot
```

### 5.2 Deploy to Netlify

1. Log in to [Netlify](https://netlify.com)
2. Click "Import from Git"
3. Connect your GitHub repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables in Netlify dashboard
6. Deploy the site

## Step 6: Testing

### 6.1 Test Authentication
1. Visit your deployed site
2. Try signing up with a new email
3. Check email verification
4. Try signing in

### 6.2 Test Chat Functionality
1. Create a new chat
2. Send a message
3. Verify bot response
4. Check real-time updates

### 6.3 Test Permissions
1. Create multiple users
2. Verify users can only see their own chats
3. Test RLS policies

## Troubleshooting

### Common Issues

**Nhost Connection Issues:**
- Check subdomain and region in environment variables
- Verify project is running in Nhost dashboard

**Hasura Permission Errors:**
- Check RLS policies are correctly set
- Verify user role permissions
- Check JWT token validity

**n8n Webhook Issues:**
- Verify webhook URL is accessible
- Check environment variables in n8n
- Test workflow manually

**OpenRouter API Errors:**
- Verify API key is valid
- Check rate limits
- Ensure model is available

**Netlify Build Errors:**
- Check environment variables are set
- Verify build command and publish directory
- Check for dependency issues

## Environment Variables Summary

**Frontend (.env):**
```
VITE_NHOST_SUBDOMAIN=your-subdomain
VITE_NHOST_REGION=us-east-1
VITE_HASURA_ENDPOINT=https://your-subdomain.nhost.run/v1/graphql
VITE_HASURA_WS_ENDPOINT=wss://your-subdomain.nhost.run/v1/graphql
VITE_N8N_WEBHOOK_URL=https://your-n8n.n8n.cloud/webhook/chatbot
```

**n8n Environment Variables:**
```
HASURA_ENDPOINT=https://your-subdomain.nhost.run/v1/graphql
HASURA_ADMIN_SECRET=your-admin-secret
OPENROUTER_API_KEY=your-openrouter-key
```

## Final Verification

1. ✅ User registration and login works
2. ✅ Users can create chats
3. ✅ Users can send messages
4. ✅ Bot responds to messages
5. ✅ Real-time updates work
6. ✅ Users can only see their own data
7. ✅ No REST API calls from frontend
8. ✅ All communication is via GraphQL

Your Subspace Chatbot application is now deployed and ready for submission!
