import { Prisma } from "@prisma/client";

type TransactionType = "INCOME" | "EXPENSE";

/**
 * Calcula cuánto debe cambiar `Account.balance` al registrar un movimiento.
 *
 * Para cuentas normales (DEBIT/CHECKING/CASH), `balance` es el dinero
 * disponible: un ingreso lo aumenta, un gasto lo disminuye.
 *
 * Para cuentas CREDIT, `balance` representa la deuda actual con el banco
 * (lo que se debe de la tarjeta, tal como se usa junto a `creditLimit`):
 * una compra (EXPENSE) aumenta la deuda y un pago a la tarjeta (INCOME)
 * la disminuye, es decir, el signo se invierte respecto a una cuenta normal.
 */
export function computeBalanceChange(
  accountType: string,
  transactionType: TransactionType,
  amount: Prisma.Decimal.Value,
): Prisma.Decimal {
  const magnitude = new Prisma.Decimal(amount);
  const baseChange =
    transactionType === "INCOME" ? magnitude : magnitude.negated();

  return accountType === "CREDIT" ? baseChange.negated() : baseChange;
}

/**
 * Valor neto que aporta una cuenta al patrimonio total. Las cuentas CREDIT
 * guardan una deuda (ver `computeBalanceChange`), así que restan en vez de
 * sumar al total: una tarjeta con $350.000 en uso no es dinero disponible,
 * es dinero que hay que devolver.
 */
export function getAccountNetValue(account: {
  type: string;
  balance: Prisma.Decimal.Value;
}): Prisma.Decimal {
  const balance = new Prisma.Decimal(account.balance);
  return account.type === "CREDIT" ? balance.negated() : balance;
}

type BalanceMutatingClient = {
  account: {
    update: (args: {
      where: { id: string };
      data: { balance: { increment: Prisma.Decimal } };
    }) => Promise<unknown>;
  };
};

export async function applyBalanceChange(
  tx: BalanceMutatingClient,
  accountId: string,
  change: Prisma.Decimal,
) {
  if (change.isZero()) return;
  await tx.account.update({
    where: { id: accountId },
    data: { balance: { increment: change } },
  });
}
