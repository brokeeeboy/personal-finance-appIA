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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-black text-white rounded-full mb-4">
            <Wallet size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Manager</h1>
          <p className="text-gray-500 text-sm mt-2">Inicia sesión en tu cuenta</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input name="email" type="email" defaultValue="admin@portafolio.com" required className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-black transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input name="password" type="password" defaultValue="123456" required className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-black transition-colors" />
          </div>
          <button type="submit" className="w-full bg-black text-white p-3 rounded-lg font-medium hover:bg-gray-800 transition-colors mt-2">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
