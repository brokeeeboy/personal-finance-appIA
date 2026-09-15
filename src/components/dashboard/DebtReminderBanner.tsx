import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface DebtReminder {
  id: string;
  personName: string;
  amount: number;
  type: string;
  dueDate: Date | null;
}

export default function DebtReminderBanner({
  debts,
}: {
  debts: DebtReminder[];
}) {
  if (debts.length === 0) return null;

  const now = new Date();
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);

  const overdueCount = debts.filter(
    (d) => d.dueDate && new Date(d.dueDate) < now,
  ).length;

  return (
    <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
      <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-200">
          {debts.length === 1
            ? "Tienes 1 deuda por vencer"
            : `Tienes ${debts.length} deudas por vencer${overdueCount ? ` (${overdueCount} vencida${overdueCount === 1 ? "" : "s"})` : ""}`}
        </p>
        <ul className="mt-1.5 space-y-1 text-sm text-amber-100/90">
          {debts.slice(0, 3).map((debt) => {
            const isOverdue = debt.dueDate && new Date(debt.dueDate) < now;
            return (
              <li key={debt.id} className="truncate">
                {debt.type === "OWE_ME"
                  ? `${debt.personName} te debe`
                  : `Le debes a ${debt.personName}`}{" "}
                <span className="font-medium">
                  {formatCurrency(debt.amount)}
                </span>
                {" — "}
                <span
                  className={
                    isOverdue ? "text-red-300 font-medium" : "text-amber-300"
                  }
                >
                  {isOverdue
                    ? "vencida"
                    : `vence ${new Date(debt.dueDate!).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}`}
                </span>
              </li>
            );
          })}
        </ul>
        {debts.length > 3 && (
          <p className="text-xs text-amber-300/70 mt-1">
            +{debts.length - 3} más
          </p>
        )}
      </div>
      <Link
        href="/deudas"
        className="text-xs font-medium text-amber-200 hover:text-white underline shrink-0 mt-0.5"
      >
        Ver deudas
      </Link>
    </div>
  );
}
