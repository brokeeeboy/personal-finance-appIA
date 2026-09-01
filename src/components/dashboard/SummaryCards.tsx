import { Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface SummaryCardsProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

export default function SummaryCards({ totalBalance, monthlyIncome, monthlyExpenses }: SummaryCardsProps) {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const available = monthlyIncome - monthlyExpenses;

  const cards = [
    { title: "Saldo Total", amount: totalBalance, icon: Wallet, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Ingresos del Mes", amount: monthlyIncome, icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
    { title: "Gastos del Mes", amount: monthlyExpenses, icon: TrendingDown, color: "text-red-600", bg: "bg-red-100" },
    { title: "Disponible del Mes", amount: available, icon: DollarSign, color: "text-purple-600", bg: "bg-purple-100" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`p-4 rounded-full ${card.bg} ${card.color}`}>
              <Icon size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(card.amount)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
