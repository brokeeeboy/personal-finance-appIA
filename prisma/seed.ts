import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Iniciando seed...");

  // 1. Limpiar base de datos (cuidado en producción, esto es solo para el seed local)
  await prisma.goalContribution.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.debt.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.categoryRule.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // 2. Crear usuario
  const hashedPassword = await bcrypt.hash("123456", 10);
  const user = await prisma.user.create({
    data: {
      email: "admin@portafolio.com",
      name: "Usuario Demo",
      password: hashedPassword,
    },
  });

  // 3. Crear Cuentas
  const checkingAccount = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Cuenta Corriente",
      type: "CHECKING",
      bankName: "Banco Santander",
      balance: 1500000,
    },
  });
  const creditCard = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Visa Platinum",
      type: "CREDIT",
      bankName: "Banco Santander",
      lastFour: "4821",
      creditLimit: 2000000,
      balance: 350000,
    },
  });

  // 4. Crear Categorías
  const categories = [
    { name: "Alimentación", color: "#f97316" },
    { name: "Transporte", color: "#3b82f6" },
    { name: "Servicios", color: "#eab308" },
    { name: "Entretenimiento", color: "#8b5cf6" },
    { name: "Ingresos", color: "#22c55e" },
  ];

  const createdCategories = await Promise.all(
    categories.map((cat) =>
      prisma.category.create({ data: { ...cat, userId: user.id } }),
    ),
  );

  const getCatId = (name: string) =>
    createdCategories.find((c: { name: string; id: string }) => c.name === name)
      ?.id;

  // 5. Crear Transacciones (Mes actual)
  const today = new Date();
  const transactions = [
    {
      description: "Sueldo",
      amount: 2000000,
      type: "INCOME",
      accountId: checkingAccount.id,
      categoryId: getCatId("Ingresos"),
    },
    {
      description: "Supermercado Lider",
      amount: 120000,
      type: "EXPENSE",
      accountId: checkingAccount.id,
      categoryId: getCatId("Alimentación"),
    },
    {
      description: "Uber",
      amount: 8990,
      type: "EXPENSE",
      accountId: creditCard.id,
      categoryId: getCatId("Transporte"),
    },
    {
      description: "Netflix",
      amount: 7990,
      type: "EXPENSE",
      accountId: creditCard.id,
      categoryId: getCatId("Entretenimiento"),
    },
    {
      description: "Luz",
      amount: 25000,
      type: "EXPENSE",
      accountId: checkingAccount.id,
      categoryId: getCatId("Servicios"),
    },
    {
      description: "McDonalds",
      amount: 15000,
      type: "EXPENSE",
      accountId: checkingAccount.id,
      categoryId: getCatId("Alimentación"),
    },
    {
      description: "Carga Bip!",
      amount: 10000,
      type: "EXPENSE",
      accountId: checkingAccount.id,
      categoryId: getCatId("Transporte"),
    },
  ];

  for (const t of transactions) {
    // Restamos días aleatorios para que parezcan del mes en curso
    const randomDays = Math.floor(Math.random() * 28);
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - randomDays,
    );

    await prisma.transaction.create({
      data: { ...t, userId: user.id, date, isAutoCategorized: true },
    });
  }

  console.log("✅ Seed completado con éxito.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Prisma adapters might not need $disconnect in the same way, but it's safe to call it if it exists or just exit.
    process.exit(0);
  });
