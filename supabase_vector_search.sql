-- Função para busca vetorial por similaridade (pgvector)
create or replace function match_messages(
  conversation_id uuid,
  query_embedding vector(1536),
  match_count int default 5
)
returns table(
  id uuid,
  role text,
  content text,
  created_at timestamp with time zone,
  similarity float
) language plpgsql as $$
begin
  return query
  select m.id, m.role, m.content, m.created_at, (m.embedding <#> query_embedding) as similarity
  from messages m
  where m.conversation_id = match_messages.conversation_id
    and m.embedding is not null
  order by m.embedding <#> query_embedding
  limit match_count;
end;
$$;
