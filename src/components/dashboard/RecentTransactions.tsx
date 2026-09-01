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

export default function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Últimas Transacciones</h3>
        <span className="text-sm text-blue-600 font-medium cursor-pointer hover:underline">Ver todas</span>
      </div>
      
      <div className="space-y-4">
        {transactions.length === 0 && <p className="text-gray-500 text-sm">No hay transacciones.</p>}
        
        {transactions.map((t) => {
          const isIncome = t.type === "INCOME";
          return (
            <div key={t.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {isIncome ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{t.description}</p>
                  <p className="text-xs text-gray-500 flex gap-2">
                    <span>{new Date(t.date).toLocaleDateString('es-CL')}</span>
                    <span>•</span>
                    <span>{t.category?.name || 'Sin categoría'}</span>
                    <span>•</span>
                    <span>{t.account.name}</span>
                  </p>
                </div>
              </div>
              <div className={`font-bold ${isIncome ? 'text-green-600' : 'text-gray-900'}`}>
                {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
