"use client";

import { deleteAccount } from "@/actions/accountActions";
import { CreditCard, Landmark, Wallet, Trash2 } from "lucide-react";
import { useTransition } from "react";

interface Account {
  id: string;
  name: string;
  type: string;
  bankName: string | null;
  lastFour: string | null;
  balance: number;
  creditLimit: number | null;
}

export default function AccountCard({ account }: { account: Account }) {
  const [isPending, startTransition] = useTransition();

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const getIcon = () => {
    if (account.type === 'CREDIT' || account.type === 'DEBIT') return <CreditCard className="text-blue-600" />;
    if (account.type === 'CHECKING') return <Landmark className="text-indigo-600" />;
    return <Wallet className="text-green-600" />;
  };

  const handleDelete = () => {
    if (confirm(`¿Estás seguro de eliminar la cuenta ${account.name}? Se borrarán todas sus transacciones.`)) {
      startTransition(() => {
        deleteAccount(account.id);
      });
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative group overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            {getIcon()}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{account.name}</h3>
            <p className="text-xs text-gray-500">
              {account.bankName || 'Sin banco'} {account.lastFour ? `• • • • ${account.lastFour}` : ''}
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleDelete}
          disabled={isPending}
          className="text-gray-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Eliminar cuenta"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="mt-6">
        <p className="text-sm text-gray-500 font-medium">
          {account.type === 'CREDIT' ? 'Deuda actual' : 'Saldo disponible'}
        </p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(account.balance)}</p>
        
        {account.type === 'CREDIT' && account.creditLimit && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Cupo utilizado</span>
              <span>{Math.round((account.balance / account.creditLimit) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${Math.min((account.balance / account.creditLimit) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Límite: {formatCurrency(account.creditLimit)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
