"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Loader2, FolderOpen } from "lucide-react";
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

type ProjectStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  deadline: string | null;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  projects: Project[];
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  PLANNED: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    deadline: "",
  });

  useEffect(() => {
    fetchClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchClient() {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setClient(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          deadline: form.deadline || undefined,
          clientId: id,
        }),
      });
      if (res.ok) {
        setForm({ name: "", description: "", deadline: "" });
        setShowForm(false);
        await fetchClient();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Client not found.</p>
        <Button variant="outline" onClick={() => router.push("/clients")}>
          ← Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/clients")}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            ← Clients
          </button>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl font-semibold">{client.name}</h1>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Project
        </Button>
      </header>

      <main className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle>{client.name}</CardTitle>
            <CardDescription className="space-y-0.5">
              {client.company && <p>{client.company}</p>}
              {client.email && <p>{client.email}</p>}
              {client.phone && <p>{client.phone}</p>}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Add Project Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>New Project</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddProject} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="proj-name">Name *</Label>
                    <Input
                      id="proj-name"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Website redesign"
                      required
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="proj-desc">Description</Label>
                    <Input
                      id="proj-desc"
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                      placeholder="Short description..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="proj-deadline">Deadline</Label>
                    <Input
                      id="proj-deadline"
                      type="date"
                      value={form.deadline}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, deadline: e.target.value }))
                      }
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
                    Create Project
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Projects List */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Projects ({client.projects.length})
          </h2>

          {client.projects.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No projects yet. Add the first one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {client.projects.map((project) => (
                <Card
                  key={project.id}
                  className="hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[project.status]}`}
                      >
                        {STATUS_LABELS[project.status]}
                      </span>
                    </div>
                    {project.description && (
                      <CardDescription>{project.description}</CardDescription>
                    )}
                    {project.deadline && (
                      <CardDescription>
                        Deadline:{" "}
                        {new Date(project.deadline).toLocaleDateString()}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
