import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL no está definido");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const email = "admin@portafolio.com";
const password = "123456";

try {
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  const hashedPassword = await bcrypt.hash(password, 10);

  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        name: "Usuario Demo",
        password: hashedPassword,
        role: "ADMIN",
      },
    });
    console.log("✅ Usuario admin creado correctamente");
  } else {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: "Usuario Demo",
        password: hashedPassword,
        role: "ADMIN",
      },
    });
    console.log("✅ Usuario admin actualizado correctamente");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, name: true },
  });

  console.log("Usuario activo:", user);
} catch (error) {
  console.error("Error creando admin:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
