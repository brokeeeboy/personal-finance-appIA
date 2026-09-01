"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createGoal } from "@/actions/goalActions";

export default function NewGoalForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    
    const formData = new FormData(e.currentTarget);
    await createGoal(formData);
    
    setIsPending(false);
    setIsOpen(false);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="bg-black text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors">
        <Plus size={20} /> Nueva Meta
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900">
              <X size={24} />
            </button>
            
            <h2 className="text-xl font-bold mb-4">Crear Meta de Ahorro</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">¿Qué quieres lograr?</label>
                <input name="name" type="text" required placeholder="Ej: Comprar moto, Viaje a Japón" className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Objetivo</label>
                  <input name="targetAmount" type="number" step="0.01" required placeholder="3000000" className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ahorro inicial</label>
                  <input name="initialAmount" type="number" step="0.01" defaultValue={0} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite (Opcional)</label>
                <input name="targetDate" type="date" className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black" />
              </div>

              <button type="submit" disabled={isPending} className="w-full bg-black text-white p-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 mt-2">
                {isPending ? 'Guardando...' : 'Crear Meta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
