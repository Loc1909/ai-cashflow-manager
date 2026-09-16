export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  merchant_name?: string;
  transaction_date: string;
}

export interface TransactionListResponse {
  items: Transaction[];
  total: number;
}
