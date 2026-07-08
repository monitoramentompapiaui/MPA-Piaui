import { createClient } from '@supabase/supabase-js';
import { LandingForm, Fisherman, Species } from '../types';
import { getGeneralGearType } from './gearUtils';

// Retrieve credentials safely from Vite env
const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate and sanitize the URL to prevent "Invalid path specified in request URL"
let supabaseUrl = '';
let configurationError: string | null = null;

try {
  let cleanUrl = rawUrl.trim();
  if (cleanUrl) {
    if (
      cleanUrl.startsWith('postgres://') || 
      cleanUrl.startsWith('postgresql://') || 
      cleanUrl.includes('pooler.supabase.com') || 
      cleanUrl.includes(':5432')
    ) {
      configurationError = 'Você usou a "Connection String" do Postgres (porta 5432/pooler) em vez da "Project URL" da API do Supabase. Cole a URL correta no formato "https://xxxx.supabase.co" encontrada em Project Settings > API no Supabase.';
    } else {
      // Remove trailing /rest/v1 or trailing slashes, which cause direct invalid path requests
      cleanUrl = cleanUrl.replace(/\/rest\/v1\/?$/, '');
      cleanUrl = cleanUrl.replace(/\/$/, '');
      
      if (cleanUrl.length > 0) {
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
          cleanUrl = 'https://' + cleanUrl;
        }
        supabaseUrl = cleanUrl;
      }
    }
  }
} catch (e: any) {
  configurationError = e?.message || 'Erro ao processar a URL do Supabase.';
}

const supabaseKey = rawKey.trim();

// Check if credentials are valid and present
export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey && !configurationError);

export const getSupabaseError = (): string | null => configurationError;

// Initialize Supabase gracefully (lazy/conditional initialization)
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// --- API Helpers for Forms (Fichas) ---

import { dbGet, dbSet, dbRemove, dbGetAllForms, dbSaveFormsBulk, dbClearAllForms } from './db';

const mapRowToForm = (row: any): LandingForm => ({
  id: row.id,
  idNumber: row.id_number,
  createdAt: row.created_at,
  identification: {
    ...row.identification,
    period: row.period || row.identification?.period || undefined
  },
  fishing: row.fishing,
  gear: row.gear,
  production: row.production
});

