const MONTH_LABELS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export interface MonthlyTrendPoint {
  month: string;
  income: number;
  expense: number;
}

/**
 * Agrupa transacciones en baldes mensuales (los últimos `monthsCount` meses,
 * incluyendo el actual), para graficar ingresos vs. gastos en el tiempo.
 * Meses sin movimientos igual aparecen con 0, para que el eje X no salte.
 */
export function buildMonthlyTrend(
  transactions: Array<{ amount: number; type: string; date: Date | string }>,
  monthsCount: number,
  referenceDate: Date = new Date(),
): MonthlyTrendPoint[] {
  const buckets = new Map<string, { income: number; expense: number }>();
  const order: string[] = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - i,
      1,
    );
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.set(key, { income: 0, expense: 0 });
    order.push(key);
  }

  for (const t of transactions) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = buckets.get(key);
    if (!bucket) continue; // fuera del rango solicitado
    if (t.type === "INCOME") bucket.income += t.amount;
    else if (t.type === "EXPENSE") bucket.expense += t.amount;
  }

  return order.map((key) => {
    const [, monthStr] = key.split("-");
    const bucket = buckets.get(key)!;
    return {
      month: MONTH_LABELS[Number(monthStr)],
      income: bucket.income,
      expense: bucket.expense,
    };
  });
}
