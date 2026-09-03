import { prisma } from "@/lib/prisma";

export async function getFinancialContext(userId: string) {
  const [accounts, transactions, allTransactions, debts, goals, categories] =
    await Promise.all([
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
        take: 30,
      }),
      prisma.transaction.findMany({
        where: { userId },
        select: { amount: true, type: true },
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

  const incomeTotal = allTransactions
    .filter((transaction) => transaction.type === "INCOME")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);
  const expenseTotal = allTransactions
    .filter((transaction) => transaction.type === "EXPENSE")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  return {
    generatedAt: new Date().toISOString(),
    note: "Este contexto incluye todos los movimientos registrados del usuario.",
    summary: {
      accountCount: accounts.length,
      totalBalance: accounts.reduce(
        (total, account) => total + Number(account.balance),
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
    recentTransactions: transactions.map((transaction) => ({
      ...transaction,
      amount: Number(transaction.amount),
    })),
    debts: debts.map((debt) => ({ ...debt, amount: Number(debt.amount) })),
    goals: goals.map((goal) => ({
      ...goal,
      targetAmount: Number(goal.targetAmount),
      currentAmount: Number(goal.currentAmount),
      contributions: goal.contributions.map((contribution) => ({
        ...contribution,
        amount: Number(contribution.amount),
      })),
    })),
  };
}
