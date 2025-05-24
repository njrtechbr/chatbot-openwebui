import { NextRequest, NextResponse } from 'next/server';
import { getConversation, saveMessage, searchRelevantMessages, Message } from './memory';
import { v4 as uuidv4 } from 'uuid';

// Token limit for the model context
const MAX_TOKENS = 3500;

function estimateTokens(messages: Message[]): number {
  return messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0);
}

function summarizeMessages(messages: Message[]): Message[] {
  const summary = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
  return [{ role: 'system', content: `Resumo da conversa anterior: ${summary}` }];
}

async function getOpenWebUIResponse(messages: Message[]): Promise<string> {
  const OPEN_WEBUI_API_URL = process.env.OPEN_WEBUI_API_URL;
  const MODEL = process.env.OPEN_WEBUI_MODEL;
  const JWT = process.env.OPEN_WEBUI_JWT;

  if (!OPEN_WEBUI_API_URL) {
    throw new Error('OPEN_WEBUI_API_URL not configured');
  }

  const response = await fetch(OPEN_WEBUI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(JWT ? { 'Authorization': `Bearer ${JWT}` } : {})
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenWebUI API error: ${text}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Main message processing function for both web and WhatsApp
export async function processMessage(message: string, conversationId?: string): Promise<string> {
  try {
    if (!conversationId) {
      conversationId = uuidv4();
    }

    // Get conversation history
    const conv = await getConversation(conversationId);
    let messages: Message[] = conv?.messages || [];

    // Get relevant messages through vector search
    const relevant = await searchRelevantMessages(conversationId, message, 5);
    const contextMessages = [...new Map([...messages, ...relevant].map(m => [m.content, m])).values()];

    // Add new user message
    contextMessages.push({ role: 'user', content: message });

    // Summarize if exceeding token limit
    while (estimateTokens(contextMessages) > MAX_TOKENS && contextMessages.length > 2) {
      const old = contextMessages.slice(0, -2);
      const recent = contextMessages.slice(-2);
      contextMessages.splice(0, contextMessages.length, ...summarizeMessages(old), ...recent);
    }

    // Save user message
    await saveMessage(conversationId, { role: 'user', content: message });

    // Get AI response
    const response = await getOpenWebUIResponse(contextMessages);

    // Save AI response
    await saveMessage(conversationId, { role: 'assistant', content: response });

    return response;
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
}

// HTTP endpoint for web interface
export async function POST(req: NextRequest) {
  try {
    const { message, conversationId: reqConversationId } = await req.json();
    const response = await processMessage(message, reqConversationId);
    return NextResponse.json({ response, conversationId: reqConversationId });
  } catch (error) {
    console.error('Error in HTTP handler:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
