import { createClient } from '@supabase/supabase-js';

import fs from 'fs';
import path from 'path';

// Retrieve credentials safely from env or parse .env file
let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
          if (key === 'VITE_SUPABASE_URL') supabaseUrl = val;
          if (key === 'VITE_SUPABASE_ANON_KEY') supabaseKey = val;
        }
      }
    }
  } catch (e) {
    console.warn("Aviso: Não foi possível ler o arquivo .env automaticamente:", e);
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testKeyset() {
  console.log("Iniciando teste de paginação por keyset (UUID id)...");

  try {
    let lastId = null;
    let totalFetched = 0;
    const limit = 1000;
    const numBatches = 5;

    for (let batch = 1; batch <= numBatches; batch++) {
      const start = Date.now();
      let query = supabase
        .from('landing_forms')
        .select('id, id_number')
        .order('id', { ascending: true })
        .limit(limit);

      if (lastId) {
        query = query.gt('id', lastId);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Erro no lote ${batch}:`, error);
        break;
      }

      if (!data || data.length === 0) {
        console.log(`Sem mais dados no lote ${batch}.`);
        break;
      }

      totalFetched += data.length;
      lastId = data[data.length - 1].id;
      const duration = Date.now() - start;

      console.log(`Lote ${batch} carregado com sucesso! Itens: ${data.length}, Tempo: ${duration}ms, Último ID: ${lastId}`);
    }

    console.log(`Teste de keyset finalizado! Total de itens buscados nas primeiras 5 páginas: ${totalFetched}`);
  } catch (e) {
    console.error("Exceção geral no teste de keyset:", e);
  }
}

testKeyset();
