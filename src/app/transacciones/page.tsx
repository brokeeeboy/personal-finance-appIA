import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // ¡Corregido para usar el nuevo archivo de auth!
import { redirect } from "next/navigation";
import Navigation from "@/components/layout/Navigation";
import { prisma } from "@/lib/prisma";
import NewTransactionForm from "@/components/transactions/NewTransactionForm";
import TransactionTable from "@/components/transactions/TransactionTable";
import TransactionFilters from "@/components/transactions/TransactionFilters";
import ImportCSVModal from "@/components/transactions/ImportCSVModal";
import Link from "next/link";
import { buildTransactionWhere } from "@/lib/transactionFilters";

const PAGE_SIZE = 30;

type SearchParams = {
  type?: string;
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: string;
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const typeFilter =
    sp.type === "INCOME" || sp.type === "EXPENSE" ? sp.type : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where = buildTransactionWhere(session.user.id, {
    type: typeFilter,
    accountId: sp.accountId,
    categoryId: sp.categoryId,
    from: sp.from,
    to: sp.to,
    q: sp.q,
  });

  // Cargar datos en paralelo para ser más eficientes
  const [transactions, totalCount, accounts, categories] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true, account: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.transaction.count({ where }),
    prisma.account.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const buildHref = (overrides: { type?: string; page?: number }) => {
    const params = new URLSearchParams();
    const nextType = "type" in overrides ? overrides.type : typeFilter;
    if (nextType) params.set("type", nextType);
    if (sp.accountId) params.set("accountId", sp.accountId);
    if (sp.categoryId) params.set("categoryId", sp.categoryId);
    if (sp.from) params.set("from", sp.from);
    if (sp.to) params.set("to", sp.to);
    if (sp.q) params.set("q", sp.q);
    const nextPage = overrides.page ?? page;
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `/transacciones?${query}` : "/transacciones";
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Navigation />
      <main className="flex-1 md:ml-64 p-6 md:p-8 pb-24 md:pb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">
              Transacciones
            </p>
            <h1 className="text-3xl font-bold text-white mt-2">
              Transacciones
            </h1>
            <p className="text-slate-400 mt-1">
              Controla todos tus ingresos y gastos.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <Link
                href={buildHref({ type: undefined, page: 1 })}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${!typeFilter ? "bg-slate-700 text-white shadow-sm font-medium" : "text-slate-400"}`}
              >
                Todas
              </Link>
              <Link
                href={buildHref({ type: "INCOME", page: 1 })}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${typeFilter === "INCOME" ? "bg-slate-700 text-white shadow-sm font-medium" : "text-slate-400"}`}
              >
                Ingresos
              </Link>
              <Link
                href={buildHref({ type: "EXPENSE", page: 1 })}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${typeFilter === "EXPENSE" ? "bg-slate-700 text-white shadow-sm font-medium" : "text-slate-400"}`}
              >
                Gastos
              </Link>
            </div>

            <ImportCSVModal accounts={accounts} />
            <NewTransactionForm accounts={accounts} categories={categories} />
          </div>
        </div>

        <TransactionFilters accounts={accounts} categories={categories} />

        <TransactionTable
          transactions={transactions.map((transaction) => ({
            ...transaction,
            amount: Number(transaction.amount),
          }))}
          accounts={accounts}
          categories={categories}
        />

        {totalCount > 0 && (
          <div className="flex items-center justify-between mt-6 text-sm text-slate-400">
            <p>
              {totalCount} transacción{totalCount === 1 ? "" : "es"} · página{" "}
              {page} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={buildHref({ page: Math.max(1, page - 1) })}
                aria-disabled={page <= 1}
                className={`px-3 py-1.5 rounded-lg border border-slate-800 ${
                  page <= 1
                    ? "pointer-events-none opacity-40"
                    : "hover:bg-slate-800 text-slate-200"
                }`}
              >
                Anterior
              </Link>
              <Link
                href={buildHref({ page: Math.min(totalPages, page + 1) })}
                aria-disabled={page >= totalPages}
                className={`px-3 py-1.5 rounded-lg border border-slate-800 ${
                  page >= totalPages
                    ? "pointer-events-none opacity-40"
                    : "hover:bg-slate-800 text-slate-200"
                }`}
              >
                Siguiente
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
