import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // ¡Corregido para usar el nuevo archivo de auth!
import { redirect } from "next/navigation";
import Navigation from "@/components/layout/Navigation";
import { prisma } from "@/lib/prisma";
import NewTransactionForm from "@/components/transactions/NewTransactionForm";
import TransactionTable from "@/components/transactions/TransactionTable";
import ImportCSVModal from "@/components/transactions/ImportCSVModal";
import Link from "next/link";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { type?: string }
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  // Filtros desde la URL
  const typeFilter = searchParams.type === 'INCOME' || searchParams.type === 'EXPENSE' 
    ? searchParams.type : undefined;

  // Cargar datos en paralelo para ser más eficientes
  const [transactions, accounts, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { 
        userId: session.user.id,
        ...(typeFilter && { type: typeFilter }) // Aplica el filtro si existe
      },
      include: { category: true, account: true },
      orderBy: { date: 'desc' }
    }),
    prisma.account.findMany({ where: { userId: session.user.id }, select: { id: true, name: true } }),
    prisma.category.findMany({ where: { userId: session.user.id }, select: { id: true, name: true } })
  ]);

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Navigation />
      <main className="flex-1 md:ml-64 p-6 md:p-8 pb-24 md:pb-8">
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Transacciones</h1>
            <p className="text-gray-500">Controla todos tus ingresos y gastos.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Filtros simples usando URL */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <Link href="/transacciones" className={`px-3 py-1.5 text-sm rounded-md transition-colors ${!typeFilter ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>
                Todas
              </Link>
              <Link href="/transacciones?type=INCOME" className={`px-3 py-1.5 text-sm rounded-md transition-colors ${typeFilter === 'INCOME' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>
                Ingresos
              </Link>
              <Link href="/transacciones?type=EXPENSE" className={`px-3 py-1.5 text-sm rounded-md transition-colors ${typeFilter === 'EXPENSE' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>
                Gastos
              </Link>
            </div>

            <ImportCSVModal accounts={accounts} />
            <NewTransactionForm accounts={accounts} categories={categories} />
          </div>
        </div>

        <TransactionTable transactions={transactions} />

      </main>
    </div>
  );
}
