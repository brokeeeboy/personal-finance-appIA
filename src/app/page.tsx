import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navigation from "@/components/layout/Navigation";
import { prisma } from "@/lib/prisma";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import ExpenseChart from "@/components/dashboard/ExpenseChart";
import DashboardChat from "@/components/dashboard/DashboardChat";

export const metadata = {
  title: "Dashboard | FinanceApp",
  description: "Tu asistente financiero inteligente. Registra gastos, ingresos y deudas con lenguaje natural.",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  // 1. Obtener Cuentas para Saldo Total
  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id }
  });
  const totalBalance = accounts.reduce((acc, account) => acc + account.balance, 0);

  // 2. Obtener Transacciones del mes actual
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: firstDayOfMonth }
    },
    include: { category: true, account: true },
    orderBy: { date: "desc" }
  });

  // 3. Calcular ingresos y gastos del mes
  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  const expensesByCategory: Record<string, { value: number; color: string }> = {};

  transactions.forEach((t) => {
    if (t.type === "INCOME") {
      monthlyIncome += t.amount;
    } else {
      monthlyExpenses += t.amount;
      if (t.category) {
        if (!expensesByCategory[t.category.name]) {
          expensesByCategory[t.category.name] = { value: 0, color: t.category.color || "#6366f1" };
        }
        expensesByCategory[t.category.name].value += t.amount;
      }
    }
  });

  const chartData = Object.entries(expensesByCategory).map(([name, data]) => ({
    name,
    value: data.value,
    color: data.color,
  }));

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Navigation />

      {/* Main content — two-column layout */}
      <main className="flex-1 md:ml-64 flex flex-col lg:flex-row gap-6 p-6 md:p-8 pb-24 md:pb-8 min-h-screen">

        {/* LEFT — AI Chat (primary, takes all available height) */}
        <section className="flex-1 flex flex-col min-h-[600px] lg:min-h-0">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-white">
              Hola, {session.user.name} 👋
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Cuéntame qué pasó hoy con tus finanzas — yo lo registro.
            </p>
          </div>

          {/* DashboardChat fills all remaining height */}
          <div className="flex-1 flex flex-col">
            <DashboardChat
              userName={session.user.name ?? ""}
              totalBalance={totalBalance}
              monthlyIncome={monthlyIncome}
              monthlyExpenses={monthlyExpenses}
            />
          </div>
        </section>

        {/* RIGHT — Sidebar with chart + recent transactions */}
        <aside className="w-full lg:w-[340px] flex flex-col gap-6 shrink-0">
          <ExpenseChart data={chartData} />
          <RecentTransactions transactions={transactions.slice(0, 5)} />
        </aside>
      </main>
    </div>
  );
}
