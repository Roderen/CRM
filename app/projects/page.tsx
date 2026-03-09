"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FolderKanban, Pencil, Trash2 } from "lucide-react";
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
  client: {
    id: string;
    name: string;
    company: string | null;
  };
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

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    deadline: "",
    status: "PLANNED" as ProjectStatus,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data))
      .finally(() => setLoading(false));
  }, []);

  function startEdit(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(project.id);
    setEditForm({
      name: project.name,
      description: project.description ?? "",
      deadline: project.deadline ? project.deadline.slice(0, 10) : "",
      status: project.status,
    });
  }

  async function handleEditSubmit(e: React.FormEvent, id: string) {
    e.preventDefault();
    if (!editForm.name.trim()) return;

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
        );
        setEditingId(null);
      }
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this project? All tasks will be deleted too.")) return;

    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          ← Dashboard
        </button>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-semibold">Projects</h1>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No projects yet. Create one from a client page.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map((project) =>
              editingId === project.id ? (
                <Card key={project.id}>
                  <CardContent className="pt-4">
                    <form
                      onSubmit={(e) => handleEditSubmit(e, project.id)}
                      className="space-y-3"
                    >
                      <div className="space-y-1">
                        <Label>Name *</Label>
                        <Input
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, name: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Description</Label>
                        <Input
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, description: e.target.value }))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Deadline</Label>
                          <Input
                            type="date"
                            value={editForm.deadline}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, deadline: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Status</Label>
                          <select
                            value={editForm.status}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                status: e.target.value as ProjectStatus,
                              }))
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          >
                            <option value="PLANNED">Planned</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
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
                          {editSubmitting && (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          )}
                          Save
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <Card
                  key={project.id}
                  className="hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base">{project.name}</CardTitle>
                        <CardDescription className="space-y-0.5 mt-1">
                          <p>
                            {project.client.company
                              ? `${project.client.name} · ${project.client.company}`
                              : project.client.name}
                          </p>
                          {project.description && <p>{project.description}</p>}
                          {project.deadline && (
                            <p>
                              Deadline:{" "}
                              {new Date(project.deadline).toLocaleDateString()}
                            </p>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[project.status]}`}
                        >
                          {STATUS_LABELS[project.status]}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => startEdit(project, e)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={(e) => handleDelete(project.id, e)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
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
