"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyTrendPoint } from "@/lib/trend";

export default function TrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  const hasMovement = data.some((point) => point.income || point.expense);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      notation: "compact",
    }).format(value);

  return (
    <div className="bg-slate-900/80 p-6 rounded-2xl shadow-xl shadow-slate-950/30 border border-slate-800 h-72 flex flex-col">
      <h3 className="text-lg font-bold text-white mb-4">Tendencia mensual</h3>
      {!hasMovement ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Aún no hay suficientes movimientos para mostrar una tendencia.
        </div>
      ) : (
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.15)"
              />
              <XAxis
                dataKey="month"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={formatCurrency}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: "12px",
                  color: "#e2e8f0",
                }}
                formatter={(value) => formatCurrency(Number(value ?? 0))}
              />
              <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="income"
                name="Ingresos"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                name="Gastos"
                stroke="#f87171"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
