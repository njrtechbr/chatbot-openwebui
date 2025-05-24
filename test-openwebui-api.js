require('dotenv').config();
const axios = require('axios');

const apiUrl = process.env.OPEN_WEBUI_API_URL;
const jwt = process.env.OPEN_WEBUI_JWT;
const model = process.env.OPEN_WEBUI_MODEL;

async function testApi() {
  try {
    const response = await axios.post(
      apiUrl,
      {
        model,
        messages: [
          { role: 'user', content: 'Olá, tudo bem?' }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Resposta da API:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('Erro na resposta da API:', error.response.status, error.response.data);
    } else {
      console.error('Erro ao conectar com a API:', error.message);
    }
  }
}

testApi();
