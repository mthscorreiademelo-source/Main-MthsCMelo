-- Lume — esquema de sincronização na nuvem (Supabase / Postgres)
-- Rode isto no SQL Editor do seu projeto Supabase (uma vez).
--
-- Estratégia: UMA tabela genérica de documentos por usuário. Cada "coleção"
-- (tasks, registros, paginas, …) é apenas um valor de texto — módulo novo não
-- exige migração de schema. Sincronização por updated_at + exclusão lógica.

create table if not exists public.documentos (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  colecao    text        not null,
  id         text        not null,
  doc        jsonb       not null,
  updated_at timestamptz not null default now(),
  deleted    boolean     not null default false,
  primary key (user_id, colecao, id)
);

-- Busca incremental por "o que mudou desde a última sincronização".
create index if not exists documentos_sync_idx
  on public.documentos (user_id, updated_at);

-- Segurança por linha: cada pessoa só enxerga e altera os próprios dados.
alter table public.documentos enable row level security;

drop policy if exists "donos leem" on public.documentos;
create policy "donos leem" on public.documentos
  for select using (auth.uid() = user_id);

drop policy if exists "donos inserem" on public.documentos;
create policy "donos inserem" on public.documentos
  for insert with check (auth.uid() = user_id);

drop policy if exists "donos atualizam" on public.documentos;
create policy "donos atualizam" on public.documentos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "donos apagam" on public.documentos;
create policy "donos apagam" on public.documentos
  for delete using (auth.uid() = user_id);

-- Storage: bucket privado para os arquivos (PDFs, imagens, vídeos, desenhos).
-- Usado numa etapa futura; criar já não custa nada.
insert into storage.buckets (id, name, public)
values ('arquivos', 'arquivos', false)
on conflict (id) do nothing;

-- Cada usuário só acessa arquivos dentro de uma pasta com o próprio id.
drop policy if exists "arquivos do dono" on storage.objects;
create policy "arquivos do dono" on storage.objects
  for all
  using (bucket_id = 'arquivos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'arquivos' and (storage.foldername(name))[1] = auth.uid()::text);
