import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rateLimit";

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password).trim();

        // Limita intentos por correo (no por IP) para frenar fuerza bruta
        // sin depender de infraestructura extra; ver la nota en rateLimit.ts
        // sobre las limitaciones de un contador en memoria.
        const rateLimit = checkRateLimit(
          `login:${email}`,
          LOGIN_ATTEMPT_LIMIT,
          LOGIN_ATTEMPT_WINDOW_MS,
        );
        if (!rateLimit.allowed) {
          const minutes = Math.max(1, Math.ceil(rateLimit.retryAfterMs / 60_000));
          throw new Error(
            `Demasiados intentos. Espera ${minutes} minuto${minutes === 1 ? "" : "s"} y vuelve a intentar.`,
          );
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const role = (user as { role?: "ADMIN" | "USER" }).role ?? "USER";
        token.role = role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        const currentUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { role: true },
        });
        session.user.role = currentUser?.role ?? "USER";
      }
      return session;
    },
  },
};
