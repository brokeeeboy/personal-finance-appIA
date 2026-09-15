import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTransactionWhere } from "@/lib/transactionFilters";

function escapeCsvField(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("No autorizado", { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const where = buildTransactionWhere(session.user.id, {
    type: params.get("type") ?? undefined,
    accountId: params.get("accountId") ?? undefined,
    categoryId: params.get("categoryId") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    q: params.get("q") ?? undefined,
  });

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      account: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: { date: "desc" },
    take: 20_000,
  });

  const header = [
    "Fecha",
    "Descripción",
    "Tipo",
    "Categoría",
    "Cuenta",
    "Monto",
  ];
  const rows = transactions.map((t) => [
    new Date(t.date).toISOString().split("T")[0],
    t.description,
    t.type === "INCOME" ? "Ingreso" : "Gasto",
    t.category?.name ?? "",
    t.account.name,
    t.amount.toString(),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((field) => escapeCsvField(String(field))).join(","))
    .join("\r\n");

  // BOM (﻿) para que Excel detecte UTF-8 y no rompa tildes/ñ al abrir el archivo.
  const BOM = "﻿";
  const filename = `transacciones_${new Date().toISOString().split("T")[0]}.csv`;

  return new Response(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
