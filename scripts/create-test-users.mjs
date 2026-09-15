import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL no está definida");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const users = [
  { name: "Bastian", email: "bastian@finance.local" },
  { name: "Jonathan", email: "jonathan@finance.local" },
];

for (const userData of users) {
  const passwordHash = await bcrypt.hash("123456", 10);
  const user = await prisma.user.upsert({
    where: { email: userData.email },
    update: { name: userData.name, password: passwordHash },
    create: {
      name: userData.name,
      email: userData.email,
      password: passwordHash,
    },
  });

  console.log(`OK ${user.name} <${user.email}> password=123456`);
}

await prisma.$disconnect();
