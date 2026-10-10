/** 格式化为 YYYY-MM-DD（跟随本地时区，避免 toISOString 的 UTC 偏移） */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
