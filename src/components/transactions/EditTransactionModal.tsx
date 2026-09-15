"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { updateTransaction } from "@/actions/transactionActions";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: Date;
  accountId: string;
  categoryId: string | null;
}

interface Props {
  transaction: Transaction;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  onClose: () => void;
}

export default function EditTransactionModal({
  transaction,
  accounts,
  categories,
  onClose,
}: Props) {
  const [isPending, setIsPending] = useState(false);
  const [type, setType] = useState(transaction.type);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);

    try {
      await updateTransaction(transaction.id, formData);
      onClose();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la transacción.",
      );
    } finally {
      setIsPending(false);
    }
  };

  const dateValue = new Date(transaction.date).toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-bold mb-4">Editar Movimiento</h2>

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
              defaultValue={transaction.description}
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
                defaultValue={transaction.amount}
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
                defaultValue={dateValue}
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
              defaultValue={transaction.accountId}
              className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black bg-white"
            >
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
              defaultValue={transaction.categoryId ?? ""}
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
            {isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
