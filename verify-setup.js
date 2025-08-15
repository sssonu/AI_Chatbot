#!/usr/bin/env node

const fetch = require('node-fetch');

async function verifySetup() {
    console.log('🔍 Verifying Chatbot Setup...\n');
    
    // Check webhook server
    try {
        console.log('1. Testing webhook server...');
        const response = await fetch('http://localhost:3001/webhook/chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: {
                    name: 'sendChatMessage'
                },
                input: {
                    message: 'Test message'
                }
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Webhook server is working!');
            console.log('   Response:', data);
        } else {
            console.log('❌ Webhook server returned error:', response.status);
        }
    } catch (error) {
        console.log('❌ Webhook server is not responding:', error.message);
        console.log('   Make sure to run: npm start in webhook-server directory');
    }
    
    console.log('\n2. Checking environment variables...');
    console.log('✅ NHOST_SUBDOMAIN:', process.env.VITE_NHOST_SUBDOMAIN || 'kkocyugxtcomocinxnpz');
    console.log('✅ HASURA_ENDPOINT:', process.env.VITE_HASURA_ENDPOINT || 'https://kkocyugxtcomocinxnpz.hasura.ap-south-1.nhost.run/v1/graphql');
    
    console.log('\n3. Next steps:');
    console.log('📋 Go to: https://app.nhost.io/dashboard');
    console.log('📋 Select your project: kkocyugxtcomocinxnpz');
    console.log('📋 Go to Hasura/GraphQL tab');
    console.log('📋 Create the sendChatMessage action as described above');
    
    console.log('\n🎯 After creating the action, test it with:');
    console.log('   npm run dev (in chatbot-app directory)');
}

// Load environment variables
require('dotenv').config();

verifySetup().catch(console.error);
