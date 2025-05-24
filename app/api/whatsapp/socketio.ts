import { io, Socket } from 'socket.io-client';
import { processMessage } from '../chat/r    this.socket.on('messages.upsert', async (data: MessageUpsertData) => {
      try {
        await this.handleIncomingMessage(data);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    // Listen for connection state updates
    this.socket.on('connection.update', (update: ConnectionUpdate) => {
      console.log('WhatsApp connection status:', update.state);
    });t { sendWhatsAppMessage } from './evolutionClient';

interface WhatsAppMessage {
  fromMe: boolean;
  from: string;
  conversation?: string;
  extendedTextMessage?: {
    text: string;
  };
}

interface MessageUpsertData {
  message: WhatsAppMessage;
}

interface ConnectionUpdate {
  state: 'open' | 'closed' | 'connecting';
}

class EvolutionSocketIO {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isInitialized = false;

  constructor() {
    // Delay initialization to ensure environment variables are loaded
    setTimeout(() => this.initialize(), 1000);
  }

  private validateConfig() {
    const required = {
      EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
      EVOLUTION_INSTANCE_NAME: process.env.EVOLUTION_INSTANCE_NAME
    };

    const missing = Object.entries(required)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return required;
  }

  private initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    try {
      const config = this.validateConfig();
      const instanceName = config.EVOLUTION_INSTANCE_NAME;
      
      console.log('Initializing Evolution API Socket.IO connection...');
      console.log('Instance:', instanceName);
      
      this.socket = io(config.EVOLUTION_API_URL, {
        transports: ['websocket'],
        path: `/${instanceName}`
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize Socket.IO:', error);
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to Evolution API Socket.IO');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Evolution API Socket.IO');
    });

    this.socket.on('error', (error: Error) => {
      console.error('Socket.IO error:', error);
    });

    // Listen for WhatsApp messages
    this.socket.on('messages.upsert', async (data: MessageUpsertData) => {
      try {
        await this.handleIncomingMessage(data);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    // Listen for connection state updates
    this.socket.on('connection.update', (update: ConnectionUpdate) => {
      console.log('WhatsApp connection status:', update?.state);
    });

    // Handle reconnection
    this.socket.io.on('reconnect_attempt', (attempt: number) => {
      this.reconnectAttempts = attempt;
      console.log(`Reconnection attempt ${attempt}/${this.maxReconnectAttempts}`);
      
      if (attempt > this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.socket?.disconnect();
      }
    });
  }

  private async handleIncomingMessage(data: MessageUpsertData) {
    const message = data?.message;
    if (!message) {
      console.log('No message in event:', data);
      return;
    }

    // Ignore messages from the bot itself
    if (message.fromMe) {
      console.log('Ignoring own message');
      return;
    }

    const text = message.conversation || message.extendedTextMessage?.text;
    if (!text) {
      console.log('No text content in message');
      return;
    }

    const sender = message.from;
    console.log('Processing message from:', sender);
    console.log('Message content:', text);

    try {
      const response = await processMessage(text);
      console.log('Sending response:', response);
      await sendWhatsAppMessage(sender, response);
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getStatus() {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      instance: process.env.EVOLUTION_INSTANCE_NAME,
      initialized: this.isInitialized
    };
  }

  public disconnect() {
    if (this.socket) {
      console.log('Disconnecting from Evolution API Socket.IO');
      this.socket.disconnect();
    }
  }
}

// Export a singleton instance
export const evolutionSocket = new EvolutionSocketIO();
