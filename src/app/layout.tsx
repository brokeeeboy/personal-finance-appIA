import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";
import "./globals.css";
import { authOptions } from "@/lib/auth";
import AppSessionProvider from "@/components/providers/SessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Personal Finance Manager",
  description: "Gestor de finanzas para portafolio",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="es">
      <body
        className={`${inter.className} min-h-screen bg-slate-950 text-slate-100 antialiased`}
      >
        <AppSessionProvider session={session}>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
