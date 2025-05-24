import { WhatsAppWebhookBody } from './app/api/whatsapp/types';
import fetch from 'node-fetch';

const testWebhook: WhatsAppWebhookBody = {
  event: 'messages.upsert',
  data: {
    message: {
      fromMe: false,
      from: '5511999999999@s.whatsapp.net',
      conversation: 'Olá! Quais são os serviços do cartório?'
    }
  }
};

async function testWhatsAppWebhook() {
  try {
    // First make sure the server is running
    console.log('Testing WhatsApp webhook...');
    console.log('Sending test message:', testWebhook.data.message.conversation);
    
    const response = await fetch('http://localhost:3000/api/whatsapp/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testWebhook)
    });

    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nMake sure your Next.js server is running!');
      console.error('Run: npm run dev');
    }
  }
}

testWhatsAppWebhook();
