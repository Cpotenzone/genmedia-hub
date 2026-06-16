const TZ = 'America/Los_Angeles';

export function formatSessionDate(ts) {
  if (!ts) return '';
  const d = ts.toDate?.() || (ts.seconds ? new Date(ts.seconds * 1000) : (ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts)));
  const now = new Date();
  const todayStart = new Date(now.toLocaleDateString('en-US', { timeZone: TZ }));
  const yesterdayStart = new Date(todayStart - 86400000);

  const localDate = new Date(d.toLocaleString('en-US', { timeZone: TZ }));
  const timeStr = d.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });

  if (localDate >= todayStart) return `Today ${timeStr}`;
  if (localDate >= yesterdayStart) return `Yesterday ${timeStr}`;

  const monthDay = d.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' });
  return `${monthDay}, ${timeStr}`;
}

export function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate?.() || (ts.seconds ? new Date(ts.seconds * 1000) : (ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts)));
  return d.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });
}

export function getDateGroup(ts) {
  if (!ts) return 'Older';
  const d = ts.toDate?.() || (ts.seconds ? new Date(ts.seconds * 1000) : (ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts)));
  const now = new Date();
  const nowLocal = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  const todayStart = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate());
  const yesterdayStart = new Date(todayStart - 86400000);
  const weekAgoStart = new Date(todayStart - 7 * 86400000);

  const localDate = new Date(d.toLocaleString('en-US', { timeZone: TZ }));
  if (localDate >= todayStart) return 'Today';
  if (localDate >= yesterdayStart) return 'Yesterday';
  if (localDate >= weekAgoStart) return 'This Week';
  return 'Older';
}
