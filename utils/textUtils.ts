/**
 * Utilitários para padronização de textos.
 * Remove espaços extras consecutivas e padroniza letras de forma inteligente (Capitalize).
 */

/**
 * Padroniza textos gerais (ex: nome do pescador, barco, localidade, nome popular do peixe).
 * Remove espaços duplicados e capitaliza a primeira letra de cada palavra.
 * Exemplo: "tainha  azul" -> "Tainha Azul"
 * Exemplo: "joão SILVA" -> "João Silva"
 * Exemplo: "peixe-espada" -> "Peixe-Espada"
 */
export const standardizeText = (val: any): string => {
  if (val === undefined || val === null) return '';
  const clean = String(val).replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  return clean
    .split(' ')
    .map(word => {
      if (!word) return '';
      // Se tiver hífen, vamos capitalizar ambas as partes
      if (word.includes('-')) {
        return word
          .split('-')
          .map(part => {
            if (!part) return '';
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join('-');
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Padroniza nomes científicos biológicos (ex: "Mugil liza").
 * A convenção da nomenclatura binomial dita que a primeira palavra (Gênero)
 * inicia por letra maiúscula e a segunda (epíteto específico) é toda em minúscula.
 * Exemplo: "mugil LIZA" -> "Mugil liza"
 */
export const standardizeScientificName = (val: any): string => {
  if (val === undefined || val === null) return '';
  const clean = String(val).replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  
  // Transforma tudo para minúsculas primeiro, depois capitaliza somente a primeira letra de toda a string
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
};
