# Hasura Actions Configuration

## sendChatbotMessage Action

### GraphQL Definition

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

### Action Configuration

```yaml
- name: sendChatbotMessage
  definition:
    kind: synchronous
    handler: http://localhost:3001/webhook/chatbot
    forward_client_headers: true
    headers:
      - name: X-Hasura-User-Id
        value_from_env: HASURA_GRAPHQL_USER_ID_HEADER
    timeout: 30
  permissions:
    - role: user
  comment: Send message to chatbot via n8n workflow
```

### Handler URL
- Production: `https://your-n8n-instance.n8n.cloud/webhook/chatbot`
- Development: `http://localhost:5678/webhook/chatbot`

### Headers Forwarded
- `Authorization`: Bearer token for user authentication
- `X-Hasura-User-Id`: Current user ID
- `X-Hasura-Role`: User role (should be 'user')

### Request Format
```json
{
  "action": {
    "name": "sendChatbotMessage"
  },
  "input": {
    "chatId": "uuid-string",
    "message": "user message content"
  },
  "request_query": "mutation { ... }",
  "session_variables": {
    "x-hasura-user-id": "user-uuid",
    "x-hasura-role": "user"
  }
}
```

### Expected Response Format
```json
{
  "success": true,
  "message": "Message processed successfully",
  "response": "Chatbot response content"
}
```

### Error Handling
```json
{
  "success": false,
  "message": "Error description",
  "response": null
}
```

## Permissions

### User Role Permissions
- **Allow**: Users can only call this action for chats they own
- **Validation**: The action handler must validate that the user owns the specified chat
- **Rate Limiting**: Consider implementing rate limiting per user

### Security Considerations
1. Validate user ownership of chat in n8n workflow
2. Sanitize input messages before sending to OpenRouter
3. Implement proper error handling and logging
4. Use secure webhook URLs (HTTPS only)
5. Validate webhook signatures if possible