export const getSupabaseForms = async (
  onChunk?: (forms: LandingForm[], progress: { loaded: number; total: number; isResuming: boolean }) => void
): Promise<LandingForm[]> => {
  if (configurationError) {
    throw new Error(configurationError);
  }
  if (!supabase) return [];
  
  try {
    // 1. Carrega os dados persistidos no cache local do navegador (IndexedDB)
    let cachedForms = await dbGetAllForms();
    
    // Check if the total sync was configured as completed in previous sessions
    const syncCompleted = await dbGet<boolean>('fishery_forms_sync_completed');
    
    // First, verify the total records count on the Supabase server
    const { count, error: countError } = await supabase
      .from('landing_forms')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.warn('Aviso: Erro ao verificar quantidade de registros no servidor:', countError);
      throw countError;
    }
    
    const serverTotal = count || 0;

    // A. SE O SINCRONISMO INICIAL JÁ ESTAVA COMPLETO:
    // Fazemos um carregamento incremental ultrarrápido por data de criação!
    if (syncCompleted && cachedForms.length > 0) {
      try {
        console.log(`[Sync] Sincronização incremental ativa. Registros locais: ${cachedForms.length}. Servidor: ${serverTotal}.`);
        
        // Encontra a data do registro mais recente no cache local de forma totalmente segura
        let lastCreatedAt = '1970-01-01T00:00:00.000Z';
        try {
          const validDates = cachedForms
            .map(f => {
              if (!f.createdAt) return null;
              const t = Date.parse(f.createdAt);
              return isNaN(t) ? null : new Date(t).toISOString();
            })
            .filter((d): d is string => d !== null);

          if (validDates.length > 0) {
            const maxDateStr = validDates.reduce((max, d) => d > max ? d : max, '1970-01-01T00:00:00.000Z');
            const maxDate = new Date(maxDateStr);
            // Subtract 10 minutes to safely handle clock skew or transaction commit delays
            lastCreatedAt = new Date(maxDate.getTime() - 10 * 60 * 1000).toISOString();
          }
        } catch (e) {
          console.warn('[Sync] Erro ao calcular lastCreatedAt do cache local:', e);
        }
        
        console.log(`[Sync] Buscando fichas adicionadas após: ${lastCreatedAt}`);
        
        let newRows: any[] = [];
        let hasMoreNew = true;
        let lastNewId: string | null = null;
        const CHUNK_SIZE = 1000;

        while (hasMoreNew) {
          let q = supabase
            .from('landing_forms')
            .select('*')
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .limit(CHUNK_SIZE);

          if (lastNewId) {
            q = q.or(`created_at.gt."${lastCreatedAt}",and(created_at.eq."${lastCreatedAt}",id.gt.${lastNewId})`);
          } else {
            q = q.gt('created_at', lastCreatedAt);
          }

          const { data, error } = await q;
          if (error) {
            console.error('[Sync] Erro na paginação incremental de novas fichas:', error);
            throw error;
          }

          if (data && data.length > 0) {
            newRows = [...newRows, ...data];
            const lastItem = data[data.length - 1];
            const rawDate = lastItem.created_at;
            const parsed = Date.parse(rawDate);
            lastCreatedAt = !isNaN(parsed) ? new Date(parsed).toISOString() : rawDate;
            lastNewId = lastItem.id;
            
            if (data.length < CHUNK_SIZE) {
              hasMoreNew = false;
            }
          } else {
            hasMoreNew = false;
          }
        }

        if (newRows.length > 0) {
          console.log(`[Sync] Sincronismo incremental finalizado! Novas fichas encontradas: ${newRows.length}`);
          const mappedNew = newRows.map(mapRowToForm);
          
          // Salva os novos registros em lote no IndexedDB
          await dbSaveFormsBulk(mappedNew);
          
          // Recupera todos reconciliados
          cachedForms = await dbGetAllForms();
          
          // Ordena por data decrescente ou id para o cache ficar arrumado
          cachedForms.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });

          if (onChunk) {
            onChunk(cachedForms, { loaded: cachedForms.length, total: serverTotal, isResuming: false });
          }
          return cachedForms;
        } else {
          console.log('[Sync] Banco local está perfeitamente em dia!');
          // Se a quantidade no servidor diminuiu (exclusões), ou houver inconsistência
          if (cachedForms.length > serverTotal + 500) {
            console.warn('[Sync] Cache local é maior do que o servidor. Continuando reconstrução limpa...');
          } else {
            // Ordena antes de retornar
            cachedForms.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0).getTime();
              const dateB = new Date(b.createdAt || 0).getTime();
              return dateB - dateA;
            });
            if (onChunk) {
              onChunk(cachedForms, { loaded: cachedForms.length, total: serverTotal, isResuming: false });
            }
            return cachedForms;
          }
        }
      } catch (incError) {
        console.warn('[Sync] Erro durante sincronização incremental. Recorrendo a sincronização de reconstrução total por segurança:', incError);
        // Remove completed flag and clear last sync id to force a fresh and clean keyset sync
        await dbRemove('fishery_forms_sync_completed');
        await dbRemove('fishery_forms_last_sync_id');
      }
    }

    // B. SE É O PRIMEIRO CARREGAMENTO, OU RETOMANDO UM CARREGAMENTO ANTERIOR INTERROMPIDO, OU CORRIGINDO DESENCONTRO DE DADOS:
    // Usamos Paginação por Keyset para baixar sequencialmente sem expirar a conexão SQL!
    let lastSyncId = await dbGet<string>('fishery_forms_last_sync_id') || null;
    
    if (!lastSyncId) {
      console.log(`[Sync] Inconsistência de contagem encontrada ou primeiro carregamento. Local: ${cachedForms.length}, Servidor: ${serverTotal}. Limpando banco local para reconstrução autolimpante completa de alta capacidade (Keyset)...`);
      await dbClearAllForms();
      cachedForms = [];
      await dbRemove('fishery_forms_sync_completed');
    }
    
    let loadedCount = cachedForms.length;
    console.log(`[Sync] Iniciando ou retomando sincronização por Keyset.`);
    console.log(`[Sync] Progresso: ${loadedCount} de ${serverTotal} fichas. Continuando a partir de ID: ${lastSyncId}`);

    const isResuming = !!lastSyncId;
    let hasMore = true;
    const CHUNK_SIZE = 1000;

    while (hasMore) {
      let q = supabase
        .from('landing_forms')
        .select('*')
        .order('id', { ascending: true }) // Uses the B-Tree index on Primary Key (no filesort!)
        .limit(CHUNK_SIZE);

      if (lastSyncId) {
        q = q.gt('id', lastSyncId);
      }

      const { data, error } = await q;

      if (error) {
        console.error('[Sync] Erro ao baixar lote por Keyset do Supabase:', error);
        throw error;
      }

      if (data && data.length > 0) {
        const mappedBatch = data.map(mapRowToForm);
        
        // Salva o lote de 1000 itens de forma ultra veloz e isolada no IndexedDB
        await dbSaveFormsBulk(mappedBatch);
        
        lastSyncId = data[data.length - 1].id;
        loadedCount += data.length;
        
        // Atualiza o progresso no armazenamento chave-valor
        await dbSet('fishery_forms_last_sync_id', lastSyncId);

        if (onChunk) {
          // Passamos uma lista vazia durante o loading incremental para poupar render do React,
          // atualizando só os números percentuais do progresso.
          onChunk([], { loaded: loadedCount, total: serverTotal, isResuming });
        }

        if (data.length < CHUNK_SIZE) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }

      // Deixa a thread principal respirar 15ms permitindo renderização imediata de progresso e animações no React
      await new Promise(resolve => setTimeout(resolve, 15));
    }

    // Conclusão com sucesso do carregamento de toda a base de 100% das fichas
    console.log(`[Sync] Baixando todas as fichas gravadas localmente no IndexedDB...`);
    const finalForms = await dbGetAllForms();
    console.log(`[Sync] Sincronização completa de todas as ${finalForms.length} fichas efetuada!`);
    
    // Organiza por data decrescente (mais recente primeiro)
    finalForms.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    await dbSet('fishery_forms_sync_completed', true);
    await dbRemove('fishery_forms_last_sync_id');

    return finalForms;
  } catch (err) {
    console.warn('Aviso: Falha de conexão com o Supabase ao buscar fichas:', err);
    throw err;
  }
};

