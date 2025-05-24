import axios from 'axios';

const evolutionApi = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'apikey': process.env.EVOLUTION_API_KEY
  }
});

export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    console.log('Sending WhatsApp message:', { to, message });
    
    if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
      throw new Error('Evolution API configuration missing');
    }

    const response = await evolutionApi.post(`/message/sendText/${process.env.EVOLUTION_INSTANCE_NAME}`, {
      number: to,
      options: {
        delay: 1200,
        presence: "composing"
      },
      textMessage: {
        text: message
      }
    });
    console.log('WhatsApp message sent successfully:', response.data);
    return response.data;
  } catch (err: any) {
    console.error('Error sending WhatsApp message:', err);
    console.error('Error details:', {
      url: process.env.EVOLUTION_API_URL,
      instance: process.env.EVOLUTION_INSTANCE_NAME,
      errorMessage: err.message
    });
    throw err;
  }
}

export async function getInstanceStatus() {
  try {
    const response = await evolutionApi.get(`/instance/connectionState/${process.env.EVOLUTION_INSTANCE_NAME}`);
    return response.data;
  } catch (error) {
    console.error('Error checking instance status:', error);
    throw error;
  }
}
