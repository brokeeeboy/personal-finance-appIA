"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Search, X } from "lucide-react";

interface Props {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

export default function TransactionFilters({ accounts, categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const currentAccountId = searchParams.get("accountId") ?? "";
  const currentCategoryId = searchParams.get("categoryId") ?? "";
  const currentFrom = searchParams.get("from") ?? "";
  const currentTo = searchParams.get("to") ?? "";

  const hasActiveFilters =
    currentAccountId || currentCategoryId || currentFrom || currentTo || q;

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page"); // cualquier cambio de filtro reinicia la paginación
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("q", q.trim());
  };

  const clearFilters = () => {
    setQ("");
    const params = new URLSearchParams(searchParams.toString());
    ["accountId", "categoryId", "from", "to", "q", "page"].forEach((key) =>
      params.delete(key),
    );
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const exportHref = `/api/transactions/export?${searchParams.toString()}`;

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3 mb-6">
      <form
        onSubmit={handleSearchSubmit}
        className="flex items-center gap-2 flex-1 min-w-[180px]"
      >
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar descripción..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
          />
        </div>
      </form>

      <select
        value={currentAccountId}
        onChange={(e) => updateParam("accountId", e.target.value)}
        className="text-sm rounded-lg bg-slate-950 border border-slate-700 text-white px-3 py-2 outline-none focus:border-cyan-500"
      >
        <option value="">Todas las cuentas</option>
        {accounts.map((acc) => (
          <option key={acc.id} value={acc.id}>
            {acc.name}
          </option>
        ))}
      </select>

      <select
        value={currentCategoryId}
        onChange={(e) => updateParam("categoryId", e.target.value)}
        className="text-sm rounded-lg bg-slate-950 border border-slate-700 text-white px-3 py-2 outline-none focus:border-cyan-500"
      >
        <option value="">Todas las categorías</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={currentFrom}
          onChange={(e) => updateParam("from", e.target.value)}
          className="text-sm rounded-lg bg-slate-950 border border-slate-700 text-white px-2.5 py-2 outline-none focus:border-cyan-500"
        />
        <span className="text-slate-500 text-sm">–</span>
        <input
          type="date"
          value={currentTo}
          onChange={(e) => updateParam("to", e.target.value)}
          className="text-sm rounded-lg bg-slate-950 border border-slate-700 text-white px-2.5 py-2 outline-none focus:border-cyan-500"
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            disabled={isPending}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-2"
            title="Limpiar filtros"
          >
            <X size={14} /> Limpiar
          </button>
        )}
        <a
          href={exportHref}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-2 transition-colors"
        >
          <Download size={15} /> CSV
        </a>
      </div>
    </div>
  );
}
