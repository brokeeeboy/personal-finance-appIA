"use client";

import { useState, useTransition } from "react";
import { Target, Trash2, Plus, X } from "lucide-react";
import { addContribution, deleteGoal } from "@/actions/goalActions";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date | null;
}

export default function GoalCard({ goal }: { goal: Goal }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const handleDelete = () => {
    if (confirm(`¿Eliminar la meta "${goal.name}"?`)) {
      startTransition(() => { deleteGoal(goal.id); });
    }
  };

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("goalId", goal.id);
    
    startTransition(() => {
      addContribution(formData);
      setIsAdding(false);
    });
  };

  // Cálculos de progreso
  const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const isCompleted = goal.currentAmount >= goal.targetAmount;
  
  // Cálculo mensual sugerido
  let monthlyNeeded = null;
  if (goal.targetDate && !isCompleted) {
    const today = new Date();
    const target = new Date(goal.targetDate);
    const monthsDiff = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
    const remainingAmount = goal.targetAmount - goal.currentAmount;
    
    const monthsRemaining = monthsDiff > 0 ? monthsDiff : 1; // Si es el mismo mes, sugerimos pagar todo lo que falta
    monthlyNeeded = remainingAmount / monthsRemaining;
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative group overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-black text-white'}`}>
            <Target size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{goal.name}</h3>
            {goal.targetDate && (
              <p className="text-xs text-gray-500">
                Objetivo: {new Date(goal.targetDate).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
        <button onClick={handleDelete} disabled={isPending} className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="mb-2 flex justify-between items-end">
        <span className="text-2xl font-bold text-gray-900">{formatCurrency(goal.currentAmount)}</span>
        <span className="text-sm text-gray-500 font-medium">de {formatCurrency(goal.targetAmount)}</span>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
        <div 
          className={`h-3 rounded-full transition-all duration-1000 ${isCompleted ? 'bg-green-500' : 'bg-black'}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between text-xs mb-6">
        <span className="font-bold text-gray-700">{percentage.toFixed(1)}% completado</span>
        {monthlyNeeded && (
          <span className="text-gray-500">Sugerido: <span className="font-semibold text-blue-600">{formatCurrency(monthlyNeeded)}/mes</span></span>
        )}
      </div>

      {/* Botón y Formulario de Aporte */}
      {isAdding ? (
        <form onSubmit={handleAdd} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
          <input name="amount" type="number" step="0.01" required placeholder="Monto a sumar" autoFocus className="flex-1 p-2 bg-white border border-gray-200 rounded-md text-sm outline-none" />
          <button type="submit" disabled={isPending} className="bg-black text-white px-3 py-2 rounded-md text-sm font-medium">
            Guardar
          </button>
          <button type="button" onClick={() => setIsAdding(false)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-md">
            <X size={16} />
          </button>
        </form>
      ) : (
        <button 
          onClick={() => setIsAdding(true)} 
          disabled={isCompleted}
          className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
            isCompleted 
              ? 'bg-green-50 text-green-700 border border-green-200 cursor-default' 
              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          {isCompleted ? '¡Meta alcanzada!' : <><Plus size={18} /> Abonar a meta</>}
        </button>
      )}
    </div>
  );
}
