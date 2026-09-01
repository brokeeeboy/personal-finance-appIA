import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Corregido a lib/auth
import { redirect } from "next/navigation";
import Navigation from "@/components/layout/Navigation";
import { prisma } from "@/lib/prisma";
import NewGoalForm from "@/components/goals/NewGoalForm";
import GoalCard from "@/components/goals/GoalCard";
import { Trophy } from "lucide-react";

export default async function GoalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    orderBy: { targetDate: "asc" },
  });

  const completedGoals = goals.filter(
    (g: { currentAmount: number; targetAmount: number }) =>
      g.currentAmount >= g.targetAmount,
  ).length;
  const totalGoals = goals.length;

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Navigation />
      <main className="flex-1 md:ml-64 p-6 md:p-8 pb-24 md:pb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Metas de Ahorro
            </h1>
            <p className="text-gray-500">
              Planifica tus próximos grandes pasos financieros.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {totalGoals > 0 && (
              <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg font-medium text-sm">
                <Trophy size={18} />
                <span>
                  {completedGoals} de {totalGoals} logradas
                </span>
              </div>
            )}
            <NewGoalForm />
          </div>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">
              Aún no has definido ninguna meta.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
