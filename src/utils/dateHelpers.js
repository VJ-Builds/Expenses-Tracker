// Date utility helpers

/**
 * Format a JS Date or ISO string to "DD MMM YYYY"  e.g. "13 Jul 2026"
 */
export const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
};

/**
 * Format a JS Date or ISO string to "DD MMM"  e.g. "13 Jul"
 */
export const formatShortDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

/**
 * Returns today's date as YYYY-MM-DD string (ISO date only, no time)
 */
export const todayISO = () => new Date().toISOString().split('T')[0];

/**
 * Returns first day of current month as YYYY-MM-DD
 */
export const currentMonthStart = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

/**
 * Returns last day of current month as YYYY-MM-DD
 */
export const currentMonthEnd = () => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.toISOString().split('T')[0];
};

/**
 * Returns a YYYY-MM string for current month, e.g. "2026-07"
 */
export const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Returns ISO date strings for the past N days including today
 */
export const lastNDays = (n) => {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
};

/**
 * Format ₹ amount with Indian locale, e.g. ₹1,23,456.78
 */
export const formatINR = (amount) =>
  `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Returns start of current week (Monday) as YYYY-MM-DD
 */
export const currentWeekStart = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
};

/**
 * Returns start of current year as YYYY-MM-DD
 */
export const currentYearStart = () => `${new Date().getFullYear()}-01-01`;
