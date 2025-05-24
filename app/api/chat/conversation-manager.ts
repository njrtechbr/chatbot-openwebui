import { Message } from './memory';
import { getConversation, saveMessage } from './memory';

interface WhatsAppSender {
  phoneNumber: string;
  conversationId?: string;
}

class ConversationManager {
  private activeConversations: Map<string, string> = new Map();

  // Obtém ou cria um ID de conversa para um número de telefone
  private async getConversationId(phoneNumber: string): Promise<string> {
    let conversationId = this.activeConversations.get(phoneNumber);
    
    if (!conversationId) {
      // Tenta encontrar a última conversa do usuário
      const conversations = await getConversation(undefined, phoneNumber);
      if (conversations && conversations.length > 0) {
        conversationId = conversations[0].conversationId;
      }
    }

    return conversationId || crypto.randomUUID();
  }

  // Processa uma mensagem do WhatsApp
  async processWhatsAppMessage(sender: string, text: string): Promise<string> {
    try {
      // Obtém ou cria um ID de conversa para este remetente
      const conversationId = await this.getConversationId(sender);
      
      // Salva a mensagem do usuário
      await saveMessage({
        conversationId,
        role: 'user',
        content: text,
        metadata: {
          source: 'whatsapp',
          phoneNumber: sender
        }
      });

      // Processa a mensagem usando o OpenWebUI
      const messages = await getConversation(conversationId);
      const response = await this.getOpenWebUIResponse(messages);

      // Salva a resposta do assistente
      await saveMessage({
        conversationId,
        role: 'assistant',
        content: response,
        metadata: {
          source: 'openwebui',
          model: process.env.OPEN_WEBUI_MODEL
        }
      });

      // Atualiza o mapa de conversas ativas
      this.activeConversations.set(sender, conversationId);

      return response;
    } catch (error) {
      console.error('Error processing WhatsApp message:', error);
      return 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.';
    }
  }

  // Obtém resposta do OpenWebUI
  private async getOpenWebUIResponse(messages: Message[]): Promise<string> {
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
        'Authorization': `Bearer ${JWT}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages.map(({ role, content }) => ({ role, content }))
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenWebUI API error: ${text}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Limpa uma conversa ativa
  clearConversation(phoneNumber: string) {
    this.activeConversations.delete(phoneNumber);
  }
}

// Exporta uma instância singleton
export const conversationManager = new ConversationManager();
