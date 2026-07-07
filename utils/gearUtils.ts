// Mapeamentos e utilitários de artes de pesca específicos e gerais

export const GEAR_STRUCTURE = {
  'Rede de emalhe': [
    'Arrasto de praia',
    'Rede de emalhe',
    'Rede de emalhe de deriva',
    'Rede de emalhe fxa',
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

// Retorna o mapeamento inverso de específica para geral
export const getGeneralGearType = (specificGear: string): string => {
  if (!specificGear) return 'Outros';
  const trimmed = specificGear.trim();
  
  for (const [general, specifics] of Object.entries(GEAR_STRUCTURE)) {
    // Busca exata (indiferente a maiúsculas/minúsculas)
    const found = specifics.find(s => s.toLowerCase() === trimmed.toLowerCase());
    if (found) {
      return general;
    }
  }
  
  // Tenta busca parcial inteligente para casos digitados manualmente
  const lower = trimmed.toLowerCase();
  if (lower.includes('emalhe') || lower.includes('tarrafa') || lower.includes('arrasto de praia') || lower.includes('espera')) {
    return 'Rede de emalhe';
  }
  if (lower.includes('covo') || lower.includes('jequi') || lower.includes('manzuá') || lower.includes('armadilha')) {
    return 'Armadilha';
  }
  if (lower.includes('linha') || lower.includes('espinhel') || lower.includes('grozeira')) {
    return 'Linha de mão';
  }
  if (lower.includes('cata') || lower.includes('landuá') || lower.includes('manual')) {
    return 'Cata manual';
  }
  if (lower.includes('submarina') || lower.includes('mergulho') || lower.includes('arpão')) {
    return 'Pesca submarina';
  }
  if (lower.includes('arrasto de fundo')) {
    return 'Arrasto de fundo';
  }

  return 'Outros';
};
