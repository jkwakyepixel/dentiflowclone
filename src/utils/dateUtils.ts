import { 
  parse, 
  parseISO, 
  isToday, 
  isThisWeek, 
  isThisMonth, 
  isThisYear, 
  subMonths, 
  startOfDay, 
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDaysInMonth
} from 'date-fns';

/**
 * Safely parse any date value (string, Date, Firestore Timestamp, millis).
 * Returns null if not valid.
 */
export function safeParseDate(value: any): Date | null {
  if (!value) return null;

  // Firestore Timestamp with .toDate()
  if (typeof value?.toDate === 'function') {
    try {
      const d = value.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  // Already a valid Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Number / timestamp milliseconds
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof value !== 'string') return null;

  const s = value.trim();
  if (!s) return null;

  // 1. Try ISO string (e.g. "2026-09-24" or "2026-09-24T12:00:00Z")
  try {
    const d = parseISO(s);
    if (!isNaN(d.getTime())) return d;
  } catch {}

  // 2. Try 'd MMM yyyy' (e.g. "4 Sep 2026", "24 Sep 2026")
  try {
    const d = parse(s, 'd MMM yyyy', new Date());
    if (!isNaN(d.getTime())) return d;
  } catch {}

  // 3. Try 'dd MMM yyyy' (e.g. "04 Sep 2026")
  try {
    const d = parse(s, 'dd MMM yyyy', new Date());
    if (!isNaN(d.getTime())) return d;
  } catch {}

  // 4. Try 'yyyy-MM-dd'
  try {
    const d = parse(s, 'yyyy-MM-dd', new Date());
    if (!isNaN(d.getTime())) return d;
  } catch {}

  // 5. Native Date fallback
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  } catch {}

  return null;
}

/**
 * Check if a date string/object matches a standard filter string:
 * 'All Time' | 'Today' | 'This Week' | 'This Month' | 'Last Month' | 'Last 3 Months' | 'This Year' | 'Custom Range'
 */
export function isDateInFilter(
  dateValue: any,
  dateFilter: string,
  customStartDate?: string,
  customEndDate?: string
): boolean {
  if (dateFilter === 'All Time') return true;
  const d = safeParseDate(dateValue);
  if (!d) return false;

  const now = new Date();

  switch (dateFilter) {
    case 'Today':
      return isToday(d);
    case 'This Week':
      return isThisWeek(d, { weekStartsOn: 1 });
    case 'This Month':
      return isThisMonth(d);
    case 'Last Month': {
      const lastMonth = subMonths(now, 1);
      return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
    }
    case 'Last 3 Months': {
      const threeMonthsAgo = subMonths(now, 3);
      return d >= threeMonthsAgo && d <= now;
    }
    case 'This Year':
      return isThisYear(d);
    case 'Custom Range': {
      if (!customStartDate || !customEndDate) return true;
      const start = startOfDay(new Date(customStartDate));
      const end = endOfDay(new Date(customEndDate));
      return d >= start && d <= end;
    }
    default:
      return true;
  }
}

export interface ChartDataPoint {
  name: string;
  Revenue: number;
  Payments: number;
  Outstanding: number;
}

/**
 * Build dynamic chart data for Dashboard's Financial Overview
 */
export function buildDashboardChartData(
  invoices: any[],
  payments: any[],
  timeRange: 'week' | 'month' | 'lastMonth' | 'quarter' | 'year'
): ChartDataPoint[] {
  const validInvoices = (invoices || []).filter(i => (i.type || 'Invoice') === 'Invoice');
  const validPayments = (payments || []).filter(p => !p.isDeleted);

  const now = new Date();

  if (timeRange === 'week') {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const dayInvoices = validInvoices.filter(i => {
        const d = safeParseDate(i.invoiceDate || i.date || i.createdAt);
        return d && d >= dayStart && d <= dayEnd;
      });

      const dayPayments = validPayments.filter(p => {
        const d = safeParseDate(p.paymentDate || p.createdAt);
        return d && d >= dayStart && d <= dayEnd;
      });

      const rev = dayInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
      const pay = dayPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const out = dayInvoices.reduce((s, i) => s + (Number(i.balance) || 0), 0);

      return {
        name: format(day, 'EEE d'),
        Revenue: Math.round(rev * 100) / 100,
        Payments: Math.round(pay * 100) / 100,
        Outstanding: Math.round(out * 100) / 100,
      };
    });
  }

  if (timeRange === 'month' || timeRange === 'lastMonth') {
    const targetMonth = timeRange === 'lastMonth' ? subMonths(now, 1) : now;
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();
    const daysInMonth = getDaysInMonth(targetMonth);

    // 4 weekly buckets
    const buckets = [
      { start: 1, end: 7 },
      { start: 8, end: 14 },
      { start: 15, end: 21 },
      { start: 22, end: daysInMonth }
    ];

    const monthLabel = format(targetMonth, 'MMM');

    return buckets.map(b => {
      const bStart = startOfDay(new Date(year, month, b.start));
      const bEnd = endOfDay(new Date(year, month, b.end));

      const bucketInvoices = validInvoices.filter(i => {
        const d = safeParseDate(i.invoiceDate || i.date || i.createdAt);
        return d && d >= bStart && d <= bEnd;
      });

      const bucketPayments = validPayments.filter(p => {
        const d = safeParseDate(p.paymentDate || p.createdAt);
        return d && d >= bStart && d <= bEnd;
      });

      const rev = bucketInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
      const pay = bucketPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const out = bucketInvoices.reduce((s, i) => s + (Number(i.balance) || 0), 0);

      return {
        name: `${b.start}-${b.end} ${monthLabel}`,
        Revenue: Math.round(rev * 100) / 100,
        Payments: Math.round(pay * 100) / 100,
        Outstanding: Math.round(out * 100) / 100,
      };
    });
  }

  if (timeRange === 'quarter') {
    // Last 3 calendar months
    const months = [subMonths(now, 2), subMonths(now, 1), now];

    return months.map(m => {
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);

      const mInvoices = validInvoices.filter(i => {
        const d = safeParseDate(i.invoiceDate || i.date || i.createdAt);
        return d && d >= mStart && d <= mEnd;
      });

      const mPayments = validPayments.filter(p => {
        const d = safeParseDate(p.paymentDate || p.createdAt);
        return d && d >= mStart && d <= mEnd;
      });

      const rev = mInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
      const pay = mPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const out = mInvoices.reduce((s, i) => s + (Number(i.balance) || 0), 0);

      return {
        name: format(m, 'MMM yyyy'),
        Revenue: Math.round(rev * 100) / 100,
        Payments: Math.round(pay * 100) / 100,
        Outstanding: Math.round(out * 100) / 100,
      };
    });
  }

  // timeRange === 'year'
  const currentYear = now.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => new Date(currentYear, i, 1));

  return months.map(m => {
    const mStart = startOfMonth(m);
    const mEnd = endOfMonth(m);

    const mInvoices = validInvoices.filter(i => {
      const d = safeParseDate(i.invoiceDate || i.date || i.createdAt);
      return d && d >= mStart && d <= mEnd;
    });

    const mPayments = validPayments.filter(p => {
      const d = safeParseDate(p.paymentDate || p.createdAt);
      return d && d >= mStart && d <= mEnd;
    });

    const rev = mInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const pay = mPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const out = mInvoices.reduce((s, i) => s + (Number(i.balance) || 0), 0);

    return {
      name: format(m, 'MMM'),
      Revenue: Math.round(rev * 100) / 100,
      Payments: Math.round(pay * 100) / 100,
      Outstanding: Math.round(out * 100) / 100,
    };
  });
}
