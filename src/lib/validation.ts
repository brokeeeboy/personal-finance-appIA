import { z } from "zod";

const positiveAmount = z.coerce
  .number()
  .finite()
  .positive()
  .max(1_000_000_000_000);
const date = z.coerce
  .date()
  .refine((value) => !Number.isNaN(value.getTime()), "Fecha invalida");

export const transactionInputSchema = z.object({
  description: z.string().trim().min(1).max(200),
  amount: positiveAmount,
  type: z.enum(["INCOME", "EXPENSE"]),
  date,
  accountId: z.string().trim().min(1),
  categoryId: z.string().trim().min(1).optional(),
});

export const accountInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(["DEBIT", "CREDIT", "CHECKING", "CASH"]),
  bankName: z.string().trim().max(100).optional(),
  balance: z.coerce.number().finite().max(1_000_000_000_000),
  lastFour: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  creditLimit: z.coerce.number().finite().nonnegative().optional(),
  billingDay: z.coerce.number().int().min(1).max(31).optional(),
  paymentDay: z.coerce.number().int().min(1).max(31).optional(),
});

export const goalInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  targetAmount: positiveAmount,
  initialAmount: z.coerce
    .number()
    .finite()
    .nonnegative()
    .max(1_000_000_000_000),
  targetDate: date.optional(),
});

export const debtInputSchema = z.object({
  type: z.enum(["OWE_ME", "I_OWE"]),
  personName: z.string().trim().min(1).max(100),
  description: z.string().trim().max(200).optional(),
  amount: positiveAmount,
  dueDate: date.optional(),
});

export const aiActionSchema = z.object({
  action: z.enum(["transaction", "debt", "goal", "unknown"]),
  amount: positiveAmount.optional(),
  description: z.string().trim().max(200).optional(),
  type: z.string().optional(),
  accountId: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1).optional(),
  personName: z.string().trim().max(100).optional(),
  askForDueDate: z.boolean().optional(),
  dueDate: z.string().optional(),
  goalId: z.string().trim().min(1).optional(),
  reply: z.string().trim().max(500).optional(),
});

export function parseFormString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}
