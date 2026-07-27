export function formatDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayInputDate() {
  return formatDateInput(new Date());
}

export function addDaysToInput(dateInput: string, delta: number) {
  const [y, m, d] = dateInput.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + delta);
  return formatDateInput(date);
}

export function readableDate(dateInput: string, locale: string = 'fr-FR') {
  const [y, m, d] = dateInput.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
