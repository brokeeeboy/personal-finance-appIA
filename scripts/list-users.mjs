import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const users = await prisma.user.findMany({
  select: { name: true, email: true },
  orderBy: { createdAt: 'asc' },
});

console.log(JSON.stringify(users, null, 2));
await prisma.$disconnect();
