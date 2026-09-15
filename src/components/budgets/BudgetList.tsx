"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { deleteBudget } from "@/actions/budgetActions";
import BudgetFormModal from "./BudgetFormModal";

export interface BudgetItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  budgetId: string | null;
  budgetAmount: number | null;
  spent: number;
}

interface Props {
  items: BudgetItem[];
  month: number;
  year: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(amount);

function progressColor(percentage: number) {
  if (percentage >= 100) return "bg-red-500";
  if (percentage >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function BudgetList({ items, month, year }: Props) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<BudgetItem | null>(null);

  const withBudget = items.filter((item) => item.budgetAmount !== null);
  const withoutBudget = items.filter((item) => item.budgetAmount === null);

  const handleDelete = (item: BudgetItem) => {
    if (!item.budgetId) return;
    if (confirm(`¿Quitar el presupuesto de "${item.categoryName}"?`)) {
      startTransition(() => {
        deleteBudget(item.budgetId!);
      });
    }
  };

  return (
    <>
      {withBudget.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/70 rounded-2xl border border-dashed border-slate-700 mb-6">
          <p className="text-slate-400">
            No tienes presupuestos definidos para este mes. Asigna uno a una
            categoría más abajo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {withBudget.map((item) => {
            const percentage = item.budgetAmount
              ? Math.min((item.spent / item.budgetAmount) * 100, 999)
              : 0;
            const over = item.budgetAmount !== null && item.spent > item.budgetAmount;

            return (
              <div
                key={item.categoryId}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: item.categoryColor || "#6366f1",
                      }}
                    />
                    <p className="font-medium text-white truncate">
                      {item.categoryName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(item)}
                      className="text-slate-400 hover:text-cyan-400 p-1.5"
                      title="Editar presupuesto"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={isPending}
                      className="text-slate-400 hover:text-red-500 p-1.5"
                      title="Quitar presupuesto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-1.5">
                  <span
                    className={over ? "text-red-400 font-medium" : "text-slate-300"}
                  >
                    {formatCurrency(item.spent)}
                  </span>
                  <span className="text-slate-500">
                    de {formatCurrency(item.budgetAmount ?? 0)}
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${progressColor(percentage)}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>

                {over && (
                  <p className="text-xs text-red-400 mt-1.5">
                    Superaste el presupuesto por{" "}
                    {formatCurrency(item.spent - (item.budgetAmount ?? 0))}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {withoutBudget.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Sin presupuesto asignado
          </h2>
          <div className="flex flex-wrap gap-2">
            {withoutBudget.map((item) => (
              <button
                key={item.categoryId}
                onClick={() => setEditing(item)}
                className="flex items-center gap-2 text-sm text-slate-200 bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 rounded-lg px-3 py-2 transition-colors"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.categoryColor || "#6366f1" }}
                />
                {item.categoryName}
                <Plus size={14} className="text-slate-500" />
              </button>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <BudgetFormModal
          categoryId={editing.categoryId}
          categoryName={editing.categoryName}
          month={month}
          year={year}
          currentAmount={editing.budgetAmount ?? undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
