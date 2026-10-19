export function formatDate(value: string, language = 'en'): string {
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${value}T12:00:00Z`));
}
