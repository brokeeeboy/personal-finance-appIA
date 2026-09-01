import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navigation from "@/components/layout/Navigation";
import { prisma } from "@/lib/prisma";
import NewAccountForm from "@/components/accounts/NewAccountForm";
import AccountCard from "@/components/accounts/AccountCard";

export default async function AccountsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    orderBy: { type: "asc" },
  });

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Navigation />
      <main className="flex-1 md:ml-64 p-6 md:p-8 pb-24 md:pb-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Mis Cuentas
            </h1>
            <p className="text-gray-500">
              Administra tus tarjetas, cuentas bancarias y efectivo.
            </p>
          </div>
          <NewAccountForm />
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">
              Aún no tienes cuentas registradas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
