"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { updateGoal } from "@/actions/goalActions";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date | null;
}

export default function EditGoalModal({
  goal,
  onClose,
}: {
  goal: Goal;
  onClose: () => void;
}) {
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);

    try {
      await updateGoal(goal.id, formData);
      onClose();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "No se pudo editar la meta.",
      );
    } finally {
      setIsPending(false);
    }
  };

  const targetDateValue = goal.targetDate
    ? new Date(goal.targetDate).toISOString().split("T")[0]
    : "";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-bold mb-4">Editar meta</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ¿Qué quieres lograr?
            </label>
            <input
              name="name"
              type="text"
              required
              defaultValue={goal.name}
              className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto Objetivo
            </label>
            <input
              name="targetAmount"
              type="number"
              step="0.01"
              required
              defaultValue={goal.targetAmount}
              className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
            />
            <p className="text-xs text-gray-400 mt-1">
              Ya tienes {goal.currentAmount.toLocaleString("es-CL")} ahorrados
              (se sigue gestionando con los aportes, no cambia aquí).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha límite (Opcional)
            </label>
            <input
              name="targetDate"
              type="date"
              defaultValue={targetDateValue}
              className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-black text-white p-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 mt-2"
          >
            {isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
