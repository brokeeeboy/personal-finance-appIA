"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface ExpenseData {
  name: string;
  value: number;
  color: string;
}

export default function ExpenseChart({ data }: { data: ExpenseData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-900/80 rounded-2xl border border-slate-800">
        No hay gastos este mes
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 p-6 rounded-2xl shadow-xl shadow-slate-950/30 border border-slate-800 h-96 flex flex-col">
      <h3 className="text-lg font-bold text-white mb-4">
        Gastos por Categoría
      </h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || "#cbd5e1"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid rgba(148,163,184,0.2)",
                borderRadius: "12px",
                color: "#e2e8f0",
              }}
              formatter={(value) => {
                const numericValue = Array.isArray(value)
                  ? Number(value[0] ?? 0)
                  : Number(value ?? 0);
                return new Intl.NumberFormat("es-CL", {
                  style: "currency",
                  currency: "CLP",
                }).format(numericValue);
              }}
            />
            <Legend wrapperStyle={{ color: "#cbd5e1" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
