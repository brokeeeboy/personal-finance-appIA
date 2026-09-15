import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Navigation from "@/components/layout/Navigation";
import { prisma } from "@/lib/prisma";
import BudgetList, { type BudgetItem } from "@/components/budgets/BudgetList";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function normalizeMonthYear(month: number, year: number) {
  // Permite navegar de diciembre a enero del año siguiente y viceversa.
  const date = new Date(year, month - 1, 1);
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const now = new Date();
  const requestedMonth = Number.parseInt(sp.month ?? "", 10);
  const requestedYear = Number.parseInt(sp.year ?? "", 10);
  const month =
    Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
      ? requestedMonth
      : now.getMonth() + 1;
  const year = Number.isInteger(requestedYear) ? requestedYear : now.getFullYear();

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const [categories, budgets, spentGroups] = await Promise.all([
    prisma.category.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
    prisma.budget.findMany({
      where: { userId: session.user.id, month, year },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId: session.user.id,
        type: "EXPENSE",
        date: { gte: monthStart, lt: monthEnd },
        categoryId: { not: null },
      },
      _sum: { amount: true },
    }),
  ]);

  const budgetByCategory = new Map(budgets.map((b) => [b.categoryId, b]));
  const spentByCategory = new Map(
    spentGroups.map((g) => [g.categoryId as string, Number(g._sum.amount ?? 0)]),
  );

  const items: BudgetItem[] = categories.map((category) => {
    const budget = budgetByCategory.get(category.id);
    return {
      categoryId: category.id,
      categoryName: category.name,
      categoryColor: category.color,
      budgetId: budget?.id ?? null,
      budgetAmount: budget ? Number(budget.amount) : null,
      spent: spentByCategory.get(category.id) ?? 0,
    };
  });

  const prev = normalizeMonthYear(month - 1, year);
  const next = normalizeMonthYear(month + 1, year);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Navigation />
      <main className="flex-1 md:ml-64 p-6 md:p-8 pb-24 md:pb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">
              Presupuestos
            </p>
            <h1 className="text-3xl font-bold text-white mt-2">
              Presupuesto por categoría
            </h1>
            <p className="text-slate-400 mt-1">
              Define cuánto quieres gastar como máximo en cada categoría este
              mes.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5">
            <Link
              href={`/presupuestos?month=${prev.month}&year=${prev.year}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ChevronLeft size={18} />
            </Link>
            <span className="px-2 text-sm font-medium text-white min-w-[140px] text-center">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <Link
              href={`/presupuestos?month=${next.month}&year=${next.year}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/70 rounded-2xl border border-dashed border-slate-700">
            <p className="text-slate-400">
              Primero crea categorías en la sección{" "}
              <Link href="/categorias" className="text-cyan-400 underline">
                Categorías
              </Link>{" "}
              para poder asignarles un presupuesto.
            </p>
          </div>
        ) : (
          <BudgetList items={items} month={month} year={year} />
        )}
      </main>
    </div>
  );
}
