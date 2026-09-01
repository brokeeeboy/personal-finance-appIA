"use client";

import { useTransition } from "react";
import { CheckCircle2, Circle, Trash2, User, Calendar } from "lucide-react";
import { toggleDebtStatus, deleteDebt } from "@/actions/debtActions";

interface Debt {
  id: string;
  personName: string;
  amount: number;
  description: string | null;
  dueDate: Date | null;
  type: string;
  status: string;
}

export default function DebtCard({ debt }: { debt: Debt }) {
  const [isPending, startTransition] = useTransition();
  const isPaid = debt.status === "PAID";
  const isOweMe = debt.type === "OWE_ME";

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const handleToggle = () => {
    startTransition(() => {
      toggleDebtStatus(debt.id, debt.status);
    });
  };

  const handleDelete = () => {
    if (confirm("¿Eliminar este registro?")) {
      startTransition(() => {
        deleteDebt(debt.id);
      });
    }
  };

  return (
    <div className={`p-5 rounded-xl border transition-all ${isPaid ? 'bg-gray-50 border-gray-100 opacity-75' : 'bg-white border-gray-200 shadow-sm'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleToggle} 
            disabled={isPending}
            className={`transition-colors ${isPaid ? 'text-green-500' : 'text-gray-300 hover:text-green-500'}`}
          >
            {isPaid ? <CheckCircle2 size={24} /> : <Circle size={24} />}
          </button>
          <div>
            <h3 className={`font-bold ${isPaid ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
              {debt.personName}
            </h3>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <User size={12} /> {isOweMe ? 'Me debe' : 'Le debo'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-bold ${isPaid ? 'text-gray-400' : isOweMe ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(debt.amount)}
          </span>
          <button 
            onClick={handleDelete}
            disabled={isPending}
            className="text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {(debt.description || debt.dueDate) && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
          <span>{debt.description}</span>
          {debt.dueDate && (
            <span className="flex items-center gap-1 text-orange-600 font-medium">
              <Calendar size={12} /> 
              {new Date(debt.dueDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
