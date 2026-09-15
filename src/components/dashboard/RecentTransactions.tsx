import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: Date;
  category: { name: string } | null;
  account: { name: string };
}

export default function RecentTransactions({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);

  return (
    <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl shadow-slate-950/30">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">Últimas Transacciones</h3>
        <span className="text-sm text-cyan-400 font-medium cursor-pointer hover:underline">
          Ver todas
        </span>
      </div>

      <div className="space-y-4">
        {transactions.length === 0 && (
          <p className="text-slate-400 text-sm">No hay transacciones.</p>
        )}

        {transactions.map((t) => {
          const isIncome = t.type === "INCOME";
          return (
            <div
              key={t.id}
              className="flex items-center justify-between p-3 hover:bg-slate-800/70 rounded-xl transition-colors border border-transparent hover:border-slate-700"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-2 rounded-full ${isIncome ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}
                >
                  {isIncome ? (
                    <ArrowUpRight size={20} />
                  ) : (
                    <ArrowDownRight size={20} />
                  )}
                </div>
                <div>
                  <p className="font-medium text-white">{t.description}</p>
                  <p className="text-xs text-slate-400 flex gap-2 flex-wrap">
                    <span>{new Date(t.date).toLocaleDateString("es-CL")}</span>
                    <span>•</span>
                    <span>{t.category?.name || "Sin categoría"}</span>
                    <span>•</span>
                    <span>{t.account.name}</span>
                  </p>
                </div>
              </div>
              <div
                className={`font-bold ${isIncome ? "text-emerald-400" : "text-slate-100"}`}
              >
                {isIncome ? "+" : "-"}
                {formatCurrency(t.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
