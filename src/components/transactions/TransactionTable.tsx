"use client";

import { deleteTransaction } from "@/actions/transactionActions";
import { Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useTransition } from "react";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: Date;
  category: { name: string; color: string | null } | null;
  account: { name: string };
}

export default function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  const [isPending, startTransition] = useTransition();

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const handleDelete = (id: string, description: string) => {
    if (confirm(`¿Eliminar la transacción "${description}"? Se restaurará el saldo en tu cuenta.`)) {
      startTransition(() => {
        deleteTransaction(id);
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
              <th className="p-4 font-medium">Fecha</th>
              <th className="p-4 font-medium">Descripción</th>
              <th className="p-4 font-medium">Categoría</th>
              <th className="p-4 font-medium">Cuenta</th>
              <th className="p-4 font-medium text-right">Monto</th>
              <th className="p-4 font-medium text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No se encontraron transacciones.
                </td>
              </tr>
            )}
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="p-4 text-sm text-gray-600">
                  {new Date(t.date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="p-4 font-medium text-gray-900 flex items-center gap-2">
                  <div className={`p-1.5 rounded-full ${t.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {t.type === 'INCOME' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  </div>
                  {t.description}
                </td>
                <td className="p-4 text-sm">
                  {t.category ? (
                    <span className="px-2 py-1 bg-gray-100 rounded-md text-gray-700 text-xs">
                      {t.category.name}
                    </span>
                  ) : <span className="text-gray-400 text-xs">Sin categoría</span>}
                </td>
                <td className="p-4 text-sm text-gray-600">{t.account.name}</td>
                <td className={`p-4 text-right font-medium ${t.type === 'INCOME' ? 'text-green-600' : 'text-gray-900'}`}>
                  {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                </td>
                <td className="p-4 text-center">
                  <button 
                    onClick={() => handleDelete(t.id, t.description)}
                    disabled={isPending}
                    className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