export const insertSupabaseForm = async (form: LandingForm): Promise<void> => {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('landing_forms')
      .insert({
        id: form.id,
        id_number: form.idNumber,
        created_at: form.createdAt || new Date().toISOString(),
        identification: form.identification,
        fishing: form.fishing,
        gear: form.gear,
        production: form.production,
        period: form.identification.period || null
      });

    if (error) {
      console.error('Erro ao cadastrar ficha no Supabase:', error);
      throw error;
    }
  } catch (err) {
    console.error('Falha de conexão com o Supabase ao salvar ficha:', err);
    throw err;
  }
};

export const insertMultipleSupabaseForms = async (forms: LandingForm[]): Promise<void> => {
  if (!supabase || forms.length === 0) return;

  try {
    const rows = forms.map(form => ({
      id: form.id,
      id_number: form.idNumber,
      created_at: form.createdAt || new Date().toISOString(),
      identification: form.identification,
      fishing: form.fishing,
      gear: form.gear,
      production: form.production,
      period: form.identification.period || null
    }));

    const CHUNK_SIZE = 120;
    // Execute sequentially (Concurrency = 1) to respect database sessions and avoid lock contention
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('landing_forms')
        .insert(chunk);

      if (error) {
        console.error('Erro ao cadastrar lote de fichas no Supabase:', error);
        throw error;
      }
      
      // Gentle pause to keep UI active and prevent Postgres query timeout
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  } catch (err) {
    console.error('Falha de conexão com o Supabase ao salvar lote de fichas:', err);
    throw err;
  }
};

export const updateSupabaseForm = async (form: LandingForm): Promise<void> => {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('landing_forms')
      .update({
        id_number: form.idNumber,
        identification: form.identification,
        fishing: form.fishing,
        gear: form.gear,
        production: form.production,
        period: form.identification.period || null
      })
      .eq('id', form.id);

    if (error) {
      console.error('Erro ao atualizar ficha no Supabase:', error);
      throw error;
    }
  } catch (err) {
    console.error('Falha de conexão com o Supabase ao atualizar ficha:', err);
    throw err;
  }
};

