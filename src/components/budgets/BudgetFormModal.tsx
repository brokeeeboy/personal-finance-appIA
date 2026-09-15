"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { setBudget } from "@/actions/budgetActions";

interface Props {
  categoryId: string;
  categoryName: string;
  month: number;
  year: number;
  currentAmount?: number;
  onClose: () => void;
}

export default function BudgetFormModal({
  categoryId,
  categoryName,
  month,
  year,
  currentAmount,
  onClose,
}: Props) {
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);

    try {
      await setBudget(formData);
      onClose();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el presupuesto.",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-bold mb-1">Presupuesto mensual</h2>
        <p className="text-sm text-gray-500 mb-4">{categoryName}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="categoryId" value={categoryId} />
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="year" value={year} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto máximo a gastar este mes
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              autoFocus
              defaultValue={currentAmount}
              className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-black text-white p-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 mt-2"
          >
            {isPending ? "Guardando..." : "Guardar presupuesto"}
          </button>
        </form>
      </div>
    </div>
  );
}
