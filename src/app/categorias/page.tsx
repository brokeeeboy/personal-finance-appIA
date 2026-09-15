import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navigation from "@/components/layout/Navigation";
import { prisma } from "@/lib/prisma";
import CategoryList from "@/components/categories/CategoryList";

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { transactions: true } } },
  });

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Navigation />
      <main className="flex-1 md:ml-64 p-6 md:p-8 pb-24 md:pb-8">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">
            Categorías
          </p>
          <h1 className="text-3xl font-bold text-white mt-2">
            Mis Categorías
          </h1>
          <p className="text-slate-400 mt-1">
            Organiza tus transacciones y mejora la categorización automática.
          </p>
        </div>

        <CategoryList
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
            color: category.color,
            transactionCount: category._count.transactions,
          }))}
        />
      </main>
    </div>
  );
}
