export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300",
  SENT: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  PAID: "text-green-600 bg-green-100 dark:bg-green-900/30",
  OVERDUE: "text-red-600 bg-red-100 dark:bg-red-900/30",
};

export function calcTotal(items: InvoiceItem[]) {
  return items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
}
