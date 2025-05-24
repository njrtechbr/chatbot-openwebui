import { NextResponse } from 'next/server';
import { processMessage } from '@/app/api/chat/route';
import { sendWhatsAppMessage } from '../evolutionClient';
import { WhatsAppWebhookBody } from '../types';
import { evolutionSocket } from '../socketio';

export async function POST(request: Request) {
  try {
    // If Socket.IO is connected, let it handle the messages
    if (evolutionSocket.isConnected()) {
      return NextResponse.json({ success: true, message: 'Socket.IO active' });
    }

    console.log('Received webhook request (fallback to HTTP)');
    const body: WhatsAppWebhookBody = await request.json();
    console.log('Webhook body:', body);

    // Handle Evolution API webhook event
    if (body.event === 'messages.upsert') {
      const message = body.data.message;
      console.log('Processing message:', message);
      
      // Ignore if message is from the bot itself
      if (message.fromMe) return NextResponse.json({ success: true });

      // Get the sender's phone number
      const sender = message.from;
      
      // Get the message text
      const text = message.conversation || message.extendedTextMessage?.text;
      console.log('Extracted text:', text);
      
      if (!text) {
        console.log('No text content found in message');
        return NextResponse.json({ success: true });
      }

      // Process the message using the existing chat handler
      console.log('Processing message through chat handler');
      const response = await processMessage(text);
      console.log('Chat response:', response);
      
      // Send the response back via WhatsApp
      await sendWhatsAppMessage(sender, response);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Handle webhook verification
export async function GET(request: Request) {
  return NextResponse.json({ status: 'ok' });
}
