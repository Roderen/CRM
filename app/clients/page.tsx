"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Building2, Pencil, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadCSV } from "@/lib/export";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  dealAmount: number | null;
  createdAt: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", dealAmount: "" });

  function handleExport() {
    downloadCSV(
      "clients.csv",
      clients.map((c) => ({
        Name: c.name,
        Company: c.company ?? "",
        Email: c.email ?? "",
        Phone: c.phone ?? "",
        "Deal Amount": c.dealAmount ?? "",
        "Created At": new Date(c.createdAt).toLocaleDateString(),
      }))
    );
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", company: "", dealAmount: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    setLoading(true);
    setDbError(false);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      if (Array.isArray(data)) {
        setClients(data);
      } else {
        setDbError(true);
      }
    } catch {
      setDbError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ name: "", email: "", phone: "", company: "", dealAmount: "" });
        setShowForm(false);
        await fetchClients();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(client: Client, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(client.id);
    setEditForm({
      name: client.name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      company: client.company ?? "",
      dealAmount: client.dealAmount != null ? String(client.dealAmount) : "",
    });
  }

  async function handleEditSubmit(e: React.FormEvent, id: string) {
    e.preventDefault();
    if (!editForm.name.trim()) return;

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchClients();
      }
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this client? All their projects and tasks will be deleted too.")) return;

    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    setClients((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            ← Dashboard
          </button>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl font-semibold">Clients</h1>
        </div>
        <div className="flex gap-2">
          {clients.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          )}
          <Button onClick={() => setShowForm((v) => !v)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Client
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Add Client Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>New Client</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={form.company}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                      placeholder="Acme Inc."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 234 567 890"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dealAmount">Deal Amount ($)</Label>
                    <Input
                      id="dealAmount"
                      type="number"
                      min="0"
                      step="any"
                      value={form.dealAmount}
                      onChange={(e) => setForm((f) => ({ ...f, dealAmount: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Client
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Client List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : dbError ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-destructive font-medium mb-1">Database unavailable</p>
            <p className="text-sm">
              Your Supabase project may be paused (free tier pauses after 7 days of inactivity).
              Go to{" "}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground"
              >
                supabase.com/dashboard
              </a>{" "}
              and resume your project.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchClients}>
              Retry
            </Button>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No clients yet. Add your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {clients.map((client) =>
              editingId === client.id ? (
                <Card key={client.id}>
                  <CardContent className="pt-4">
                    <form
                      onSubmit={(e) => handleEditSubmit(e, client.id)}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Name *</Label>
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Company</Label>
                          <Input
                            value={editForm.company}
                            onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Phone</Label>
                          <Input
                            value={editForm.phone}
                            onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label>Deal Amount ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={editForm.dealAmount}
                            onChange={(e) => setEditForm((f) => ({ ...f, dealAmount: e.target.value }))}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={editSubmitting}>
                          {editSubmitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          Save
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <Card
                  key={client.id}
                  className="hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base">{client.name}</CardTitle>
                        <CardDescription className="space-y-0.5 mt-1">
                          {client.company && <p>{client.company}</p>}
                          {client.email && <p>{client.email}</p>}
                          {client.phone && <p>{client.phone}</p>}
                          {client.dealAmount != null && (
                            <p className="text-green-600 font-medium">{fmt(client.dealAmount)}</p>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => startEdit(client, e)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => handleDelete(client.id, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}
