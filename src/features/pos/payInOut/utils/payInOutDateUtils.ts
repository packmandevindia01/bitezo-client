export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateToYMD = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateParts = (val?: string | null): { year: number; month: number; day: number } | null => {
  if (!val) return null;
  const clean = val.split('T')[0].trim();
  const parts = clean.includes('-') ? clean.split('-') : clean.split('/');
  if (parts.length !== 3) return null;
  if (parts[0].length === 4) {
    return { year: Number(parts[0]), month: Number(parts[1]), day: Number(parts[2]) };
  }
  if (parts[2].length === 4) {
    return { year: Number(parts[2]), month: Number(parts[1]), day: Number(parts[0]) };
  }
  return null;
};

export const isFutureDate = (val?: string | null): boolean => {
  if (!val) return false;
  const parsed = parseDateParts(val);
  if (!parsed || isNaN(parsed.year) || isNaN(parsed.month) || isNaN(parsed.day)) {
    const d = new Date(val);
    if (isNaN(d.getTime())) return true;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return d > today;
  }
  const selected = new Date(parsed.year, parsed.month - 1, parsed.day);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return selected > today;
};