// Helper para validar formato UUIDv4 antes de enviar consultas ao banco de dados Supabase
const isValidUUID = (id: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const deleteSupabaseForm = async (id: string): Promise<void> => {
  if (!supabase) return;

  try {
    const isUUID = isValidUUID(id);

    // Se o banco de dados utilizar o tipo UUID na coluna ID, consultas .eq('id', id) passadas 
    // com strings que não estão no formato UUID podem estourar erro 400 Bad Request.
    // Lançamos de forma segura capturando o erro se o banco recusar IDs no formato não-UUID.
    if (!isUUID) {
      try {
        const { error } = await supabase
          .from('landing_forms')
          .delete()
          .eq('id', id);

        // Se houver erro que não seja de formato/sintaxe UUID (ex: 22P02 do postgres), levantamos a exceção
        if (error && error.code !== '22P02') {
          console.error('Erro ao excluir ficha não-UUID no Supabase:', error);
          throw error;
        }
      } catch (err) {
        // Ignora silenciosamente: se a tabela for do tipo UUID e o ID fornecido não é UUID,
        // ele nunca existiu no banco e o erro de formato pode ser ignorado sem problemas.
      }
    } else {
      const { error } = await supabase
        .from('landing_forms')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir ficha no Supabase:', error);
        throw error;
      }
    }
  } catch (err) {
    console.error('Falha de conexão com o Supabase ao excluir ficha:', err);
    throw err;
  }
};

export const deleteMultipleSupabaseForms = async (ids: string[]): Promise<void> => {
  if (!supabase || ids.length === 0) return;

  try {
    const validUUIDs = ids.filter(isValidUUID);
    const nonUUIDs = ids.filter(id => !isValidUUID(id));

    // 1. Deletar as fichas com UUIDs válidos em lote de 100 itens por vez
    if (validUUIDs.length > 0) {
      const CHUNK_SIZE = 100;
      for (let i = 0; i < validUUIDs.length; i += CHUNK_SIZE) {
        const chunk = validUUIDs.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
          .from('landing_forms')
          .delete()
          .in('id', chunk);

        if (error) {
          console.error('Erro ao excluir lote de fichas no Supabase:', error);
          throw error;
        }
      }
    }

    // 2. Se houver chaves mais antigas que não são no formato UUID (geradas no modo offline/inseguro),
    // tentamos deletá-las de um por um individualmente ignorando erros de tipo de dados UUID (erro 22P02 do postgres),
    // garantindo compatibilidade total tanto com bancos do tipo UUID quanto do tipo TEXT comum.
    if (nonUUIDs.length > 0) {
      for (const id of nonUUIDs) {
        try {
          const { error } = await supabase
            .from('landing_forms')
            .delete()
            .eq('id', id);
          
          if (error && error.code !== '22P02') {
            console.error('Erro ao tentar excluir registro não-UUID individual no Supabase:', error);
          }
        } catch (e) {
          // Ignora silenciosamente erros de formato de UUID
        }
      }
    }
  } catch (err) {
    console.error('Falha de conexão com o Supabase ao excluir múltiplas fichas:', err);
    throw err;
  }
};


// --- API Helpers for Fishermen (Pescadores) ---

export const getSupabaseFishermen = async (): Promise<Fisherman[]> => {
  if (!supabase) return [];

  try {
    let allData: any[] = [];
    let start = 0;
    const limit = 500; // Optimal non-blocking chunk size
    let hasMore = true;
    const MAX_RECORDS = 2000;

    // Load sequentially ordered by Primary Key index 'id' to prevent filesort and timeout on DB
    while (hasMore && allData.length < MAX_RECORDS) {
      const { data, error } = await supabase
        .from('fishermen')
        .select('*')
        .order('id', { ascending: true }) // Uses Primary Key B-Tree index (instant retrieval with no filesort)
        .range(start, start + limit - 1);

      if (error) {
        console.warn('Aviso: Erro ao buscar pescadores do Supabase:', error);
        throw error;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < limit) {
          hasMore = false;
        } else {
          start += limit;
        }
      } else {
        hasMore = false;
      }
    }

    const mapped = allData.map(row => ({
      id: row.id,
      name: row.name,
      location: row.location,
      gearType: row.gear_type,
      gearTypeGeneral: row.gear_type_general || row.gear_details?.gearTypeGeneral || getGeneralGearType(row.gear_type || ''),
      vesselType: row.vessel_type,
      vesselName: row.vessel_name,
      propulsionType: row.propulsion_type,
      gearDetails: row.gear_details
    }));

    // Extremely fast client-side sorting in memory solves Supabase Filesort statement timeout completely!
    return mapped.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt'));
  } catch (err) {
    console.warn('Aviso: Falha de conexão com o Supabase ao buscar pescadores:', err);
    throw err;
  }
};

