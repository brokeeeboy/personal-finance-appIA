"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { updateAccount } from "@/actions/accountActions";

interface Account {
  id: string;
  name: string;
  type: string;
  bankName: string | null;
  lastFour: string | null;
  balance: number;
  creditLimit: number | null;
  billingDay: number | null;
  paymentDay: number | null;
}

export default function EditAccountModal({
  account,
  onClose,
}: {
  account: Account;
  onClose: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const isCredit = account.type === "CREDIT";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);

    try {
      await updateAccount(account.id, formData);
      onClose();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la cuenta.",
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

        <h2 className="text-xl font-bold mb-4">Editar cuenta</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre personalizado
            </label>
            <input
              name="name"
              type="text"
              required
              defaultValue={account.name}
              className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banco (Opcional)
              </label>
              <input
                name="bankName"
                type="text"
                defaultValue={account.bankName ?? ""}
                className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Últimos 4 dígitos
              </label>
              <input
                name="lastFour"
                type="text"
                maxLength={4}
                pattern="\d{4}"
                defaultValue={account.lastFour ?? ""}
                className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isCredit ? "Saldo Utilizado (Deuda)" : "Saldo Actual"}
            </label>
            <input
              name="balance"
              type="number"
              step="0.01"
              required
              defaultValue={account.balance}
              className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
            />
            <p className="text-xs text-gray-400 mt-1">
              Esto ajusta el saldo directamente; úsalo solo para corregir un
              error, no para registrar un movimiento nuevo.
            </p>
          </div>

          {isCredit && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Límite de Crédito (Cupo)
                </label>
                <input
                  name="creditLimit"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={account.creditLimit ?? undefined}
                  className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Día de facturación
                  </label>
                  <input
                    name="billingDay"
                    type="number"
                    min={1}
                    max={31}
                    required
                    defaultValue={account.billingDay ?? undefined}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Día de pago
                  </label>
                  <input
                    name="paymentDay"
                    type="number"
                    min={1}
                    max={31}
                    required
                    defaultValue={account.paymentDay ?? undefined}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
                  />
                </div>
              </div>
            </>
          )}

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
