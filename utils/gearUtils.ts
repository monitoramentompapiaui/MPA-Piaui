// Mapeamentos e utilitários de artes de pesca específicas e gerais

import { GearDetails } from '../types';

export const GEAR_STRUCTURE = {
  'Rede de emalhe': [
    'Arrasto de praia',
    'Rede de emalhe',
    'Rede de emalhe de deriva',
    'Rede de emalhe fixa',
    'Rede de emalhe fina',
    'Rede de emalhe grossa',
    'Rede de espera fixa de fundo',
    'Tarrafa'
  ],
  'Armadilha': [
    'Covo',
    'Jequi',
    'Manzuá'
  ],
  'Linha de mão': [
    'Espinhel',
    'Grozeira',
    'Linha de mão',
    'Linha de mão - Atuns',
    'Linha de mão - Recifais'
  ],
  'Cata manual': [
    'Cata manual',
    'Landuá'
  ],
  'Pesca submarina': [
    'Pesca submarina'
  ],
  'Arrasto de fundo': [
    'Arrasto de fundo'
  ]
};

export const ALL_SPECIFIC_GEARS = Object.values(GEAR_STRUCTURE).flat();
export const ALL_GENERAL_GEARS = Object.keys(GEAR_STRUCTURE);

/** Chave de comparação sem acentos, caixa ou espaços repetidos. */
const gearKey = (value: string): string =>
  value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

// Nomes antigos/gravados com erro de digitação que devem ser exibidos corrigidos.
const LEGACY_GEAR_NAMES: Record<string, string> = {
  'rede de emalhe fxa': 'Rede de emalhe fixa',
  'rede de emalhe fina': 'Rede de emalhe fina'
};

/**
 * Converte um nome de arte de pesca gravado anteriormente para o nome canônico
 * usado nos cadastros atuais (ex.: "Rede de emalhe fxa" -> "Rede de emalhe fixa").
 * Nomes digitados livremente são preservados.
 */
export const canonicalizeGearName = (value?: string | null): string => {
  const raw = (value || '').trim();
  if (!raw) return '';

  const key = gearKey(raw);
  const legacy = LEGACY_GEAR_NAMES[key];
  if (legacy) return legacy;

  const specific = ALL_SPECIFIC_GEARS.find(g => gearKey(g) === key);
  if (specific) return specific;

  const general = ALL_GENERAL_GEARS.find(g => gearKey(g) === key);
  return general || raw;
};

export interface GearDetailField {
  key: keyof GearDetails;
  label: string;
}

/**
 * Campos de especificações válidos para cada arte de pesca.
 * Usado pelos formulários de ficha e de pescador para evitar dados incompletos.
 */
export const getGearDetailFields = (general: string, specific = ''): GearDetailField[] => {
  const g = gearKey(general || '');
  const s = gearKey(specific || '');

  if (s.includes('tarrafa')) {
    return [
      { key: 'length', label: 'Comprimento (m)' },
      { key: 'meshSize', label: 'Tamanho da Malha (cm)' }
    ];
  }
  if (s.includes('jequi')) {
    return [
      { key: 'trapCount', label: 'Número de Armadilhas/Jequis' },
      { key: 'jequiBleedingMesh', label: 'Malha de Sangra (cm)' }
    ];
  }
  if (s.includes('arrasto de fundo')) {
    return [
      { key: 'netLength', label: 'Comprimento da Rede (m)' },
      { key: 'mouthHeight', label: 'Altura da Boca da Rede (m)' },
      { key: 'trawlMeshSize', label: 'Tamanho da Malha (mm)' }
    ];
  }
  if (s.includes('cata manual') || s.includes('landua')) {
    return [
      { key: 'cataManual', label: 'Cata manual (quantidade/observação)' }
    ];
  }
  if (g === 'rede de emalhe') {
    return [
      { key: 'meshSize', label: 'Tamanho da Malha (mm)' },
      { key: 'length', label: 'Comprimento da Rede (m)' },
      { key: 'height', label: 'Altura da Rede (m)' }
    ];
  }
  if (g === 'linha de mao') {
    return [
      { key: 'hookCount', label: 'Número de Anzóis' },
      { key: 'length', label: 'Comprimento do Cabo (m)' },
      { key: 'hookSize', label: 'Tamanho do Anzol' }
    ];
  }
  if (g === 'armadilha') {
    return [
      { key: 'trapCount', label: 'Número de Armadilhas/Covo' },
      { key: 'covos', label: 'Nº de Covos' },
      { key: 'manzuas', label: 'Nº de Manzuás' }
    ];
  }
  if (g === 'arrasto de fundo') {
    return [
      { key: 'netLength', label: 'Comprimento da Rede (m)' },
      { key: 'mouthHeight', label: 'Altura da Boca da Rede (m)' },
      { key: 'trawlMeshSize', label: 'Tamanho da Malha (mm)' }
    ];
  }
  if (g === 'cata manual') {
    return [
      { key: 'cataManual', label: 'Cata manual (quantidade/observação)' }
    ];
  }

  return [];
};

