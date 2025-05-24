import { evolutionWs } from './app/api/whatsapp/websocket';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const required = ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY', 'EVOLUTION_INSTANCE_NAME'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

// Initialize WebSocket connection
console.log('Initializing Evolution API WebSocket connection...');
console.log('Instance:', process.env.EVOLUTION_INSTANCE_NAME);
console.log('API URL:', process.env.EVOLUTION_API_URL);

// Check connection status after a short delay
setTimeout(() => {
  if (evolutionWs.isConnected()) {
    console.log('✅ WebSocket connection established');
  } else {
    console.log('⚠️ WebSocket connection not established, will retry automatically');
  }
}, 2000);
