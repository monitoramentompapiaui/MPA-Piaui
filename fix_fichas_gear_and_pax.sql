-- Correção pontual de dados antigos no Supabase.
-- Executar uma vez no SQL Editor do projeto.
-- Corrige o nome da arte "Rede de emalhe fxa" e remove o sufixo "pax"
-- do número de pescadores gravado nas fichas e no cadastro de pescadores.

BEGIN;

-- 1. Arte de pesca nas fichas já digitadas (JSONB fishing)
UPDATE landing_forms
SET fishing = jsonb_set(
  fishing,
  '{gearType}',
  '"Rede de emalhe fixa"',
  true
)
WHERE lower(btrim(fishing ->> 'gearType')) = 'rede de emalhe fxa';

UPDATE landing_forms
SET fishing = jsonb_set(
  fishing,
  '{gearTypeGeneral}',
  '"Rede de emalhe fixa"',
  true
)
WHERE lower(btrim(fishing ->> 'gearTypeGeneral')) = 'rede de emalhe fxa';

-- 2. Arte de pesca no cadastro de pescadores (coluna e JSONB gear_details)
UPDATE fishermen
SET gear_type = 'Rede de emalhe fixa'
WHERE lower(btrim(gear_type)) = 'rede de emalhe fxa';

UPDATE fishermen
SET gear_details = jsonb_set(
  gear_details,
  '{gearTypeGeneral}',
  '"Rede de emalhe fixa"',
  true
)
WHERE lower(btrim(gear_details ->> 'gearTypeGeneral')) = 'rede de emalhe fxa';

-- 3. Nº de pescadores nas fichas: "2pax" / "2 pax" -> 2
UPDATE landing_forms
SET fishing = jsonb_set(
  fishing,
  '{fisherCount}',
  to_jsonb(
    regexp_replace(fishing ->> 'fisherCount', '[^0-9.]', '', 'g')::numeric
  ),
  true
)
WHERE fishing ->> 'fisherCount' ~ '[0-9]'
  AND fishing ->> 'fisherCount' ~* 'pax';

-- 4. Nº de pescadores no cadastro de pescadores (chave interna _fisherCount)
UPDATE fishermen
SET gear_details = jsonb_set(
  gear_details,
  '{_fisherCount}',
  to_jsonb(regexp_replace(gear_details ->> '_fisherCount', '[^0-9.]', '', 'g')::numeric),
  true
)
WHERE gear_details ->> '_fisherCount' ~ '[0-9]'
  AND gear_details ->> '_fisherCount' ~* 'pax';

COMMIT;

-- Observação: "Rede de emalhe fina" é uma nova opção do catálogo (utils/gearUtils.ts)
-- e não exige alteração de esquema no banco de dados.
