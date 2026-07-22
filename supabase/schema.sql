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

-- updated_at sempre no relógio do SERVIDOR (na inserção e em toda atualização).
-- É o que a sincronização usa como cursor confiável entre aparelhos.
create extension if not exists moddatetime schema extensions;
drop trigger if exists documentos_updated_at on public.documentos;
create trigger documentos_updated_at
  before update on public.documentos
  for each row execute procedure extensions.moddatetime (updated_at);

-- Storage: bucket privado para os BINÁRIOS de anexos (PDFs, imagens, vídeos,
-- desenhos, capas e arquivos de livros). O código sincroniza em
-- `anexos/{userId}/{tabela}/{id}` (ver src/core/nuvem/sync/anexos.ts), então o
-- nome do bucket PRECISA ser `anexos` — caso contrário a sync de binários
-- falha em silêncio (o gate `bucketPronto` só devolve false e segue).
insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', false)
on conflict (id) do nothing;

-- Cada usuário só acessa arquivos dentro de uma pasta com o próprio id.
-- Uma política por operação (o Storage não aceita cláusula de nome no INSERT).
drop policy if exists "anexos do dono" on storage.objects;

drop policy if exists "anexos: dono lê" on storage.objects;
create policy "anexos: dono lê" on storage.objects
  for select using (bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "anexos: dono envia" on storage.objects;
create policy "anexos: dono envia" on storage.objects
  for insert with check (bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "anexos: dono atualiza" on storage.objects;
create policy "anexos: dono atualiza" on storage.objects
  for update using (bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "anexos: dono apaga" on storage.objects;
create policy "anexos: dono apaga" on storage.objects
  for delete using (bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text);
