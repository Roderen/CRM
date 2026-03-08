"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Building2 } from "lucide-react";
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

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  createdAt: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data);
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
        setForm({ name: "", email: "", phone: "", company: "" });
        setShowForm(false);
        await fetchClients();
      }
    } finally {
      setSubmitting(false);
    }
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
        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Client
        </Button>
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
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={form.company}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, company: e.target.value }))
                      }
                      placeholder="Acme Inc."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      placeholder="+1 234 567 890"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
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
        ) : clients.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No clients yet. Add your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="hover:bg-accent transition-colors cursor-pointer"
                onClick={() => router.push(`/clients/${client.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-base">{client.name}</CardTitle>
                  <CardDescription className="space-y-0.5">
                    {client.company && <p>{client.company}</p>}
                    {client.email && <p>{client.email}</p>}
                    {client.phone && <p>{client.phone}</p>}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
