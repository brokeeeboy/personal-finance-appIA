"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { deleteCategory } from "@/actions/categoryActions";
import CategoryFormModal from "./CategoryFormModal";

interface Category {
  id: string;
  name: string;
  color: string | null;
  transactionCount: number;
}

export default function CategoryList({
  categories,
}: {
  categories: Category[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Category | null | "new">(null);

  const handleDelete = (category: Category) => {
    const warning =
      category.transactionCount > 0
        ? `"${category.name}" tiene ${category.transactionCount} transacción(es) asociada(s), que quedarán sin categoría. ¿Eliminar de todas formas?`
        : `¿Eliminar la categoría "${category.name}"?`;
    if (confirm(warning)) {
      startTransition(() => {
        deleteCategory(category.id);
      });
    }
  };

  return (
    <>
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setEditing("new")}
          className="bg-black text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Plus size={20} /> Nueva categoría
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/70 rounded-2xl border border-dashed border-slate-700">
          <p className="text-slate-400 mb-4">
            Aún no tienes categorías. Créalas para organizar tus
            transacciones.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${category.color || "#6366f1"}22`,
                    color: category.color || "#6366f1",
                  }}
                >
                  <Tag size={16} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">
                    {category.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {category.transactionCount} transacción(es)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setEditing(category)}
                  className="text-slate-400 hover:text-cyan-400 p-2 transition-colors"
                  title="Editar categoría"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  disabled={isPending}
                  className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                  title="Eliminar categoría"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <CategoryFormModal
          category={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
