-- ============================================
-- CORREÇÃO DE SEGURANÇA: ATIVAR RLS COM POLÍTICAS
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Ativar RLS em todas as tabelas
alter table fishermen enable row level security;
alter table landing_forms enable row level security;
alter table species enable row level security;
alter table user_profiles enable row level security;

-- 2. Remover permissões excessivas do anon (público)
revoke all on table fishermen from anon;
revoke all on table landing_forms from anon;
revoke all on table species from anon;
revoke all on table user_profiles from anon;

-- 3. Políticas para fishermen: usuários autenticados podem ler tudo
create policy "Usuários autenticados podem ler fishermen"
  on fishermen for select
  to authenticated
  using (true);

create policy "Usuários autenticados podem inserir fishermen"
  on fishermen for insert
  to authenticated
  with check (true);

create policy "Usuários autenticados podem atualizar fishermen"
  on fishermen for update
  to authenticated
  using (true)
  with check (true);

create policy "Usuários autenticados podem deletar fishermen"
  on fishermen for delete
  to authenticated
  using (true);

-- 4. Políticas para landing_forms
create policy "Usuários autenticados podem ler landing_forms"
  on landing_forms for select
  to authenticated
  using (true);

create policy "Usuários autenticados podem inserir landing_forms"
  on landing_forms for insert
  to authenticated
  with check (true);

create policy "Usuários autenticados podem atualizar landing_forms"
  on landing_forms for update
  to authenticated
  using (true)
  with check (true);

create policy "Usuários autenticados podem deletar landing_forms"
  on landing_forms for delete
  to authenticated
  using (true);

-- 5. Políticas para species
create policy "Usuários autenticados podem ler species"
  on species for select
  to authenticated
  using (true);

create policy "Usuários autenticados podem inserir species"
  on species for insert
  to authenticated
  with check (true);

create policy "Usuários autenticados podem atualizar species"
  on species for update
  to authenticated
  using (true)
  with check (true);

create policy "Usuários autenticados podem deletar species"
  on species for delete
  to authenticated
  using (true);

-- 6. Políticas para user_profiles (cada um vê apenas seu próprio perfil)
create policy "Usuários veem apenas seu próprio perfil"
  on user_profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Usuários podem inserir seu próprio perfil"
  on user_profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Usuários podem atualizar seu próprio perfil"
  on user_profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 7. (Opcional) Permitir que novos usuários se cadastrem via signup
-- Se quiser permitir que usuários se cadastrem pelo app, descomente:
-- grant usage on schema public to anon;