/**
 * Algumas planilhas antigas gravaram as dimensões em colunas alternativas.
 * Copia esses valores para os campos canônicos sem apagar o valor original.
 */
export const normalizeGearDetails = (details?: GearDetails | null): GearDetails => {
  const source: Record<string, any> = { ...(details || {}) };
  const result: Record<string, any> = { ...source };

  const fallback = (canonical: keyof GearDetails, ...aliases: string[]) => {
    if (result[canonical] !== undefined && result[canonical] !== null && String(result[canonical]).trim() !== '') return;
    for (const alias of aliases) {
      const value = source[alias];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        result[canonical] = value;
        return;
      }
    }
  };

  fallback('length', 'redeLength', 'linhaLength');
  fallback('height', 'redeHeight');
  fallback('meshSize', 'redeMesh');

  return result as GearDetails;
};

/** Remove chaves internas usadas para transportar dados do pescador no JSONB. */
export const publicGearDetails = (details?: GearDetails | null): GearDetails => {
  const result: Record<string, any> = {};
  Object.entries(normalizeGearDetails(details) || {}).forEach(([key, value]) => {
    if (!key.startsWith('_') && value !== undefined && value !== null && String(value).trim() !== '') {
      result[key] = value;
    }
  });
  return result as GearDetails;
};

// Retorna o mapeamento inverso de específica para geral
export const getGeneralGearType = (specificGear: string): string => {
  if (!specificGear) return 'Outros';
  const trimmed = canonicalizeGearName(specificGear).trim();
  
  for (const [general, specifics] of Object.entries(GEAR_STRUCTURE)) {
    // Busca exata (indiferente a maiúsculas/minúsculas)
    const found = specifics.find(s => gearKey(s) === gearKey(trimmed));
    if (found) {
      return general;
    }
  }
  
  // Tenta busca parcial inteligente para casos digitados manualmente
  const lower = gearKey(trimmed);
  if (lower.includes('emalhe') || lower.includes('tarrafa') || lower.includes('arrasto de praia') || lower.includes('espera')) {
    return 'Rede de emalhe';
  }
  if (lower.includes('covo') || lower.includes('jequi') || lower.includes('manzua') || lower.includes('armadilha')) {
    return 'Armadilha';
  }
  if (lower.includes('linha') || lower.includes('espinhel') || lower.includes('grozeira')) {
    return 'Linha de mão';
  }
  if (lower.includes('cata') || lower.includes('landua') || lower.includes('manual')) {
    return 'Cata manual';
  }
  if (lower.includes('submarina') || lower.includes('mergulho') || lower.includes('arpao')) {
    return 'Pesca submarina';
  }
  if (lower.includes('arrasto de fundo')) {
    return 'Arrasto de fundo';
  }

  return 'Outros';
};