export const insertSupabaseFisherman = async (fisher: Fisherman): Promise<void> => {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('fishermen')
      .insert({
        id: fisher.id,
        name: fisher.name,
        location: fisher.location,
        gear_type: fisher.gearType,
        vessel_type: fisher.vesselType,
        vessel_name: fisher.vesselName || null,
        propulsion_type: fisher.propulsionType,
        gear_details: { ...fisher.gearDetails, gearTypeGeneral: fisher.gearTypeGeneral }
      });

    if (error) {
      console.error('Erro ao cadastrar pescador no Supabase:', error);
      throw error;
    }
  } catch (err) {
    console.error('Falha de conexão com o Supabase ao cadastrar pescador:', err);
    throw err;
  }
};

export const insertMultipleSupabaseFishermen = async (fishermen: Fisherman[]): Promise<void> => {
  if (!supabase || fishermen.length === 0) return;

  try {
    const rows = fishermen.map(fisher => ({
      id: fisher.id,
      name: fisher.name,
      location: fisher.location,
      gear_type: fisher.gearType,
      vessel_type: fisher.vesselType,
      vessel_name: fisher.vesselName || null,
      propulsion_type: fisher.propulsionType,
      gear_details: { ...fisher.gearDetails, gearTypeGeneral: fisher.gearTypeGeneral }
    }));

    const CHUNK_SIZE = 120;
    // Execute sequentially to avoid concurrent database locks
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('fishermen')
        .insert(chunk);

      if (error) {
        console.error('Erro ao cadastrar lote de pescadores no Supabase:', error);
        throw error;
      }
      
      // Gentle sleep to relieve database pressure
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  } catch (err) {
    console.error('Falha de conexão com o Supabase ao salvar lote de pescadores:', err);
    throw err;
  }
};

export const updateSupabaseFisherman = async (fisher: Fisherman): Promise<void> => {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('fishermen')
      .update({
        name: fisher.name,
        location: fisher.location,
        gear_type: fisher.gearType,
        vessel_type: fisher.vesselType,
        vessel_name: fisher.vesselName || null,
        propulsion_type: fisher.propulsionType,
        gear_details: { ...fisher.gearDetails, gearTypeGeneral: fisher.gearTypeGeneral }
      })
      .eq('id', fisher.id);

    if (error) {
      console.error('Erro ao atualizar pescador no Supabase:', error);
      throw error;
    }
  } catch (err) {
    console.error('Falha de conexão com o Supabase ao atualizar pescador:', err);
    throw err;
  }
};

export const deleteSupabaseFisherman = async (id: string): Promise<void> => {
  if (!supabase) return;

  try {
    const isUUID = isValidUUID(id);

    if (!isUUID) {
      try {
        const { error } = await supabase
          .from('fishermen')
          .delete()
          .eq('id', id);

        if (error && error.code !== '22P02') {
          console.error('Erro ao excluir pescador não-UUID no Supabase:', error);
          throw error;
        }
      } catch (err) {
        // Ignora: se o banco for UUID, não-UUID não está cadastrado e o erro de formato pode ser ignorado
      }
    } else {
      const { error } = await supabase
        .from('fishermen')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir pescador no Supabase:', error);
        throw error;
      }
    }
  } catch (err) {
    console.error('Falha de conexão com o Supabase ao excluir pescador:', err);
    throw err;
  }
};

// --- API Helpers for Species (Espécies) ---

export const getSupabaseSpecies = async (): Promise<Species[]> => {
  if (!supabase) return [];

  try {
    let allData: any[] = [];
    let start = 0;
    const limit = 500;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('species')
        .select('*')
        .order('id', { ascending: true }) // Uses Primary Key B-Tree index (extreme fast, avoids filesorts on database)
        .range(start, start + limit - 1);

      if (error) {
        console.warn('Aviso: Erro ao buscar espécies do Supabase:', error);
        throw error;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < limit) {
          hasMore = false;
        } else {
          start += limit;
        }
      } else {
        hasMore = false;
      }
    }

    const mapped = allData.map(row => ({
      id: row.id,
      commonName: row.common_name,
      scientificName: row.scientific_name,
      images: row.images || [],
      family: row.family || '',
      order: row.order_name || '',
      group: row.group_name || '',
      conservationUrl: row.conservation_url || '',
      seeMoreUrl: row.see_more_url || ''
    }));

    // Perform sorting in memory on the client side using Portuguese collation
    return mapped.sort((a, b) => (a.commonName || '').localeCompare(b.commonName || '', 'pt'));
  } catch (err) {
    console.warn('Aviso: Falha de conexão com o Supabase ao buscar espécies:', err);
    throw err;
  }
};

