import { evolutionSocket } from './app/api/whatsapp/socketio';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config();

// Lista de variáveis de ambiente necessárias
const requiredEnvVars = {
  // Evolution API
  EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
  EVOLUTION_INSTANCE_NAME: process.env.EVOLUTION_INSTANCE_NAME,
  // OpenWebUI
  OPEN_WEBUI_API_URL: process.env.OPEN_WEBUI_API_URL,
  OPEN_WEBUI_JWT: process.env.OPEN_WEBUI_JWT,
  OPEN_WEBUI_MODEL: process.env.OPEN_WEBUI_MODEL,
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
};

// Verifica variáveis de ambiente
const missing = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

async function startServices() {
  console.log('🚀 Starting services...');

  // 1. Inicializar Supabase
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    // Verificar se as tabelas existem
    const { error: conversationsError } = await supabase.from('conversations').select('count');
    if (conversationsError) {
      // Se as tabelas não existem, criar usando o schema
      const schemaSQL = await fs.readFile('./supabase_schema.sql', 'utf8');
      const { error: createError } = await supabase.rpc('exec_sql', { sql: schemaSQL });
      if (createError) {
        console.warn('⚠️ Could not auto-create tables:', createError.message);
        console.log('ℹ️ Please run the SQL schema manually in your Supabase dashboard');
      } else {
        console.log('📦 Created Supabase tables from schema');
      }
    }
    
    console.log('✅ Supabase connection established');
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
  }

  // 2. Verificar OpenWebUI API
  try {
    const response = await fetch(process.env.OPEN_WEBUI_API_URL!, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${process.env.OPEN_WEBUI_JWT}`
      }
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    console.log('✅ OpenWebUI API is accessible');
  } catch (error) {
    console.error('❌ Failed to connect to OpenWebUI API:', error);
  }

  // 3. Inicializar Evolution API Socket.IO
  console.log('📱 Initializing Evolution API WhatsApp connection...');
  console.log('Instance:', process.env.EVOLUTION_INSTANCE_NAME);
  console.log('API URL:', process.env.EVOLUTION_API_URL);

  // Aguardar conexão do Socket.IO
  await new Promise<void>((resolve) => {
    const checkConnection = () => {
      if (evolutionSocket.isConnected()) {
        console.log('✅ WhatsApp connection established');
        resolve();
      } else {
        console.log('⏳ Waiting for WhatsApp connection...');
        setTimeout(checkConnection, 2000);
      }
    };
    
    setTimeout(checkConnection, 2000);
  });

  // 4. Iniciar o Next.js Frontend
  console.log('🌐 Starting Next.js frontend...');
  const nextProcess = spawn('next', ['dev', '--turbo'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  nextProcess.on('error', (error) => {
    console.error('❌ Failed to start Next.js:', error);
  });

  // Garantir que o processo Next.js seja encerrado quando o processo principal for encerrado
  process.on('SIGINT', () => {
    nextProcess.kill('SIGINT');
    process.exit();
  });

  process.on('SIGTERM', () => {
    nextProcess.kill('SIGTERM');
    process.exit();
  });
}

// Iniciar todos os serviços
startServices().catch(error => {
  console.error('❌ Failed to start services:', error);
});
