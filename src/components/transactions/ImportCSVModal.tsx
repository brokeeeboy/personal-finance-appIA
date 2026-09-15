"use client";

import { useState } from "react";
import { Upload, X, Check, AlertTriangle } from "lucide-react";
import { previewCSV, saveImportedTransactions } from "@/actions/importActions";

interface Props {
  accounts: { id: string; name: string }[];
}

type PreviewTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  categoryName: string;
  isAutoCategorized: boolean;
  isDuplicate: boolean;
  type: "INCOME" | "EXPENSE";
  categoryId?: string | null;
};

export default function ImportCSVModal({ accounts }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isPending, setIsPending] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewTransaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    try {
      const data = await previewCSV(formData);
      setPreviewData(
        data.map((transaction) => ({
          ...transaction,
          id: transaction.id ?? crypto.randomUUID(),
          categoryName: transaction.categoryName ?? "Sin categoría",
          isAutoCategorized: transaction.isAutoCategorized ?? false,
          isDuplicate: transaction.isDuplicate ?? false,
        })),
      );
      setStep(2);
    } catch {
      alert("Error al procesar el archivo CSV");
    } finally {
      setIsPending(false);
    }
  };

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      const res = await saveImportedTransactions(selectedAccount, previewData);
      alert(`Se importaron ${res.count} transacciones exitosamente.`);
      setIsOpen(false);
      setStep(1);
      setPreviewData([]);
    } catch {
      alert("Error al guardar las transacciones");
    } finally {
      setIsPending(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors"
      >
        <Upload size={20} /> Importar CSV
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-6 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => {
                setIsOpen(false);
                setStep(1);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
            >
              <X size={24} />
            </button>

            <h2 className="text-xl font-bold mb-4">
              {step === 1
                ? "Importar Movimientos"
                : "Vista Previa de Importación"}
            </h2>

            {step === 1 ? (
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cuenta de destino
                  </label>
                  <select
                    name="accountId"
                    required
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
                  >
                    <option value="">Selecciona una cuenta</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
                  <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-sm text-gray-600 mb-4">
                    Sube tu archivo CSV del banco
                  </p>
                  <input
                    type="file"
                    name="file"
                    accept=".csv"
                    required
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-4">
                    Formato esperado: fecha,descripcion,monto
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isPending || !selectedAccount}
                  className="w-full bg-black text-white p-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 mt-2"
                >
                  {isPending ? "Procesando..." : "Analizar Archivo"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="overflow-y-auto flex-1 border border-gray-200 rounded-lg mb-4">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                      <tr>
                        <th className="p-3 font-medium text-gray-500">Fecha</th>
                        <th className="p-3 font-medium text-gray-500">
                          Descripción
                        </th>
                        <th className="p-3 font-medium text-gray-500">
                          Categoría Detectada
                        </th>
                        <th className="p-3 font-medium text-gray-500 text-right">
                          Monto
                        </th>
                        <th className="p-3 font-medium text-center text-gray-500">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {previewData.map((t) => (
                        <tr
                          key={t.id}
                          className={
                            t.isDuplicate ? "bg-red-50/50 opacity-60" : ""
                          }
                        >
                          <td className="p-3">{t.date}</td>
                          <td className="p-3 font-medium text-gray-900">
                            {t.description}
                          </td>
                          <td className="p-3">
                            {t.isAutoCategorized ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium flex items-center w-max gap-1">
                                <Check size={12} /> {t.categoryName}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">
                                {t.categoryName}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-medium text-gray-900">
                            {formatCurrency(t.amount)}
                          </td>
                          <td className="p-3 text-center">
                            {t.isDuplicate ? (
                              <span
                                className="text-red-600 text-xs flex items-center justify-center gap-1"
                                title="Ya existe en la base de datos"
                              >
                                <AlertTriangle size={14} /> Duplicado
                              </span>
                            ) : (
                              <span className="text-green-600">
                                <Check size={16} className="mx-auto" />
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Se importarán{" "}
                    <span className="font-bold">
                      {previewData.filter((t) => !t.isDuplicate).length}
                    </span>{" "}
                    transacciones.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={isPending}
                      className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                    >
                      {isPending ? "Guardando..." : "Confirmar Importación"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
