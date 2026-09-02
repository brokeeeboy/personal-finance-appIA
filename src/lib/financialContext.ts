import { prisma } from "@/lib/prisma";

export async function getFinancialContext(userId: string) {
  const [accounts, transactions, debts, goals, categories] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        type: true,
        bankName: true,
        lastFour: true,
        creditLimit: true,
        billingDay: true,
        paymentDay: true,
        balance: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.findMany({
      where: { userId },
      select: {
        id: true,
        description: true,
        merchant: true,
        amount: true,
        type: true,
        date: true,
        paymentMethod: true,
        account: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.debt.findMany({
      where: { userId },
      select: {
        id: true,
        personName: true,
        amount: true,
        description: true,
        date: true,
        dueDate: true,
        type: true,
        status: true,
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { date: "desc" }],
    }),
    prisma.goal.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        targetAmount: true,
        currentAmount: true,
        targetDate: true,
        contributions: {
          select: { amount: true, date: true },
          orderBy: { date: "desc" },
          take: 20,
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const incomeTotal = transactions
    .filter((transaction) => transaction.type === "INCOME")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expenseTotal = transactions
    .filter((transaction) => transaction.type === "EXPENSE")
    .reduce((total, transaction) => total + transaction.amount, 0);

  return {
    generatedAt: new Date().toISOString(),
    note: "Este contexto incluye todos los movimientos registrados del usuario.",
    summary: {
      accountCount: accounts.length,
      totalBalance: accounts.reduce(
        (total, account) => total + account.balance,
        0,
      ),
      recentIncomeTotal: incomeTotal,
      recentExpenseTotal: expenseTotal,
      pendingDebtCount: debts.filter((debt) => debt.status === "PENDING")
        .length,
      goalCount: goals.length,
    },
    accounts,
    categories,
    recentTransactions: transactions,
    debts,
    goals,
  };
}