export const insertSupabaseSpecies = async (spec: Species): Promise<void> => {
  if (!supabase) return;

  const payload: any = {
    id: spec.id,
    common_name: spec.commonName,
    scientific_name: spec.scientificName,
    family: spec.family || '',
    order_name: spec.order || '',
    group_name: spec.group || '',
    conservation_url: spec.conservationUrl || '',
    see_more_url: spec.seeMoreUrl || ''
  };
  if (spec.images) {
    payload.images = spec.images;
  }

  try {
    const { error } = await supabase
      .from('species')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
        const fallbackPayload: any = {
          id: spec.id,
          common_name: spec.commonName,
          scientific_name: spec.scientificName
        };
        if (spec.images) {
          fallbackPayload.images = spec.images;
        }
        const { error: retryError } = await supabase
          .from('species')
          .upsert(fallbackPayload, { onConflict: 'id' });
        if (retryError) {
          if (retryError.message?.includes('column "images" does not exist') || retryError.code === '42703') {
            const basicPayload = {
              id: spec.id,
              common_name: spec.commonName,
              scientific_name: spec.scientificName
            };
            const { error: basicError } = await supabase
              .from('species')
              .upsert(basicPayload, { onConflict: 'id' });
            if (basicError) throw basicError;
          } else {
            throw retryError;
          }
        }
      } else {
        throw error;
      }
    }
  } catch (err) {
    console.error('Falha de conexão com o Supabase ao cadastrar espécie:', err);
    throw err;
  }
};

export const updateSupabaseSpecies = async (spec: Species): Promise<void> => {
  if (!supabase) return;

  const payload: any = {
    common_name: spec.commonName,
    scientific_name: spec.scientificName,
    family: spec.family || '',
    order_name: spec.order || '',
    group_name: spec.group || '',
    conservation_url: spec.conservationUrl || '',
    see_more_url: spec.seeMoreUrl || ''
  };
  if (spec.images) {
    payload.images = spec.images;
  }

  try {
    const { error } = await supabase
      .from('species')
      .update(payload)
      .eq('id', spec.id);

    if (error) {
      if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
        const fallbackPayload: any = {
          common_name: spec.commonName,
          scientific_name: spec.scientificName
        };
        if (spec.images) {
          fallbackPayload.images = spec.images;
        }
        const { error: retryError } = await supabase
          .from('species')
          .update(fallbackPayload)
          .eq('id', spec.id);
        if (retryError) {
          if (retryError.message?.includes('column "images" does not exist') || retryError.code === '42703') {
            const { error: basicError } = await supabase
              .from('species')
              .update({
                common_name: spec.commonName,
                scientific_name: spec.scientificName
              })
              .eq('id', spec.id);
            if (basicError) throw basicError;
          } else {
            throw retryError;
          }
        }
      } else {
        throw error;
      }
    }
  } catch (err) {
    console.error('Falha de conexão com o Supabase ao atualizar espécie:', err);
    throw err;
  }
};

export const deleteSupabaseSpecies = async (id: string): Promise<void> => {
  if (!supabase) return;

  try {
    const isUUID = isValidUUID(id);

    if (!isUUID) {
      try {
        const { error } = await supabase
          .from('species')
          .delete()
          .eq('id', id);

        if (error && error.code !== '22P02') {
          console.error('Erro ao excluir espécie não-UUID no Supabase:', error);
          throw error;
        }
      } catch (err) {
        // Ignora erro de tipo
      }
    } else {
      const { error } = await supabase
        .from('species')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir espécie no Supabase:', error);
        throw error;
      }
    }
  } catch (err) {
    console.error('Falha de conexão com o Supabase ao excluir espécie:', err);
    throw err;
  }
};

export const insertMultipleSupabaseSpecies = async (speciesList: Species[]): Promise<void> => {
  if (!supabase) return;

  try {
    const rows = speciesList.map(spec => {
      const row: any = {
        id: spec.id,
        common_name: spec.commonName,
        scientific_name: spec.scientificName,
        family: spec.family || '',
        order_name: spec.order || '',
        group_name: spec.group || '',
        conservation_url: spec.conservationUrl || '',
        see_more_url: spec.seeMoreUrl || ''
      };
      if (spec.images) {
        row.images = spec.images;
      }
      return row;
    });

    const CHUNK_SIZE = 120;
    // Execute sequentially (Concurrency = 1) to prevent locks on the database
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('species')
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
          const fallbackRows = chunk.map(row => {
            const r: any = {
              id: row.id,
              common_name: row.common_name,
              scientific_name: row.scientific_name
            };
            if (row.images) {
              r.images = row.images;
            }
            return r;
          });
          const { error: retryError } = await supabase
            .from('species')
            .upsert(fallbackRows, { onConflict: 'id' });
          if (retryError) {
            if (retryError.message?.includes('column "images" does not exist') || retryError.code === '42703') {
              const basicRows = fallbackRows.map(r => ({
                id: r.id,
                common_name: r.common_name,
                scientific_name: r.scientific_name
              }));
              const { error: basicError } = await supabase
                .from('species')
                .upsert(basicRows, { onConflict: 'id' });
              if (basicError) throw basicError;
            } else {
              throw retryError;
            }
          }
        } else {
          console.error('Erro ao cadastrar lote de espécies no Supabase:', error);
          throw error;
        }
      }
      
      // Gentle pause between chunks to keep the database responsive
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  } catch (err) {
    console.error('Falha de conexão com o Supabase ao cadastrar múltiplas espécies:', err);
    throw err;
  }
};

