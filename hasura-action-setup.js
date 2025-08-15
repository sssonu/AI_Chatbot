/**
 * Hasura Action Setup Script
 * 
 * This action definition needs to be added to your Hasura Console.
 * Follow these steps:
 * 
 * 1. Open your Nhost project dashboard
 * 2. Go to Hasura Console
 * 3. Navigate to "Actions" tab
 * 4. Click "Create" 
 * 5. Copy the configuration below
 */

// ACTION NAME: sendChatbotMessage

// GRAPHQL DEFINITION:
const actionDefinition = `
type Mutation {
  sendChatbotMessage(chatId: String!, message: String!): ChatbotResponse
}

type ChatbotResponse {
  success: Boolean!
  message: String!
  response: String
}
`;

// HANDLER CONFIGURATION:
const handlerConfig = {
  handler: "http://localhost:3001/webhook/chatbot",
  forwardClientHeaders: true,
  timeout: 30
};

// TRANSFORM REQUEST:
const requestTransform = {
  body: `{
    "chatId": {{$body.input.chatId}},
    "message": {{$body.input.message}},
    "userId": {{$body.session_variables["x-hasura-user-id"]}}
  }`,
  headers: {
    "Content-Type": "application/json"
  }
};

// PERMISSIONS:
const permissions = [
  {
    role: "user",
    comment: "Allow authenticated users to send messages to chatbot"
  }
];

console.log("=== HASURA ACTION SETUP ===");
console.log("1. Action Definition:", actionDefinition);
console.log("2. Handler Config:", handlerConfig);
console.log("3. Request Transform:", requestTransform);
console.log("4. Permissions:", permissions);
