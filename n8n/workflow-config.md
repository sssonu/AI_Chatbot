# n8n Workflow Configuration

## Webhook Configuration

### Webhook Settings
- **Method**: POST
- **Path**: `/webhook/chatbot`
- **Authentication**: None (we'll validate using Hasura headers)
- **Response Mode**: Respond to Webhook

### Environment Variables in n8n
```
HASURA_ENDPOINT=https://your-project.nhost.run/v1/graphql
HASURA_ADMIN_SECRET=your-hasura-admin-secret
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

## Workflow Steps

### 1. Webhook Trigger
- Receives POST request from Hasura Action
- Extracts chatId, message, and user info from payload

### 2. Validate User Ownership
```javascript
// Validate that user owns the chat
const chatId = $json.input.chatId;
const userId = $json.session_variables['x-hasura-user-id'];

// Query Hasura to verify ownership
const query = `
  query ValidateChat($chatId: uuid!, $userId: uuid!) {
    chats_by_pk(id: $chatId) {
      id
      user_id
    }
  }
`;

const variables = { chatId, userId };
```

### 3. Call OpenRouter API
```javascript
// Prepare OpenRouter request
const messages = [
  {
    role: "system",
    content: "You are a helpful AI assistant. Provide concise, accurate, and friendly responses."
  },
  {
    role: "user", 
    content: $json.input.message
  }
];

const requestBody = {
  model: "openai/gpt-3.5-turbo", // Free tier model
  messages: messages,
  max_tokens: 500,
  temperature: 0.7
};
```

### 4. Save Bot Response
```javascript
// Insert bot message into database
const mutation = `
  mutation InsertBotMessage($chatId: uuid!, $content: String!, $userId: uuid!) {
    insert_messages_one(object: {
      chat_id: $chatId,
      content: $content,
      is_bot: true,
      user_id: $userId
    }) {
      id
      content
      created_at
    }
  }
`;
```

### 5. Return Response
```javascript
// Return success response to Hasura Action
return {
  success: true,
  message: "Message processed successfully",
  response: botResponse.content
};
```

## Error Handling

### Validation Errors
```javascript
if (!chatExists || chatExists.user_id !== userId) {
  return {
    success: false,
    message: "Chat not found or access denied",
    response: null
  };
}
```

### API Errors
```javascript
if (openRouterResponse.error) {
  return {
    success: false,
    message: "Failed to generate response",
    response: null
  };
}
```

### Database Errors
```javascript
if (insertError) {
  return {
    success: false,
    message: "Failed to save response",
    response: null
  };
}
```
