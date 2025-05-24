-- Conversas (cada conversa pode ter várias mensagens)
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now()
);

-- Mensagens (cada mensagem pertence a uma conversa)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null, -- 'user' ou 'assistant'
  content text not null,
  created_at timestamp with time zone default now(),
  embedding vector(1536) -- opcional, para busca semântica
);

-- Índice para busca rápida por conversa
create index if not exists idx_messages_conversation_id on messages(conversation_id);
