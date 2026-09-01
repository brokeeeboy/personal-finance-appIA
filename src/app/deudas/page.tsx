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
    <div className="flex min-h-screen bg-slate-950">
      <Navigation />
      <main className="flex-1 md:ml-64 p-6 md:p-8 pb-24 md:pb-8">
        <div className="flex justify-between items-end mb-8 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">
              Deudas
            </p>
            <h1 className="text-3xl font-bold text-white mt-2">
              Deudas y Préstamos
            </h1>
            <p className="text-slate-400 mt-1">
              Lleva el control de quién te debe y a quién le debes.
            </p>
          </div>
          <NewDebtForm />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg shadow-slate-950/30 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-full">
              <ArrowUpRight size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Me deben</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(oweMeTotal)}
              </p>
            </div>
          </div>
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg shadow-slate-950/30 flex items-center gap-4">
            <div className="p-3 bg-red-500/15 text-red-400 rounded-full">
              <ArrowDownRight size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Yo debo</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(iOweTotal)}
              </p>
            </div>
          </div>
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg shadow-slate-950/30 flex items-center gap-4">
            <div
              className={`p-3 rounded-full ${isPositive ? "bg-cyan-500/15 text-cyan-400" : "bg-orange-500/15 text-orange-400"}`}
            >
              <Scale size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Balance Neto</p>
              <p
                className={`text-2xl font-bold ${isPositive ? "text-cyan-400" : "text-orange-400"}`}
              >
                {isPositive ? "+" : "-"}
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
        </div>

        {debts.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/70 rounded-2xl border border-dashed border-slate-700">
            <p className="text-slate-400 mb-4">No tienes deudas registradas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>{" "}
                Por Cobrar (Me deben)
              </h2>
              <div className="space-y-3">
                {debts.filter((d) => d.type === "OWE_ME").length === 0 && (
                  <p className="text-slate-500 text-sm">Nada por aquí.</p>
                )}
                {debts
                  .filter((d) => d.type === "OWE_ME")
                  .map((debt) => (
                    <DebtCard key={debt.id} debt={debt} />
                  ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span> Por
                Pagar (Yo debo)
              </h2>
              <div className="space-y-3">
                {debts.filter((d) => d.type === "I_OWE").length === 0 && (
                  <p className="text-slate-500 text-sm">Nada por aquí.</p>
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
