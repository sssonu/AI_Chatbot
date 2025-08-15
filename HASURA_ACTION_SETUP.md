# 🚀 QUICK SETUP GUIDE FOR HASURA ACTION

## Step 1: Access Hasura Console
Click this link to go directly to your Hasura Console:
**https://kkocyugxtcomocinxnpz.hasura.ap-south-1.nhost.run/console**

## Step 2: Create the Action
1. In Hasura Console, go to **"Actions"** tab
2. Click **"Create"** button
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

### Handler URL:
```
https://[your-n8n-instance].app.n8n.cloud/webhook/chatbot
```

**⚠️ IMPORTANT**: Replace `[your-n8n-instance]` with your actual n8n instance URL!
You can find this in your n8n workflow by clicking on the "Webhook Trigger" node and copying the "Production URL".

### Request Transform (Important!):
In the "Request Transform" section, enable it and add:

**Body:**
```json
{
  "chatId": {{$body.input.chatId}},
  "message": {{$body.input.message}},
  "userId": {{$body.session_variables["x-hasura-user-id"]}}
}
```

**Headers:**
- Add header: `Content-Type` with value `application/json`

## Step 3: Set Permissions
1. Go to **"Permissions"** tab of the action
2. Add role: **`user`**
3. Click **"Save Permissions"**

## Step 4: Test
After saving, test the action in GraphiQL:
```graphql
mutation TestChatbot {
  sendChatbotMessage(chatId: "test", message: "Hello!") {
    success
    message
    response
  }
}
```

## ✅ Once this is set up, your chatbot will be fully functional!