export const uploadSpeciesPhotoToSupabase = async (speciesId: string, fileData: string): Promise<string> => {
  if (!supabase) throw new Error("Supabase não configurado");
  
  try {
    // Create bucket if it doesn't exist
    await supabase.storage.createBucket('species-photos', { public: true });
  } catch (e) {
    // Ignore error if bucket already exists
  }

  const base64Parts = fileData.split(';base64,');
  const mimeType = base64Parts[0].split(':')[1] || 'image/jpeg';
  const b64Data = base64Parts[1];
  
  const byteCharacters = atob(b64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  const ext = mimeType.split('/')[1] || 'jpg';
  const fileName = `${speciesId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

  const { error } = await supabase.storage
    .from('species-photos')
    .upload(fileName, blob, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from('species-photos')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
};

/**
 * Registra ou atualiza os dados de perfil do usuário (ID, e-mail e hora de login)
 * em uma tabela pública no banco de dados chamada `user_profiles`.
 */
export const registerUserProfileInDatabase = async (user: any): Promise<void> => {
  if (!supabase || !user) return;

  try {
    // Only query and upsert columns guaranteed to exist in basic user_profiles table schema:
    // id, email, last_login, updated_at
    const payload: any = {
      id: user.id,
      email: user.email,
      last_login: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('user_profiles')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn(
        `[Auth Log] Não foi possível salvar o login na tabela 'user_profiles' (erro: ${error.message}). ` +
        `Certifique-se de executar a DDL para criar a tabela 'user_profiles' no painel SQL do Supabase.`
      );
    } else {
      console.log(`[Auth Log] Dados de login do usuário salvos com sucesso na tabela public.user_profiles!`);
    }
  } catch (err) {
    console.warn('[Auth Log] Erro inesperado ao salvar login do usuário na base de dados:', err);
  }
};

/**
 * Obtém o perfil completo do usuário a partir do Supabase e cache local.
 */
export const getUserProfile = async (userId: string): Promise<any> => {
  if (!userId) return null;

  // Carrega dados locais de identificação (Nome completo, telefone) específicos deste usuário
  const localProfileKey = `fishery_local_profile_${userId}`;
  const localDataStr = localStorage.getItem(localProfileKey);
  let localProfile: any = {};
  
  if (localDataStr) {
    try {
      localProfile = JSON.parse(localDataStr);
    } catch (e) {
      console.error("[Profile] Erro ao ler perfil local:", e);
    }
  }

  if (!supabase) {
    return {
      id: userId,
      full_name: localProfile.full_name || '',
      phone: localProfile.phone || '',
      office: localProfile.office || '',
      region: localProfile.region || '',
      avatar_url: localProfile.avatar_url || 'captain'
    };
  }

  try {
    // 1. Tentar selecionar todas as colunas inclusive as novas de perfil estendido
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, phone, office, region, avatar_url, last_login, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      // Se der erro de colunas faltantes, faz fallback amigável buscando apenas as colunas básicas
      if (error.message && (error.message.includes("column") || error.message.includes("not found") || error.message.includes("does not exist"))) {
        console.warn(`[Profile] Algumas colunas estendidas não existem no Supabase, buscando colunas básicas...`);
        const { data: basicData, error: basicError } = await supabase
          .from('user_profiles')
          .select('id, email, last_login, updated_at')
          .eq('id', userId)
          .single();

        if (basicError) {
          console.warn(`[Profile] Erro ao buscar perfil básico no Supabase: ${basicError.message}`);
          return {
            id: userId,
            full_name: localProfile.full_name || '',
            phone: localProfile.phone || '',
            office: localProfile.office || '',
            region: localProfile.region || '',
            avatar_url: localProfile.avatar_url || 'captain'
          };
        }

        return {
          ...basicData,
          full_name: localProfile.full_name || '',
          phone: localProfile.phone || '',
          office: localProfile.office || '',
          region: localProfile.region || '',
          avatar_url: localProfile.avatar_url || 'captain'
        };
      }

      console.warn(`[Profile] Erro ao buscar perfil no Supabase: ${error.message}`);
      return {
        id: userId,
        full_name: localProfile.full_name || '',
        phone: localProfile.phone || '',
        office: localProfile.office || '',
        region: localProfile.region || '',
        avatar_url: localProfile.avatar_url || 'captain'
      };
    }

    // Retorna dados do banco mesclados com o cache offline (preferindo dado da nuvem se houver)
    return {
      ...data,
      full_name: data.full_name || localProfile.full_name || '',
      phone: data.phone || localProfile.phone || '',
      office: data.office || localProfile.office || '',
      region: data.region || localProfile.region || '',
      avatar_url: data.avatar_url || localProfile.avatar_url || 'captain'
    };
  } catch (err) {
    console.error('[Profile] Erro inesperado ao buscar perfil:', err);
    return {
      id: userId,
      full_name: localProfile.full_name || '',
      phone: localProfile.phone || '',
      office: localProfile.office || '',
      region: localProfile.region || '',
      avatar_url: localProfile.avatar_url || 'captain'
    };
  }
};

/**
 * Atualiza as informações detalhadas de perfil do usuário.
 */
export const updateUserProfile = async (userId: string, data: {
  full_name?: string;
  phone?: string;
  office?: string;
  region?: string;
  avatar_url?: string;
  email?: string;
}): Promise<{ data: any; error: any }> => {
  if (!userId) {
    return { data: null, error: new Error("ID do usuário indefinido.") };
  }

  // 1. Persistir informações detalhadas localmente de forma segura
  const localProfileKey = `fishery_local_profile_${userId}`;
  const localData = {
    full_name: data.full_name || '',
    phone: data.phone || '',
    office: data.office || '',
    region: data.region || '',
    avatar_url: data.avatar_url || 'captain'
  };
  
  try {
    localStorage.setItem(localProfileKey, JSON.stringify(localData));
    localStorage.setItem('fishery_local_profile', JSON.stringify(localData)); // Compatibilidade
  } catch (err) {
    console.error('[Profile] Erro ao salvar cookies locais de perfil:', err);
  }

  if (!supabase) {
    return { data: localData, error: null };
  }

  try {
    // 2. Tentar salvar no Supabase incluindo colunas completas
    const payload = {
      id: userId,
      email: data.email,
      full_name: data.full_name,
      phone: data.phone,
      office: data.office,
      region: data.region,
      avatar_url: data.avatar_url,
      updated_at: new Date().toISOString()
    };

    const { data: updatedData, error } = await supabase
      .from('user_profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('id, email, full_name, phone, office, region, avatar_url, updated_at')
      .single();

    if (error) {
      // Se der erro por causa de colunas inexistentes no banco antigo (não alteradas na DDL), envia apenas o básico
      if (error.message && (error.message.includes("column") || error.message.includes("field") || error.message.includes("does not exist"))) {
        console.warn("[Profile DB] Colunas estendidas não existem no Supabase. Salvando apenas o perfil básico do usuário...");
        
        const basicPayload = {
          id: userId,
          email: data.email,
          updated_at: new Date().toISOString()
        };

        const { data: basicUpdated, error: basicError } = await supabase
          .from('user_profiles')
          .upsert(basicPayload, { onConflict: 'id' })
          .select('id, email, updated_at')
          .single();

        if (basicError) {
          console.warn("[Profile DB] Erro ao salvar dados básicos no Supabase:", basicError.message);
          return { data: localData, error: basicError };
        }

        // Retorna sucesso para o app, mas com erro especial indicando que precisa da DDL
        return { 
          data: { ...localData, ...basicUpdated }, 
          error: { message: "NEED_SQL_COLUMNS", original_error: error.message } 
        };
      }

      console.warn("[Profile DB] Erro do Supabase ao salvar perfil:", error.message);
      return { data: localData, error };
    }

    return { data: { ...localData, ...updatedData }, error: null };
  } catch (err: any) {
    console.warn('[Profile DB] Erro inesperado do Supabase, fallback bem-sucedido para local:', err);
    return { data: localData, error: null };
  }
};


