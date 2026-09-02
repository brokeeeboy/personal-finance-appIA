"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createDebt } from "@/actions/debtActions";

export default function NewDebtForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [type, setType] = useState("OWE_ME");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    try {
      await createDebt(formData);
      setIsOpen(false);
    } catch {
      alert(
        "No se pudo guardar la deuda. Revisa los datos e inténtalo de nuevo.",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-black text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors"
      >
        <Plus size={20} /> Registrar Deuda
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
            >
              <X size={24} />
            </button>

            <h2 className="text-xl font-bold mb-4">Nueva Deuda / Préstamo</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-lg flex-1 border border-gray-200">
                  <input
                    type="radio"
                    name="type"
                    value="OWE_ME"
                    checked={type === "OWE_ME"}
                    onChange={(e) => setType(e.target.value)}
                    className="accent-black"
                  />
                  Me deben
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-lg flex-1 border border-gray-200">
                  <input
                    type="radio"
                    name="type"
                    value="I_OWE"
                    checked={type === "I_OWE"}
                    onChange={(e) => setType(e.target.value)}
                    className="accent-black"
                  />
                  Yo debo
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {type === "OWE_ME" ? "¿Quién te debe?" : "¿A quién le debes?"}
                </label>
                <input
                  name="personName"
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto
                </label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo (Opcional)
                </label>
                <input
                  name="description"
                  type="text"
                  placeholder="Ej: Cena del viernes"
                  className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de vencimiento (Opcional)
                </label>
                <input
                  name="dueDate"
                  type="date"
                  className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-black text-white p-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 mt-2"
              >
                {isPending ? "Guardando..." : "Guardar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
