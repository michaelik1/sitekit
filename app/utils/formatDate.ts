const formatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric"
});

export function formatDate(value: string): string {
  return formatter.format(new Date(`${value}T12:00:00Z`));
}
