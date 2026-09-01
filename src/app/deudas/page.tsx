import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Corregido para usar lib/auth
import { redirect } from "next/navigation";
import Navigation from "@/components/layout/Navigation";
import { prisma } from "@/lib/prisma";
import NewDebtForm from "@/components/debts/NewDebtForm";
import DebtCard from "@/components/debts/DebtCard";
import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";

export default async function DebtsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const debts = await prisma.debt.findMany({
    where: { userId: session.user.id },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { date: "desc" }],
  });

  // Cálculos solo para las deudas PENDIENTES
  let oweMeTotal = 0;
  let iOweTotal = 0;

  debts
    .filter(
      (d: { status: string; type: string; amount: number }) =>
        d.status === "PENDING",
    )
    .forEach((d: { status: string; type: string; amount: number }) => {
      if (d.type === "OWE_ME") oweMeTotal += d.amount;
      else iOweTotal += d.amount;
    });

  const balance = oweMeTotal - iOweTotal;
  const isPositive = balance >= 0;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(Math.abs(amount));

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Navigation />
      <main className="flex-1 md:ml-64 p-6 md:p-8 pb-24 md:pb-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Deudas y Préstamos
            </h1>
            <p className="text-gray-500">
              Lleva el control de quién te debe y a quién le debes.
            </p>
          </div>
          <NewDebtForm />
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-full">
              <ArrowUpRight size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Me deben</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(oweMeTotal)}
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-full">
              <ArrowDownRight size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Yo debo</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(iOweTotal)}
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div
              className={`p-3 rounded-full ${isPositive ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}
            >
              <Scale size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Balance Neto</p>
              <p
                className={`text-2xl font-bold ${isPositive ? "text-blue-600" : "text-orange-600"}`}
              >
                {isPositive ? "+" : "-"}
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
        </div>

        {debts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">No tienes deudas registradas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span> Por
                Cobrar (Me deben)
              </h2>
              <div className="space-y-3">
                {debts.filter((d) => d.type === "OWE_ME").length === 0 && (
                  <p className="text-gray-500 text-sm">Nada por aquí.</p>
                )}
                {debts
                  .filter((d) => d.type === "OWE_ME")
                  .map((debt) => (
                    <DebtCard key={debt.id} debt={debt} />
                  ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span> Por
                Pagar (Yo debo)
              </h2>
              <div className="space-y-3">
                {debts.filter((d) => d.type === "I_OWE").length === 0 && (
                  <p className="text-gray-500 text-sm">Nada por aquí.</p>
                )}
                {debts
                  .filter((d) => d.type === "I_OWE")
                  .map((debt) => (
                    <DebtCard key={debt.id} debt={debt} />
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
