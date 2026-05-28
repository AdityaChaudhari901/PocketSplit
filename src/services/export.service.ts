import { formatMoney } from "@/lib/money";
import type { Transaction } from "@/types/domain";

const escapeCsv = (value: string): string => `"${value.replaceAll("\"", "\"\"")}"`;

export const buildTransactionsCsv = (transactions: Transaction[]): string => {
  const header = ["Date", "Type", "Merchant", "Amount", "Currency", "Note"].join(",");
  const rows = transactions.map((transaction) =>
    [
      transaction.occurredAt.slice(0, 10),
      transaction.type,
      escapeCsv(transaction.merchant ?? ""),
      formatMoney(transaction.amountMinor, transaction.currency),
      transaction.currency,
      escapeCsv(transaction.note ?? "")
    ].join(",")
  );
  return [header, ...rows].join("\n");
};

export const queuePdfExport = async (): Promise<{ status: "queued"; message: string }> => ({
  status: "queued",
  message: "PDF export is wired as a premium server job. Connect a PDF renderer in production."
});
