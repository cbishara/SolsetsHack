begin;
create or replace function public.match_knowledge(
  p_workspace_id uuid,
  p_embedding extensions.vector(1536),
  p_limit integer default 5
) returns table(id uuid, source text, content text, similarity double precision)
language sql stable security invoker
set search_path = public, extensions
as $$
  select k.id, k.source, k.content, 1 - (k.embedding <=> p_embedding) as similarity
  from public.knowledge_chunks k
  where k.workspace_id = p_workspace_id and k.embedding is not null
  order by k.embedding <=> p_embedding
  limit greatest(1, least(p_limit, 20));
$$;
revoke all on function public.match_knowledge(uuid, extensions.vector, integer) from public, anon, authenticated;
grant execute on function public.match_knowledge(uuid, extensions.vector, integer) to service_role;
commit;
