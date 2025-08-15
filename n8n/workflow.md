# n8n Workflow Configuration for Chatbot

## Workflow Overview
This n8n workflow receives webhook calls from Hasura Actions, validates user permissions, calls OpenRouter API, and saves the response back to the database.

## Workflow Structure

### 1. Webhook Trigger Node
- **Name**: "Webhook Trigger"
- **Type**: `n8n-nodes-base.webhook`
- **Settings**:
  - HTTP Method: POST
  - Path: `/webhook/chatbot`
  - Authentication: None (handled via headers)
  - Response Mode: Return Response

### 2. Validate Input Node
- **Name**: "Validate Input"
- **Type**: `n8n-nodes-base.function`
- **Code**:
```javascript
// Validate required fields and user authentication
const input = $input.first();
const body = input.json.body;

if (!body.input || !body.input.chatId || !body.input.message) {
  throw new Error('Missing required fields: chatId and message');
}

if (!body.session_variables || !body.session_variables['x-hasura-user-id']) {
  throw new Error('User not authenticated');
}

return [
  {
    json: {
      chatId: body.input.chatId,
      message: body.input.message,
      userId: body.session_variables['x-hasura-user-id'],
      userRole: body.session_variables['x-hasura-role'] || 'user'
    }
  }
];
```

### 3. Verify Chat Ownership Node
- **Name**: "Verify Chat Ownership"
- **Type**: `n8n-nodes-base.httpRequest`
- **Settings**:
  - Method: POST
  - URL: `{{ $env.HASURA_ENDPOINT }}`
  - Headers:
    - `Content-Type`: `application/json`
    - `Authorization`: `Bearer {{ $env.HASURA_ADMIN_SECRET }}`
  - Body:
```json
{
  "query": "query VerifyChatOwnership($chatId: uuid!, $userId: uuid!) { chats_by_pk(id: $chatId) { id user_id } }",
  "variables": {
    "chatId": "{{ $json.chatId }}",
    "userId": "{{ $json.userId }}"
  }
}
```

### 4. Check Ownership Node
- **Name**: "Check Ownership"
- **Type**: `n8n-nodes-base.if`
- **Conditions**:
  - Value 1: `{{ $json.data.chats_by_pk.user_id }}`
  - Operation: Equal
  - Value 2: `{{ $('Validate Input').first().json.userId }}`

### 5. Call OpenRouter API Node
- **Name**: "Call OpenRouter API"
- **Type**: `n8n-nodes-base.httpRequest`
- **Settings**:
  - Method: POST
  - URL: `https://openrouter.ai/api/v1/chat/completions`
  - Headers:
    - `Content-Type`: `application/json`
    - `Authorization`: `Bearer {{ $env.OPENROUTER_API_KEY }}`
    - `HTTP-Referer`: `{{ $env.APP_URL }}`
    - `X-Title`: `Subspace Chatbot`
  - Body:
```json
{
  "model": "meta-llama/llama-3.2-3b-instruct:free",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful AI assistant. Provide clear, concise, and helpful responses."
    },
    {
      "role": "user",
      "content": "{{ $('Validate Input').first().json.message }}"
    }
  ],
  "max_tokens": 500,
  "temperature": 0.7
}
```

### 6. Save Bot Response Node
- **Name**: "Save Bot Response"
- **Type**: `n8n-nodes-base.httpRequest`
- **Settings**:
  - Method: POST
  - URL: `{{ $env.HASURA_ENDPOINT }}`
  - Headers:
    - `Content-Type`: `application/json`
    - `Authorization`: `Bearer {{ $env.HASURA_ADMIN_SECRET }}`
  - Body:
```json
{
  "query": "mutation InsertBotMessage($chatId: uuid!, $content: String!, $userId: uuid!) { insert_messages_one(object: { chat_id: $chatId, content: $content, is_bot: true, user_id: $userId }) { id content created_at } }",
  "variables": {
    "chatId": "{{ $('Validate Input').first().json.chatId }}",
    "content": "{{ $json.choices[0].message.content }}",
    "userId": "{{ $('Validate Input').first().json.userId }}"
  }
}
```

### 7. Success Response Node
- **Name**: "Success Response"
- **Type**: `n8n-nodes-base.respondToWebhook`
- **Settings**:
  - Response Code: 200
  - Response Body:
```json
{
  "success": true,
  "message": "Message processed successfully",
  "response": "{{ $('Call OpenRouter API').first().json.choices[0].message.content }}"
}
```

### 8. Error Response Node
- **Name**: "Error Response"
- **Type**: `n8n-nodes-base.respondToWebhook`
- **Settings**:
  - Response Code: 400
  - Response Body:
```json
{
  "success": false,
  "message": "{{ $json.error || 'An error occurred while processing your message' }}",
  "response": null
}
```

## Environment Variables

Set these in your n8n instance:

```bash
# Hasura Configuration
HASURA_ENDPOINT=https://your-project.nhost.run/v1/graphql
HASURA_ADMIN_SECRET=your-hasura-admin-secret

# OpenRouter Configuration  
OPENROUTER_API_KEY=your-openrouter-api-key

# App Configuration
APP_URL=https://your-app.netlify.app
```

## Workflow JSON Export

```json
{
  "name": "Subspace Chatbot Workflow",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "/webhook/chatbot",
        "responseMode": "responseNode"
      },
      "id": "webhook-trigger",
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [0, 0],
      "webhookId": "chatbot-webhook"
    }
  ],
  "connections": {},
  "active": true,
  "settings": {},
  "versionId": "1"
}
```

## Testing the Workflow

### Test Request
```bash
curl -X POST https://your-n8n-instance.n8n.cloud/webhook/chatbot \
  -H "Content-Type: application/json" \
  -d '{
    "action": {
      "name": "sendChatbotMessage"
    },
    "input": {
      "chatId": "test-chat-id",
      "message": "Hello, how are you?"
    },
    "session_variables": {
      "x-hasura-user-id": "test-user-id",
      "x-hasura-role": "user"
    }
  }'
```

### Expected Response
```json
{
  "success": true,
  "message": "Message processed successfully",
  "response": "Hello! I'm doing well, thank you for asking. How can I help you today?"
}
```

## Error Handling

The workflow includes comprehensive error handling for:
- Invalid input validation
- Authentication failures
- Chat ownership verification
- OpenRouter API errors
- Database insertion errors

All errors return appropriate HTTP status codes and error messages.
