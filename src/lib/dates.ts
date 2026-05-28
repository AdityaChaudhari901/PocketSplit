export const toISODate = (date: Date): string => date.toISOString();

export const monthKey = (date = new Date()): string => {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
};

export const readableMonth = (date = new Date()): string =>
  new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(date);

export const daysRemainingInMonth = (date = new Date()): number => {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return Math.max(1, end.getDate() - date.getDate() + 1);
};

export const startOfMonthISO = (date = new Date()): string =>
  new Date(date.getFullYear(), date.getMonth(), 1).toISOString();

export const endOfMonthISO = (date = new Date()): string =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
