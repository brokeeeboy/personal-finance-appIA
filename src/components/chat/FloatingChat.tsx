"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User } from "lucide-react";
import {
  processChatMessage,
  type ChatHistoryMessage,
} from "@/actions/chatActions";

type Message = { role: "user" | "ai"; text: string };

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "¡Hola! Dime qué gastaste, a quién le prestaste dinero o cuánto ahorraste hoy.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setIsLoading(true);

    try {
      const history: ChatHistoryMessage[] = messages.slice(-8);
      const response = await processChatMessage(userText, history);
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
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 md:bottom-8 right-4 md:right-8 p-4 bg-black text-white rounded-full shadow-2xl hover:scale-105 transition-transform z-50 ${isOpen ? "hidden" : "block"}`}
      >
        <MessageSquare size={24} />
      </button>

      {/* Ventana de Chat */}
      {isOpen && (
        <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 w-full max-w-[350px] h-[500px] bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <span className="font-bold">Asistente AI</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-300 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-800">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "ai" && (
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0">
                    <Bot size={16} />
                  </div>
                )}

                <div
                  className={`p-3 rounded-2xl max-w-[75%] text-sm ${msg.role === "user" ? "bg-gray-700 text-white rounded-tr-sm" : "bg-gray-700 border border-gray-600 text-gray-200 rounded-tl-sm"}`}
                >
                  {msg.text}
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 bg-gray-500 text-gray-200 rounded-full flex items-center justify-center shrink-0">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="p-3 bg-gray-700 border border-gray-600 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-gray-800 border-t border-gray-700 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej: Gasté 5000 en el cine..."
              className="flex-1 bg-gray-700 rounded-full px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-gray-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:bg-gray-500 transition-colors"
            >
              <Send size={16} className="-ml-0.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
