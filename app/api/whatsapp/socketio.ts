import { io, Socket } from 'socket.io-client';
import { getConversationIdForWhatsapp } from '../chat/conversation-manager';
import { sendWhatsAppMessage } from './evolutionClient';
import { WhatsAppWebhookBody } from './types';
import { processMessage } from '@/app/api/chat/route'; // Added import for processMessage

interface ConnectionUpdate {
  state: 'open' | 'closed' | 'connecting';
}

class EvolutionSocketIO {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isInitialized = false;
  private reconnecting = false;

  constructor() {
    setTimeout(() => this.initialize(), 1000);
  }

  private validateConfig() {
    const required = {
      EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
      EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
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
      
      // Remove trailing slashes from the URL
      const baseUrl = (config.EVOLUTION_API_URL as string).replace(/\/+$/, '');
      console.log('Connecting to Socket.IO URL:', baseUrl);
      
      this.socket = io(baseUrl, {
        transports: ['websocket'],
        query: {
          instance: instanceName,
        },
        auth: {
          apikey: config.EVOLUTION_API_KEY as string
        },
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 5000,
        reconnectionDelayMax: 15000,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 20000
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
      this.reconnecting = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from Evolution API Socket.IO:', reason);
      if (!this.reconnecting) {
        this.reconnecting = true;
        this.tryReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      if (!this.reconnecting) {
        this.reconnecting = true;
        this.tryReconnect();
      }
    });

    // Listen for WhatsApp status events
    this.socket.on('connection.update', (update: any) => {
      console.log('WhatsApp connection status update:', update);
    });

    this.socket.on('qr', (qr: any) => {
      console.log('New QR Code received:', qr);
    });

    this.socket.on('ready', () => {
      console.log('WhatsApp is ready!');
    });

    // Listen for message events
    ['message.create', 'messages.upsert'].forEach(eventName => {
      this.socket?.on(eventName, async (data: any) => {
        console.log(`Received ${eventName} event:`, data);
        try {
          let message = data?.message || (data?.messages && data.messages[0]);
          if (message) {
            await this.handleIncomingMessage(message);
          }
        } catch (error) {
          console.error(`Error handling ${eventName}:`, error);
        }
      });
    });

    // Debug all events
    this.socket.onAny((event, ...args) => {
      console.log('Socket.IO event:', event, args);
    });
  }

  private tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      if (this.socket?.connected) return;
      console.log('Attempting to reconnect...');
      this.socket?.connect();
    }, 5000 * Math.pow(1.5, this.reconnectAttempts - 1));
  }

  private async handleIncomingMessage(message: any) {
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
      const conversationId = await getConversationIdForWhatsapp(sender); // Added conversationId
      const response = await processMessage(text, conversationId); // Modified call to processMessage
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
