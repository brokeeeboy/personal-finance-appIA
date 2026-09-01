import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createUser, deleteUser } from "@/actions/adminActions";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
            Panel administrador
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white">
            Crear nuevo usuario
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Este usuario solo puede crear más usuarios y no tiene acceso a la
            app normal.
          </p>

          <form action={createUser} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Nombre completo
              </label>
              <input
                name="name"
                type="text"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Correo electrónico
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-semibold text-white transition hover:from-cyan-400 hover:to-blue-500"
            >
              Crear usuario
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Usuarios
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Usuarios registrados
              </h2>
            </div>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-300">
              {users.length} total
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-950/70 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Correo</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Creado</th>
                  <th className="px-4 py-3 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                {users.map((user) => {
                  const isProtected =
                    user.role === "ADMIN" || user.id === session.user.id;

                  return (
                    <tr key={user.id} className="text-slate-200">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">
                          {user.name || "Sin nombre"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            user.role === "ADMIN"
                              ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                              : "border border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {new Date(user.createdAt).toLocaleDateString("es-CL")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isProtected ? (
                          <span className="text-xs text-slate-500">
                            protegido
                          </span>
                        ) : (
                          <form action={deleteUser}>
                            <input type="hidden" name="id" value={user.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
                              aria-label={`Eliminar usuario ${user.name || user.email}`}
                            >
                              Eliminar
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
