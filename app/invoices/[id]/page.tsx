"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Printer, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { fmtAmount } from "@/lib/format";
import {
  type InvoiceStatus,
  type InvoiceItem,
  STATUS_LABELS,
  STATUS_COLORS,
  calcTotal,
} from "@/lib/invoice-utils";

interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  items: InvoiceItem[];
  notes: string | null;
  client: { id: string; name: string; company: string | null; email: string | null; phone: string | null };
  project: { id: string; name: string } | null;
}

const STATUSES: InvoiceStatus[] = ["DRAFT", "SENT", "PAID", "OVERDUE"];

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editStatus, setEditStatus] = useState<InvoiceStatus>("DRAFT");
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setInvoice(data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function startEdit() {
    if (!invoice) return;
    setEditStatus(invoice.status);
    setEditDueDate(invoice.dueDate ? invoice.dueDate.slice(0, 10) : "");
    setEditNotes(invoice.notes ?? "");
    setEditItems(invoice.items.map((i) => ({ ...i })));
    setEditing(true);
  }

  function setEditItem(index: number, field: keyof InvoiceItem, value: string) {
    setEditItems((items) => {
      const next = [...items];
      next[index] = {
        ...next[index],
        [field]: field === "description" ? value : parseFloat(value) || 0,
      };
      return next;
    });
  }

  async function saveEdit() {
    if (!invoice) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          dueDate: editDueDate || null,
          notes: editNotes || null,
          items: editItems,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setInvoice(updated);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Invoice not found.
      </div>
    );
  }

  const total = calcTotal(editing ? editItems : invoice.items);

  return (
    <div className="min-h-screen bg-background">
      {/* Header — hidden on print */}
      <header className="border-b px-6 py-4 flex items-center justify-between gap-4 overflow-x-auto print:hidden">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.push("/invoices")}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm whitespace-nowrap"
          >
            ← Invoices
          </button>
          <span className="text-muted-foreground shrink-0">/</span>
          <h1 className="text-xl font-semibold whitespace-nowrap">{invoice.number}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0 ${STATUS_COLORS[invoice.status]}`}>
            {STATUS_LABELS[invoice.status]}
          </span>
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <ThemeToggle />
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" />
                Print / PDF
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Invoice Document */}
      <main className="p-6 max-w-3xl mx-auto">
        <div className="bg-card border rounded-xl p-8 shadow-sm print:border-0 print:shadow-none print:p-0">
          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">INVOICE</h2>
              <p className="text-muted-foreground mt-1">{invoice.number}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-muted-foreground">Issue date</p>
              <p className="font-medium">{fmtDate(invoice.issueDate)}</p>
              {(editing ? editDueDate : invoice.dueDate) && (
                <>
                  <p className="text-muted-foreground mt-2">Due date</p>
                  <p className="font-medium">
                    {editing ? (editDueDate ? fmtDate(editDueDate) : "—") : fmtDate(invoice.dueDate!)}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Edit controls — only visible when editing, not on print */}
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg bg-muted/30 print:hidden">
              <div className="space-y-1">
                <Label>Status</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as InvoiceStatus)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Due Date</Label>
                <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input
                  placeholder="Payment terms…"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Bill To */}
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Bill To</p>
            <p className="font-semibold">{invoice.client.name}</p>
            {invoice.client.company && <p className="text-sm text-muted-foreground">{invoice.client.company}</p>}
            {invoice.client.email && <p className="text-sm text-muted-foreground">{invoice.client.email}</p>}
            {invoice.client.phone && <p className="text-sm text-muted-foreground">{invoice.client.phone}</p>}
            {invoice.project && (
              <p className="text-sm text-muted-foreground mt-1">
                Project: <span className="font-medium">{invoice.project.name}</span>
              </p>
            )}
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-3 font-semibold text-muted-foreground">Description</th>
                  <th className="text-right pb-3 font-semibold text-muted-foreground w-20">Qty</th>
                  <th className="text-right pb-3 font-semibold text-muted-foreground w-28">Unit Price</th>
                  <th className="text-right pb-3 font-semibold text-muted-foreground w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(editing ? editItems : invoice.items).map((item, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      {editing ? (
                        <Input
                          value={item.description}
                          onChange={(e) => setEditItem(i, "description", e.target.value)}
                          className="h-8 text-sm"
                        />
                      ) : (
                        item.description
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {editing ? (
                        <Input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => setEditItem(i, "quantity", e.target.value)}
                          className="h-8 text-sm text-right w-20 ml-auto"
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {editing ? (
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => setEditItem(i, "unitPrice", e.target.value)}
                          className="h-8 text-sm text-right w-28 ml-auto"
                        />
                      ) : (
                        fmtAmount(item.unitPrice)
                      )}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {fmtAmount(item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-end mb-8">
            <div className="w-56">
              <div className="flex justify-between py-3 border-t-2 border-foreground">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-lg">{fmtAmount(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(editing ? editNotes : invoice.notes) && (
            <div className="border-t pt-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Notes</p>
              <p className="whitespace-pre-line">{editing ? editNotes : invoice.notes}</p>
            </div>
          )}
        </div>
      </main>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white; }
          header, .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
