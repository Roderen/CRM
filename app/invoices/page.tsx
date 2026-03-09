"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, FileText, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { downloadCSV } from "@/lib/export";
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
  client: { id: string; name: string; company: string | null };
  project: { id: string; name: string } | null;
}

interface Client {
  id: string;
  name: string;
  company: string | null;
}

interface Project {
  id: string;
  name: string;
  clientId: string;
  client: { id: string; name: string; company: string | null };
}

const EMPTY_ITEM: InvoiceItem = { description: "", quantity: 1, unitPrice: 0 };

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    clientId: "",
    projectId: "",
    dueDate: "",
    notes: "",
    items: [{ ...EMPTY_ITEM }] as InvoiceItem[],
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/invoices").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ])
      .then(([inv, cli, proj]) => {
        if (Array.isArray(inv)) setInvoices(inv);
        if (Array.isArray(cli)) setClients(cli);
        if (Array.isArray(proj)) setProjects(proj);
      })
      .finally(() => setLoading(false));
  }, []);

  function clientProjects() {
    if (!form.clientId) return [];
    return projects.filter((p) => p.clientId === form.clientId);
  }

  function setItem(index: number, field: keyof InvoiceItem, value: string) {
    setForm((f) => {
      const items = [...f.items];
      items[index] = {
        ...items[index],
        [field]: field === "description" ? value : parseFloat(value) || 0,
      };
      return { ...f, items };
    });
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  }

  function removeItem(index: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || form.items.some((i) => !i.description.trim())) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          projectId: form.projectId || null,
          dueDate: form.dueDate || null,
          items: form.items,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        const invoice = await res.json();
        setInvoices((prev) => [invoice, ...prev]);
        setForm({ clientId: "", projectId: "", dueDate: "", notes: "", items: [{ ...EMPTY_ITEM }] });
        setShowForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this invoice?")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  }

  function handleExport() {
    downloadCSV(
      "invoices.csv",
      invoices.map((inv) => ({
        Number: inv.number,
        Client: inv.client.name,
        Company: inv.client.company ?? "",
        Project: inv.project?.name ?? "",
        Status: inv.status,
        Total: calcTotal(inv.items),
        "Issue Date": new Date(inv.issueDate).toLocaleDateString(),
        "Due Date": inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "",
      }))
    );
  }

  const filteredProjects = clientProjects();
  const total = invoices.reduce((sum, inv) => sum + calcTotal(inv.items), 0);
  const unpaid = invoices
    .filter((inv) => inv.status === "SENT" || inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + calcTotal(inv.items), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm whitespace-nowrap"
          >
            ← Dashboard
          </button>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl font-semibold whitespace-nowrap">Invoices</h1>
        </div>
        <div className="flex gap-2 shrink-0 items-center">
          <ThemeToggle />
          {invoices.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          )}
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-1" />
            New Invoice
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Summary */}
        {!loading && invoices.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard label="Total Invoiced" value={fmtAmount(total)} color="text-foreground" />
            <SummaryCard label="Unpaid" value={fmtAmount(unpaid)} color="text-red-500" />
            <SummaryCard
              label="Paid"
              value={fmtAmount(invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + calcTotal(i.items), 0))}
              color="text-green-600"
            />
            <SummaryCard label="Invoices" value={String(invoices.length)} color="text-blue-500" />
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>New Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Client *</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={form.clientId}
                      onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value, projectId: "" }))}
                      required
                    >
                      <option value="">Select client…</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.company ? ` (${c.company})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Project (optional)</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={form.projectId}
                      onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                      disabled={!form.clientId}
                    >
                      <option value="">None</option>
                      {filteredProjects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-2">
                  <Label>Line Items</Label>
                  <div className="space-y-2">
                    {form.items.map((item, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-center">
                        <Input
                          placeholder="Description *"
                          value={item.description}
                          onChange={(e) => setItem(i, "description", e.target.value)}
                          required
                        />
                        <Input
                          type="number"
                          min="0.01"
                          step="any"
                          placeholder="Qty"
                          value={item.quantity || ""}
                          onChange={(e) => setItem(i, "quantity", e.target.value)}
                        />
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Price"
                          value={item.unitPrice || ""}
                          onChange={(e) => setItem(i, "unitPrice", e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(i)}
                          disabled={form.items.length === 1}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Line
                  </Button>
                  <p className="text-sm font-medium text-right">
                    Total: {fmtAmount(calcTotal(form.items))}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Input
                    placeholder="Payment terms, bank details…"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Invoice
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Invoice List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No invoices yet. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <Card
                key={inv.id}
                className="hover:bg-accent transition-colors cursor-pointer"
                onClick={() => router.push(`/invoices/${inv.id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{inv.number}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inv.status]}`}>
                            {STATUS_LABELS[inv.status]}
                          </span>
                        </div>
                        <CardDescription className="mt-0.5">
                          {inv.client.name}
                          {inv.client.company && ` · ${inv.client.company}`}
                          {inv.project && ` · ${inv.project.name}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-semibold text-sm">{fmtAmount(calcTotal(inv.items))}</p>
                        {inv.dueDate && (
                          <p className="text-xs text-muted-foreground">
                            Due {new Date(inv.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => handleDelete(inv.id, e)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
