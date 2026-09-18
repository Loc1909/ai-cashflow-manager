import { z } from "zod";

// Single source of truth for the transaction form's validation rules —
// previously duplicated verbatim in both new/page.tsx and [id]/edit/page.tsx.
export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0"),
  category: z.string().min(1),
  description: z.string().optional(),
  merchant_name: z.string().optional(),
  transaction_date: z.string().min(1),
});

export type TransactionFormInput = z.input<typeof transactionSchema>;
export type TransactionFormOutput = z.output<typeof transactionSchema>;