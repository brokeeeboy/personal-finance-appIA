import { prisma } from './src/lib/prisma';
import { getServerSession } from "next-auth";

async function test() {
  try {
    const accounts = await prisma.account.findMany();
    console.log("Accounts:", accounts);
  } catch (e) {
    console.error("DB Error:", e);
  }
}
test();
