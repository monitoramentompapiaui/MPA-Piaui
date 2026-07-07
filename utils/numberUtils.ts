/**
 * Utilitários para processamento e conversão de números.
 * Trata formatações regionais brasileiras (pt-BR), onde pontuação de milhar é '.'
 * e do decimal é ','.
 */

/**
 * Converte de forma segura uma string numérica formatada (ou não) em pt-BR ou en-US para number.
 * Exemplos de entrada suportados:
 * - "2.346,35" -> 2346.35 (Milhar tradicional pt-BR)
 * - "2346,35" -> 2346.35  (Decimal simples pt-BR)
 * - "2,346.35" -> 2346.35 (Milhar tradicional en-US)
 * - "2.35" -> 2.35        (Decimal simples padrão)
 * - "12" -> 12            (Inteiro)
 * - "  -2,5 " -> -2.5     (Espaços e número negativo)
 *
 * @param value String ou número a ser processado
 * @returns Retorna o número processado ou 0 caso seja inválido
 */
export const parsePortugueseNumber = (value: any): number => {
  if (value === undefined || value === null) return 0;
  
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  const clean = String(value).trim();
  if (!clean) return 0;

  // Se possui ambos ponto e vírgula (. e ,)
  if (clean.includes('.') && clean.includes(',')) {
    const firstDot = clean.indexOf('.');
    const firstComma = clean.indexOf(',');
    
    if (firstDot < firstComma) {
      // Formato pt-BR: "2.346,35" -> remove todos os pontos, substitui a vírgula por ponto
      return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      // Formato en-US: "2,346.35" -> remove todas as vírgulas
      return parseFloat(clean.replace(/,/g, '')) || 0;
    }
  }

  // Se possui apenas vírgula (,)
  if (clean.includes(',')) {
    // E.g. "2346,35" ou "12,5"
    // Remove qualquer ponto de milhar duplicado oculto (caso houvesse algo como "2.346" sem o decimal escrito no final)
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }

  // Se possui apenas ponto (.)
  if (clean.includes('.')) {
    // Se houver mais de um ponto (ex: "1.234.567"), é com certeza separador de milhar pt-BR sem decimal
    const dotCount = (clean.match(/\./g) || []).length;
    if (dotCount > 1) {
      return parseFloat(clean.replace(/\./g, '')) || 0;
    }

    // Se possui exatamente um ponto e nada de vírgula, e tem tamanho compatível com milhar sem decimal,
    // o usuário pode ter escrito "2.346" querendo dizer 2346 (dois mil trezentos e quarenta e seis).
    // No entanto, para pesos nos diários de pesca (ex: 2.3 kg / 2.35 kg), um único ponto é normalmente decimal.
    // Para resolver isso de forma super inteligente:
    // Se existirem exatamente 3 dígitos após o ponto (ex: "2.346"), consideramos que pode ser um peso com milhar sem decimals,
    // mas comumente em pesca pesos são expressos em decimais (2 kg e 346 gramas). 
    // Para termos certeza de que não causaremos falhas para decimais legítimos de 3 casas (ex: "0.125"), 
    // consideramos "2.346" como decimal (2.346), que é o comportamento de parseFloat padrão.
    // Se o usuário quisesse dois mil e trezentos quilos, ele provavelmente teria escrito "2346" ou "2.346,00".
    return parseFloat(clean) || 0;
  }

  return parseFloat(clean) || 0;
};
