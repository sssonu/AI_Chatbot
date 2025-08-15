const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// OpenRouter API endpoint
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Hasura endpoint for inserting bot messages
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

app.post('/webhook/chatbot', async (req, res) => {
  try {
    const { chatId, message, userId } = req.body;

    console.log('Received chatbot request:', { chatId, message, userId });

    // Call OpenRouter API
    const openrouterResponse = await axios.post(
      OPENROUTER_API_URL,
      {
        model: 'mistralai/mistral-7b-instruct:free', // Using a free model
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant. Provide concise and helpful responses.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3002',
          'X-Title': 'Subspace Chatbot'
        }
      }
    );

    const botResponse = openrouterResponse.data.choices[0].message.content;

    // Insert bot message into Hasura
    const hasuraResponse = await axios.post(
      HASURA_ENDPOINT,
      {
        query: `
          mutation InsertBotMessage($chatId: uuid!, $content: String!, $userId: uuid!) {
            insert_messages_one(
              object: { chat_id: $chatId, content: $content, is_bot: true, user_id: $userId }
            ) {
              id
              content
              is_bot
              created_at
            }
          }
        `,
        variables: {
          chatId,
          content: botResponse,
          userId
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        }
      }
    );

    console.log('Bot message inserted:', hasuraResponse.data);

    // Return just the bot response string to match Hasura action definition
    res.json(botResponse);

  } catch (error) {
    console.error('Error processing chatbot request:', error.response?.data || error.message);
    res.status(500).json("Error processing chatbot request");
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
