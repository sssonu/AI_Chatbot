#!/usr/bin/env node

// Test script for n8n webhook
// Replace YOUR_N8N_WEBHOOK_URL with your actual n8n webhook URL

import https from 'https';

const webhookUrl = 'https://gopifat.app.n8n.cloud/webhook/webhook/chatbot'; // Replace with your actual URL
const testPayload = {
  input: {
    chatId: 'a7995b04-bab9-4fc5-8030-79e962e7f5b0',
    message: 'Hello from test script'
  },
  session_variables: {
    'x-hasura-user-id': 'bfb90155-3508-44a4-a9f2-6db540c1b1c6',
    'x-hasura-role': 'user'
  }
};

console.log('🧪 Testing n8n webhook...');
console.log('URL:', webhookUrl);
console.log('Payload:', JSON.stringify(testPayload, null, 2));

if (webhookUrl === 'YOUR_N8N_WEBHOOK_URL') {
  console.log('❌ Please update the webhookUrl variable with your actual n8n webhook URL');
  process.exit(1);
}

const url = new URL(webhookUrl);
const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = https.request(options, (res) => {
  console.log(`✅ Response Status: ${res.statusCode}`);
  console.log('Response Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response Body:', data);
    if (res.statusCode === 200) {
      console.log('🎉 Webhook test successful!');
    } else {
      console.log('❌ Webhook test failed');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.write(JSON.stringify(testPayload));
req.end();
