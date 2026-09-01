"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wallet } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const res = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (res?.error) {
      setError("Credenciales inválidas");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full p-8 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl shadow-slate-950/50 backdrop-blur-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-full mb-4 shadow-lg shadow-cyan-500/30">
            <Wallet size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Finance Manager</h1>
          <p className="text-slate-400 text-sm mt-2">
            Inicia sesión en tu cuenta
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Correo electrónico
            </label>
            <input
              name="email"
              type="email"
              defaultValue="admin@portafolio.com"
              required
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Contraseña
            </label>
            <input
              name="password"
              type="password"
              defaultValue="123456"
              required
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-3 rounded-lg font-medium hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 mt-2"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
