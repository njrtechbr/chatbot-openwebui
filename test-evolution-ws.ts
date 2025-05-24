import WebSocket from 'ws';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEvolutionWebSocket() {
  const wsUrl = `${process.env.EVOLUTION_API_URL?.replace('http', 'ws')}/evolution`;
  console.log('Connecting to:', wsUrl);

  const ws = new WebSocket(wsUrl, {
    headers: {
      'apikey': process.env.EVOLUTION_API_KEY || ''
    }
  });

  ws.on('open', () => {
    console.log('✅ Connected to Evolution API WebSocket');
    
    // Subscribe to instance events
    const subscribePayload = {
      action: 'subscribe',
      instance: process.env.EVOLUTION_INSTANCE_NAME
    };
    console.log('Subscribing to instance:', subscribePayload.instance);
    ws.send(JSON.stringify(subscribePayload));
  });

  ws.on('message', (data) => {
    try {
      const event = JSON.parse(data.toString());
      console.log('Received event:', JSON.stringify(event, null, 2));
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('Connection closed');
  });
}

console.log('Testing Evolution API WebSocket connection...');
testEvolutionWebSocket();
