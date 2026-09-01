"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, ArrowUpRight, ArrowDownRight, Wallet, Zap } from "lucide-react";
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

export default function DashboardChat({ userName, totalBalance, monthlyIncome, monthlyExpenses }: Props) {
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
        { role: "ai", text: "Uy, algo falló en mi circuito. Intenta de nuevo." },
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
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="flex flex-col h-full">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col gap-1">
          <span className="text-xs text-gray-400 flex items-center gap-1"><Wallet size={12} /> Balance total</span>
          <span className={`text-xl font-bold ${totalBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrency(totalBalance)}
          </span>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col gap-1">
          <span className="text-xs text-gray-400 flex items-center gap-1"><ArrowUpRight size={12} className="text-emerald-400" /> Ingresos</span>
          <span className="text-xl font-bold text-emerald-400">{formatCurrency(monthlyIncome)}</span>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col gap-1">
          <span className="text-xs text-gray-400 flex items-center gap-1"><ArrowDownRight size={12} className="text-red-400" /> Gastos</span>
          <span className="text-xl font-bold text-red-400">{formatCurrency(monthlyExpenses)}</span>
        </div>
      </div>

      {/* Chat container */}
      <div className="flex-1 flex flex-col bg-gray-800 border border-gray-700 rounded-3xl overflow-hidden">
        {/* Chat header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Asistente Financiero IA</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block"></span> En línea
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-gray-700 rounded-full px-3 py-1">
            <Zap size={12} className="text-yellow-400" />
            <span className="text-xs text-gray-300">DeepSeek AI</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "ai" && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={16} className="text-white" />
                </div>
              )}
              <div
                className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm"
                    : "bg-gray-700 text-gray-100 rounded-tl-sm border border-gray-600"
                }`}
              >
                {msg.text}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <User size={16} className="text-gray-300" />
                </div>
              )}
            </div>
          ))}

          {/* Loading dots */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={16} className="text-white" />
              </div>
              <div className="px-4 py-4 bg-gray-700 border border-gray-600 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="px-6 pb-3 flex gap-2 flex-wrap">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-white rounded-full px-3 py-1.5 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ej: Gasté 12.500 en el supermercado con la Visa..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded-2xl px-5 py-3 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-2xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/30"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
