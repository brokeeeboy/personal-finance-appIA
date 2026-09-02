"use client";

import { useState } from "react";
import { createTransaction } from "@/actions/transactionActions";
import { Plus, X } from "lucide-react";

interface Props {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

export default function NewTransactionForm({ accounts, categories }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [type, setType] = useState("EXPENSE");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    try {
      await createTransaction(formData);
      setIsOpen(false);
    } catch {
      alert(
        "No se pudo guardar la transacción. Revisa los datos e inténtalo de nuevo.",
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
        <Plus size={20} /> Nueva Transacción
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

            <h2 className="text-xl font-bold mb-4">Registrar Movimiento</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="EXPENSE"
                    checked={type === "EXPENSE"}
                    onChange={(e) => setType(e.target.value)}
                    className="accent-black"
                  />
                  Gasto
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="INCOME"
                    checked={type === "INCOME"}
                    onChange={(e) => setType(e.target.value)}
                    className="accent-black"
                  />
                  Ingreso
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <input
                  name="description"
                  type="text"
                  required
                  placeholder="Ej: Supermercado"
                  className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    Fecha
                  </label>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuenta
                </label>
                <select
                  name="accountId"
                  required
                  className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black bg-white"
                >
                  <option value="">Selecciona una cuenta</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  name="categoryId"
                  className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black bg-white"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-black text-white p-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 mt-2"
              >
                {isPending ? "Guardando..." : "Guardar Transacción"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
