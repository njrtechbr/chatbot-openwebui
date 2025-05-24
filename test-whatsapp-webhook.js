// Test script for WhatsApp webhook
import fetch from 'node-fetch';

const testWebhook = {
  event: 'messages.upsert',
  data: {
    message: {
      fromMe: false,
      from: '5577998094395@s.whatsapp.net',
      conversation: 'Olá! Quais são os serviços do cartório?'
    }
  }
};

async function testWhatsAppWebhook() {
  try {
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
  }
}

testWhatsAppWebhook();
