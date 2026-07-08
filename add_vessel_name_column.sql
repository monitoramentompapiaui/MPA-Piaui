-- Adicionar coluna vessel_name à tabela fishermen (para bancos existentes)
alter table fishermen add column if not exists vessel_name text;
