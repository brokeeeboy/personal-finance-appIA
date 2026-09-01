"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Zap,
} from "lucide-react";
import { processChatMessage } from "@/actions/chatActions";

type Message = { role: "user" | "ai"; text: string };

const SUGGESTIONS = [
  "Gasté 8500 en el almuerzo de hoy",
  "Me pagaron el arriendo, 350.000 pesos",
  "Le presté 20.000 a Juan",
  "Ahorré 50.000 para mi meta de vacaciones",
];

interface Props {
  userName: string;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

export default function DashboardChat({
  userName,
  totalBalance,
  monthlyIncome,
  monthlyExpenses,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: `¡Hola, ${userName}! 👋 Soy tu asistente financiero inteligente. Puedes decirme en lenguaje natural lo que gastaste, lo que ganaste, lo que ahoraste o lo que le prestaste a alguien y yo lo registro automáticamente.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setIsLoading(true);

    try {
      const response = await processChatMessage(text);
      setMessages((prev) => [...prev, { role: "ai", text: response.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Uy, algo falló en mi circuito. Intenta de nuevo.",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input.trim());
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.6)] backdrop-blur-sm">
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400 flex items-center gap-1.5">
            <Wallet size={12} className="text-cyan-400" /> Balance total
          </span>
          <span
            className={`mt-3 block text-xl font-bold ${totalBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}
          >
            {formatCurrency(totalBalance)}
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-800 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.6)] backdrop-blur-sm">
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400 flex items-center gap-1.5">
            <ArrowUpRight size={12} className="text-emerald-400" /> Ingresos
          </span>
          <span className="mt-3 block text-xl font-bold text-emerald-400">
            {formatCurrency(monthlyIncome)}
          </span>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-slate-900 to-slate-800 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.6)] backdrop-blur-sm">
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400 flex items-center gap-1.5">
            <ArrowDownRight size={12} className="text-red-400" /> Gastos
          </span>
          <span className="mt-3 block text-xl font-bold text-red-400">
            {formatCurrency(monthlyExpenses)}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900/80 shadow-[0_24px_60px_rgba(2,6,23,0.7)] backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 shadow-[0_0_20px_rgba(56,189,248,0.4)]">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">
              Asistente Financiero IA
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />{" "}
              En línea
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-200">
            <Zap size={11} className="text-amber-300" /> DeepSeek AI
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "ai" && (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 shadow-[0_0_18px_rgba(96,165,250,0.4)]">
                  <Bot size={15} className="text-white" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
                  msg.role === "user"
                    ? "rounded-tr-md bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-900/30"
                    : "rounded-tl-md border border-slate-700 bg-slate-800/90 text-slate-100"
                }`}
              >
                {msg.text}
              </div>

              {msg.role === "user" && (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-200">
                  <User size={15} />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 shadow-[0_0_18px_rgba(96,165,250,0.4)]">
                <Bot size={15} className="text-white" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-slate-700 bg-slate-800/90 px-4 py-4">
                <span
                  className="h-2 w-2 animate-bounce rounded-full bg-cyan-400"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="h-2 w-2 animate-bounce rounded-full bg-cyan-400"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="h-2 w-2 animate-bounce rounded-full bg-cyan-400"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 border-t border-slate-800 px-5 pb-4 pt-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-[11px] text-slate-200 transition-all hover:border-cyan-500/40 hover:bg-slate-800 hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex gap-3 border-t border-slate-800 bg-slate-900/80 p-4"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ej: Gasté 12.500 en el supermercado con la Visa..."
            className="flex-1 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-[0_12px_30px_rgba(14,165,233,0.4)] transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
