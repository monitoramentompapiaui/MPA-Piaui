-- ============================================
-- SEGURANÇA FINAL: RLS + BLOQUEIO DE ANON
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. Ativar RLS em todas as tabelas
alter table if exists fishermen enable row level security;
alter table if exists landing_forms enable row level security;
alter table if exists species enable row level security;
alter table if exists user_profiles enable row level security;

-- 2. Remover TODAS as permissões do anon (público) — ninguém sem login acessa nada
revoke all on table fishermen from anon, public;
revoke all on table landing_forms from anon, public;
revoke all on table species from anon, public;
revoke all on table user_profiles from anon, public;

-- 3. Remover políticas antigas para recriar do zero
drop policy if exists "Usuários autenticados podem ler fishermen" on fishermen;
drop policy if exists "Usuários autenticados podem inserir fishermen" on fishermen;
drop policy if exists "Usuários autenticados podem atualizar fishermen" on fishermen;
drop policy if exists "Usuários autenticados podem deletar fishermen" on fishermen;
drop policy if exists "authenticated_all_fishermen" on fishermen;

drop policy if exists "Usuários autenticados podem ler landing_forms" on landing_forms;
drop policy if exists "Usuários autenticados podem inserir landing_forms" on landing_forms;
drop policy if exists "Usuários autenticados podem atualizar landing_forms" on landing_forms;
drop policy if exists "Usuários autenticados podem deletar landing_forms" on landing_forms;
drop policy if exists "authenticated_all_landing_forms" on landing_forms;

drop policy if exists "Usuários autenticados podem ler species" on species;
drop policy if exists "Usuários autenticados podem inserir species" on species;
drop policy if exists "Usuários autenticados podem atualizar species" on species;
drop policy if exists "Usuários autenticados podem deletar species" on species;
drop policy if exists "authenticated_all_species" on species;

drop policy if exists "Usuários veem apenas seu próprio perfil" on user_profiles;
drop policy if exists "Usuários podem inserir seu próprio perfil" on user_profiles;
drop policy if exists "Usuários podem atualizar seu próprio perfil" on user_profiles;
drop policy if exists "own_profile_select" on user_profiles;
drop policy if exists "own_profile_insert" on user_profiles;
drop policy if exists "own_profile_update" on user_profiles;

-- 4. Políticas para dados COMPARTILHADOS (todos os autenticados podem tudo)
create policy "authenticated_all_fishermen"
  on fishermen for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_all_landing_forms"
  on landing_forms for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_all_species"
  on species for all
  to authenticated
  using (true)
  with check (true);

-- 5. Políticas para user_profiles (cada um vê APENAS o próprio perfil)
create policy "own_profile_select"
  on user_profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "own_profile_insert"
  on user_profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "own_profile_update"
  on user_profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 6. Garantir que o schema public não está acessível ao anon
revoke all on schema public from anon, public;
grant usage on schema public to authenticated;
