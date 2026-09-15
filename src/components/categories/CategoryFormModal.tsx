"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createCategory, updateCategory } from "@/actions/categoryActions";

const DEFAULT_COLORS = [
  "#f97316",
  "#3b82f6",
  "#eab308",
  "#8b5cf6",
  "#22c55e",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
];

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface Props {
  category?: Category;
  onClose: () => void;
}

export default function CategoryFormModal({ category, onClose }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [color, setColor] = useState(category?.color || DEFAULT_COLORS[0]);
  const isEditing = Boolean(category);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);

    try {
      if (isEditing && category) {
        await updateCategory(category.id, formData);
      } else {
        await createCategory(formData);
      }
      onClose();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la categoría.",
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

        <h2 className="text-xl font-bold mb-4">
          {isEditing ? "Editar categoría" : "Nueva categoría"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              name="name"
              type="text"
              required
              maxLength={50}
              defaultValue={category?.name}
              placeholder="Ej: Alimentación"
              className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <input type="hidden" name="color" value={color} />
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    color === c
                      ? "border-black scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Elegir color ${c}`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-black text-white p-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 mt-2"
          >
            {isPending ? "Guardando..." : "Guardar categoría"}
          </button>
        </form>
      </div>
    </div>
  );
}
