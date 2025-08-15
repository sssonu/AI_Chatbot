# Hasura Console Setup Instructions

## Step 1: Access Hasura Console
1. Go to your Nhost dashboard: https://app.nhost.io/
2. Select your project
3. Click on "Hasura" in the left sidebar
4. Click "Open Hasura Console"

## Step 2: Create the Action
1. In Hasura Console, go to the "Actions" tab
2. Click "Create" button
3. Copy and paste the following:

### Action Definition:
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

### Handler Configuration:
- **Handler URL**: `http://localhost:3001/webhook/chatbot`
- **Forward Client Headers**: Check this box
- **Timeout**: 30 seconds

### Additional Headers:
Add these headers in the "Headers" section:
- Name: `X-Hasura-User-Id`
- Value: `{{X-Hasura-User-Id}}`

## Step 3: Set Permissions
1. In the "Permissions" tab of the action
2. Add role: `user`
3. Click "Save Permissions"

## Step 4: Test the Action
After starting the webhook server, you can test the action in the Hasura Console's GraphiQL interface:

```graphql
mutation TestChatbot {
  sendChatbotMessage(chatId: "your-chat-id", message: "Hello, how are you?") {
    success
    message
    response
  }
}
```

## Important Notes:
- Make sure the webhook server is running on port 3001
- Update the webhook server's .env with your Hasura Admin Secret and OpenRouter API key
- The action will only work when both servers (main app and webhook) are running
