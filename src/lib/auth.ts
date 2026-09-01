import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

        let user = await prisma.user.findUnique({
          where: { email },
        });

        const isDefaultAdmin =
          email === "admin@portafolio.com" && password === "123456";

        if (
          isDefaultAdmin &&
          (!user || !user.password || user.role !== "ADMIN")
        ) {
          const hashedPassword = await bcrypt.hash(password, 10);

          user = await prisma.user.upsert({
            where: { email },
            update: {
              name: "Usuario Demo",
              password: hashedPassword,
              role: "ADMIN",
            },
            create: {
              email,
              name: "Usuario Demo",
              password: hashedPassword,
              role: "ADMIN",
            },
          });
        }

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          if (isDefaultAdmin) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user = await prisma.user.upsert({
              where: { email },
              update: {
                name: "Usuario Demo",
                password: hashedPassword,
                role: "ADMIN",
              },
              create: {
                email,
                name: "Usuario Demo",
                password: hashedPassword,
                role: "ADMIN",
              },
            });
            return {
              id: user.id,
              email: user.email,
              name: user.name ?? user.email,
              role: user.role,
            };
          }
          return null;
        }

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
        const role = (token.role as "ADMIN" | "USER" | undefined) ?? "USER";
        session.user.role = role;
      }
      return session;
    },
  },
};
