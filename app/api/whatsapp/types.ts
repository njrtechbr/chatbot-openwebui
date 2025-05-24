export interface WhatsAppWebhookBody {
  event: string;
  data: {
    message: {
      fromMe: boolean;
      from: string;
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
    };
  };
}
