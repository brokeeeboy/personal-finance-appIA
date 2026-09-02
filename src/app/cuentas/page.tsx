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
    <div className="flex min-h-screen bg-slate-950">
      <Navigation />
      <main className="flex-1 md:ml-64 p-6 md:p-8 pb-24 md:pb-8">
        <div className="flex justify-between items-end mb-8 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">
              Cuentas
            </p>
            <h1 className="text-3xl font-bold text-white mt-2">Mis Cuentas</h1>
            <p className="text-slate-400 mt-1">
              Administra tus tarjetas, cuentas bancarias y efectivo.
            </p>
          </div>
          <NewAccountForm />
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/70 rounded-2xl border border-dashed border-slate-700">
            <p className="text-slate-400 mb-4">
              Aún no tienes cuentas registradas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={{
                  ...account,
                  balance: Number(account.balance),
                  creditLimit: account.creditLimit
                    ? Number(account.creditLimit)
                    : null,
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
