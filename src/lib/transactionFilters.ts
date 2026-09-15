import { Prisma } from "@prisma/client";

export type TransactionFilterParams = {
  type?: string;
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  q?: string;
};

/**
 * Construye el `where` de Prisma para /transacciones y para la exportación
 * CSV a partir de los mismos query params, para que ambos siempre filtren
 * exactamente lo mismo.
 */
export function buildTransactionWhere(
  userId: string,
  params: TransactionFilterParams,
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { userId };

  if (params.type === "INCOME" || params.type === "EXPENSE") {
    where.type = params.type;
  }

  if (params.accountId) where.accountId = params.accountId;
  if (params.categoryId) where.categoryId = params.categoryId;

  const query = params.q?.trim();
  if (query) {
    where.description = { contains: query, mode: "insensitive" };
  }

  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(params.to) : undefined;
  const hasValidFrom = from && !Number.isNaN(from.getTime());
  const hasValidTo = to && !Number.isNaN(to.getTime());

  if (hasValidFrom || hasValidTo) {
    where.date = {};
    if (hasValidFrom) where.date.gte = from;
    if (hasValidTo) {
      const endOfDay = new Date(to!);
      endOfDay.setHours(23, 59, 59, 999);
      where.date.lte = endOfDay;
    }
  }

  return where;
}
