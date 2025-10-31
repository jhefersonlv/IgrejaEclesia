/**
 * Converte uma string de data YYYY-MM-DD para um objeto Date no timezone local
 * sem conversão UTC, adicionando horário meio-dia para evitar mudança de dia
 */
export function parseLocalDate(dateString: string): Date {
  return new Date(dateString + 'T12:00:00');
}

/**
 * Formata uma data do banco (que pode vir como string UTC) para YYYY-MM-DD local
 * Útil para preencher inputs type="date"
 */
export function formatDateForInput(date: string | Date): string {
  if (typeof date === 'string') {
    // Se vier como string, pega apenas a parte YYYY-MM-DD
    return date.split('T')[0];
  }
  // Se vier como Date, formata
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formata data para exibição amigável
 */
export function formatDateDisplay(date: string | Date, locale: string = 'pt-BR'): string {
  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;
  return dateObj.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}