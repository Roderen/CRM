"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  FolderKanban,
  Pencil,
  Trash2,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadCSV } from "@/lib/export";
import { ThemeToggle } from "@/components/theme-toggle";
import { fmtCurrency } from "@/lib/format";

type ProjectStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED";
type SortField = "name" | "client" | "status" | "deadline" | "budget";
type SortDir = "asc" | "desc";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  deadline: string | null;
  budget: number | null;
  createdAt: string;
  client: {
    id: string;
    name: string;
    company: string | null;
  };
}

const STATUS_META: Record<ProjectStatus, { label: string; className: string }> = {
  PLANNED: { label: "Planned", className: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
  IN_PROGRESS: { label: "In Progress", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200" },
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  const { label, className } = STATUS_META[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
  return sortDir === "asc"
    ? <ChevronUp className="h-3.5 w-3.5" />
    : <ChevronDown className="h-3.5 w-3.5" />;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    description: string;
    deadline: string;
    status: ProjectStatus;
    budget: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  async function fetchProjects() {
    setLoading(true);
    setDbError(false);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
      } else {
        setDbError(true);
      }
    } catch {
      setDbError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function startEdit(project: Project) {
    setEditingId(project.id);
    setEditForm({
      name: project.name,
      description: project.description ?? "",
      deadline: project.deadline ? project.deadline.slice(0, 10) : "",
      status: project.status,
      budget: project.budget != null ? String(project.budget) : "",
    });
  }

  async function handleSave(id: string) {
    if (!editForm) return;
    setSubmitting(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      setEditingId(null);
      setEditForm(null);
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project? All tasks will be deleted too.")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  function handleExport() {
    downloadCSV(
      "projects.csv",
      projects.map((p) => ({
        Name: p.name,
        Client: p.client.name,
        Company: p.client.company ?? "",
        Status: p.status,
        Description: p.description ?? "",
        Deadline: p.deadline ? new Date(p.deadline).toLocaleDateString() : "",
        Budget: p.budget ?? "",
        "Created At": new Date(p.createdAt).toLocaleDateString(),
      }))
    );
  }

  const sorted = [...projects].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    if (sortField === "name") { av = a.name; bv = b.name; }
    else if (sortField === "client") { av = a.client.name; bv = b.client.name; }
    else if (sortField === "status") { av = a.status; bv = b.status; }
    else if (sortField === "deadline") { av = a.deadline ?? ""; bv = b.deadline ?? ""; }
    else if (sortField === "budget") { av = a.budget ?? -1; bv = b.budget ?? -1; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const thClass = "px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide select-none";
  const thBtn = "flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center gap-3 overflow-x-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm whitespace-nowrap shrink-0"
        >
          ← Dashboard
        </button>
        <span className="text-muted-foreground shrink-0">/</span>
        <h1 className="text-xl font-semibold whitespace-nowrap shrink-0">Projects</h1>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <ThemeToggle />
          {projects.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          )}
        </div>
      </header>

      <main className="p-6">
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
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchProjects}>
              Retry
            </Button>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No projects yet. Create one from a client page.</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className={thClass}>
                    <button className={thBtn} onClick={() => handleSort("name")}>
                      Name <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className={thClass}>
                    <button className={thBtn} onClick={() => handleSort("client")}>
                      Client <SortIcon field="client" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className={thClass}>
                    <button className={thBtn} onClick={() => handleSort("status")}>
                      Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className={thClass}>
                    <button className={thBtn} onClick={() => handleSort("deadline")}>
                      Deadline <SortIcon field="deadline" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className={thClass}>
                    <button className={thBtn} onClick={() => handleSort("budget")}>
                      Budget <SortIcon field="budget" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map((project) =>
                  editingId === project.id && editForm ? (
                    <tr key={project.id} className="bg-muted/30">
                      <td className="px-4 py-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Name *</Label>
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => f && { ...f, name: e.target.value })}
                            className="h-7 text-sm"
                            required
                          />
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={editForm.description}
                            onChange={(e) => setEditForm((f) => f && { ...f, description: e.target.value })}
                            className="h-7 text-sm"
                            placeholder="optional"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {project.client.company
                          ? `${project.client.name} · ${project.client.company}`
                          : project.client.name}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm((f) => f && { ...f, status: e.target.value as ProjectStatus })}
                          className="h-7 text-sm rounded-md border border-input bg-background px-2"
                        >
                          <option value="PLANNED">Planned</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="date"
                          value={editForm.deadline}
                          onChange={(e) => setEditForm((f) => f && { ...f, deadline: e.target.value })}
                          className="h-7 text-sm w-36"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={editForm.budget}
                          onChange={(e) => setEditForm((f) => f && { ...f, budget: e.target.value })}
                          className="h-7 text-sm w-28"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => { setEditingId(null); setEditForm(null); }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={submitting}
                            onClick={() => handleSave(project.id)}
                          >
                            {submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            Save
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={project.id}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">
                        <div>{project.name}</div>
                        {project.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[240px]">
                            {project.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{project.client.name}</div>
                        {project.client.company && (
                          <div className="text-xs opacity-70">{project.client.company}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {project.deadline
                          ? new Date(project.deadline).toLocaleDateString()
                          : <span className="opacity-40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">
                        {project.budget != null
                          ? fmtCurrency(project.budget)
                          : <span className="text-muted-foreground opacity-40">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-1 justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEdit(project)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(project.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
