"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CreditCard,
  ArrowRightLeft,
  Target,
  HandCoins,
  LogOut,
  Wallet,
} from "lucide-react";
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
      <aside className="hidden md:flex flex-col w-64 h-screen bg-slate-900/90 border-r border-slate-800 fixed left-0 top-0 backdrop-blur-sm">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Wallet size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl text-white">FinanceApp</span>
        </div>
        <nav className="flex-1 px-3 space-y-1 mt-4">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-white border border-cyan-500/30 shadow-lg shadow-cyan-950/30"
                    : "text-slate-200 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <Icon size={20} className="text-current" />
                <span className="font-medium text-current">{link.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl w-full transition-colors font-medium"
          >
            <LogOut size={20} />
            Salir
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/95 border-t border-slate-800 flex justify-around p-3 pb-safe z-50 backdrop-blur-sm">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex flex-col items-center p-2 rounded-lg ${isActive ? "text-cyan-300" : "text-slate-200"}`}
            >
              <Icon size={24} className="text-current" />
              <span className="text-[10px] mt-1 font-medium text-current">
                {link.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
