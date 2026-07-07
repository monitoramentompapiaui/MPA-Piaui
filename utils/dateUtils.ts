/**
 * Converte qualquer formato de data (incluindo DD/MM/AAAA ou DD/MM/AA ou YYYY-MM-DD ou DD-MM-AAAA)
 * em uma string de data ISO estruturada como "YYYY-MM-DD".
 * Se a data for inválida ou não puder ser analisada, retorna uma string vazia ou a original limpa.
 */
export function parseToISODate(dateStr: string | any): string {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (!trimmed) return '';

  // Caso 1: Já está no formato YYYY-MM-DD correto
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Caso 1b: Formato completo ISO DateTime com "T"
  if (trimmed.includes('T')) {
    const parted = trimmed.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(parted)) {
      return parted;
    }
  }

  // Caso 2: Formatos com separadores DD/MM/AAAA, DD/MM/AA, DD-MM-AAAA, DD.MM.AAAA
  const parts = trimmed.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      // Se a primeira parte tiver 4 dígitos, é YYYY/MM/DD
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      } else {
        // Se o ano for de dois dígitos, assume 2000+
        if (year < 100) {
          year += 2000;
        }
      }

      // Validação rápida de mês e dia antes de formatar
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${year}-${pad(month)}-${pad(day)}`;
      }
    }
  }

  // Caso 3: Fallback padrão do JavaScript Date
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Caso 4: Se não conseguir analisar, retorna limpo
  return trimmed;
}

/**
 * Formata com segurança qualquer string de data para exibição no padrão brasileiro "DD/MM/AAAA"
 */
export function safeFormatDate(dateStr: string | any): string {
  if (!dateStr) return '---';
  const isoDate = parseToISODate(dateStr);
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return String(dateStr).trim() || '---';
  }

  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}
