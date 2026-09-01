"use client";

import { useState } from "react";
import { createAccount } from "@/actions/accountActions";
import { Plus, X } from "lucide-react";

export default function NewAccountForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState("DEBIT");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);

    await createAccount(formData);

    setIsPending(false);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-black text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors"
      >
        <Plus size={20} />
        Nueva Cuenta
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

            <h2 className="text-xl font-bold mb-4">Agregar Cuenta / Tarjeta</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Cuenta
                </label>
                <select
                  name="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
                >
                  <option value="CHECKING">Cuenta Corriente</option>
                  <option value="DEBIT">Cuenta Vista / Débito</option>
                  <option value="CREDIT">Tarjeta de Crédito</option>
                  <option value="CASH">Efectivo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre personalizado
                </label>
                <input
                  name="name"
                  type="text"
                  placeholder="Ej: Visa Santander"
                  required
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
                    placeholder="Ej: Santander"
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
                    placeholder="Ej: 4821"
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {type === "CREDIT"
                    ? "Saldo Utilizado (Deuda)"
                    : "Saldo Actual"}
                </label>
                <input
                  name="balance"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={0}
                  className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
                />
              </div>

              {type === "CREDIT" && (
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
                        placeholder="12"
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
                        placeholder="28"
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
                {isPending ? "Guardando..." : "Guardar Cuenta"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
