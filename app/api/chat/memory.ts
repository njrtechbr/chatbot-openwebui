import { supabase } from './supabaseClient';
import { getEmbedding } from './embedding';

export type Message = { role: string; content: string; created_at?: string };
export type Conversation = { id: string; messages: Message[] };

async function ensureConversation(id: string) {
  // Tenta inserir, ignora erro se já existir
  const { error } = await supabase.from('conversations').insert({ id }).select();
  if (error && !String(error.message).includes('duplicate')) {
    console.error('[Supabase][ensureConversation] error:', error);
  }
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  console.log('[Supabase] getConversation', id);
  const { data: messages, error } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[Supabase][getConversation] error:', error);
    return undefined;
  }
  console.log('[Supabase][getConversation] messages:', messages);
  return { id, messages: messages || [] };
}

export async function saveMessage(id: string, message: Message) {
  await ensureConversation(id);
  const embedding = await getEmbedding(message.content);
  console.log('[Supabase] saveMessage', { id, message, embedding });
  const { data, error } = await supabase.from('messages').insert({
    conversation_id: id,
    role: message.role,
    content: message.content,
    created_at: message.created_at || new Date().toISOString(),
    embedding,
  });
  if (error) {
    console.error('[Supabase][saveMessage] error:', error);
  } else {
    console.log('[Supabase][saveMessage] data:', data);
  }
}

export async function setMessages(id: string, messages: Message[]) {
  await ensureConversation(id);
  console.log('[Supabase] setMessages', { id, messages });
  const { error: delError } = await supabase.from('messages').delete().eq('conversation_id', id);
  if (delError) {
    console.error('[Supabase][setMessages] delete error:', delError);
  }
  for (const m of messages) {
    const embedding = await getEmbedding(m.content);
    const { data, error } = await supabase.from('messages').insert({
      conversation_id: id,
      role: m.role,
      content: m.content,
      created_at: m.created_at || new Date().toISOString(),
      embedding,
    });
    if (error) {
      console.error('[Supabase][setMessages] insert error:', error);
    } else {
      console.log('[Supabase][setMessages] insert data:', data);
    }
  }
}

export async function searchRelevantMessages(id: string, query: string, topK = 5): Promise<Message[]> {
  const embedding = await getEmbedding(query);
  console.log('[Supabase] searchRelevantMessages', { id, query, embedding });
  if (!embedding) return [];
  // Busca por similaridade usando pgvector
  const { data, error } = await supabase.rpc('match_messages', {
    conversation_id: id,
    query_embedding: embedding,
    match_count: topK
  });
  if (error) {
    console.error('[Supabase][searchRelevantMessages] error:', error);
    return [];
  }
  console.log('[Supabase][searchRelevantMessages] data:', data);
  return (data || []).map((m: any) => ({ role: m.role, content: m.content, created_at: m.created_at }));
}
