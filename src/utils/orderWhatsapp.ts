const cairoHour = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Cairo',
  hour: '2-digit',
  hourCycle: 'h23',
});

export function getOrderWhatsappNumber(now = new Date()): string | null {
  const hour = Number(cairoHour.format(now));
  if (hour >= 11 && hour < 20) return '201098004024';
  if (hour >= 20 || hour < 4) return '201092929026';
  return null;
}
