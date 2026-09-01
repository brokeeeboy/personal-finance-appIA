"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CreditCard, ArrowRightLeft, Target, HandCoins, LogOut, Wallet } from "lucide-react";
import { signOut } from "next-auth/react";

const links = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Transacciones", href: "/transacciones", icon: ArrowRightLeft },
  { name: "Cuentas", href: "/cuentas", icon: CreditCard },
  { name: "Deudas", href: "/deudas", icon: HandCoins },
  { name: "Metas", href: "/metas", icon: Target },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen bg-gray-900 border-r border-gray-800 fixed left-0 top-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Wallet size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl text-white">FinanceApp</span>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-900/30"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{link.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-950/40 rounded-xl w-full transition-colors font-medium"
          >
            <LogOut size={20} />
            Salir
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-gray-900 border-t border-gray-800 flex justify-around p-3 pb-safe z-50">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex flex-col items-center p-2 rounded-lg ${isActive ? "text-blue-400" : "text-gray-500"}`}
            >
              <Icon size={24} />
              <span className="text-[10px] mt-1 font-medium">{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

