"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  FolderKanban,
  Pencil,
  Trash2,
  GripVertical,
  Download,
} from "lucide-react";
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
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

type ProjectStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED";

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

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const COLUMNS: { id: ProjectStatus; label: string; color: string; headerColor: string }[] = [
  {
    id: "PLANNED",
    label: "Planned",
    color: "bg-slate-50 border-slate-200",
    headerColor: "bg-slate-200 text-slate-700",
  },
  {
    id: "IN_PROGRESS",
    label: "In Progress",
    color: "bg-blue-50 border-blue-200",
    headerColor: "bg-blue-200 text-blue-800",
  },
  {
    id: "COMPLETED",
    label: "Completed",
    color: "bg-green-50 border-green-200",
    headerColor: "bg-green-200 text-green-800",
  },
];

// ---- Droppable Column ----

function KanbanColumn({
  column,
  children,
  count,
}: {
  column: (typeof COLUMNS)[number];
  children: React.ReactNode;
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col min-w-[280px] flex-1">
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${column.headerColor}`}
      >
        <span className="font-semibold text-sm">{column.label}</span>
        <span className="text-xs font-medium opacity-70">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] border rounded-b-lg p-2 space-y-2 transition-colors ${column.color} ${
          isOver ? "ring-2 ring-inset ring-primary/40" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// ---- Draggable Card ----

function ProjectCard({
  project,
  onEdit,
  onDelete,
  overlay = false,
}: {
  project: Project;
  onEdit: (p: Project, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  overlay?: boolean;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: project.id });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={overlay ? undefined : style}
      className={`group ${isDragging ? "opacity-30" : ""}`}
    >
      <Card
        className={`cursor-pointer select-none transition-shadow ${
          overlay ? "shadow-xl rotate-1" : "hover:shadow-md"
        }`}
        onClick={() => !overlay && router.push(`/projects/${project.id}`)}
      >
        <CardHeader className="p-3">
          <div className="flex items-start gap-2">
            <button
              {...listeners}
              {...attributes}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm leading-snug">{project.name}</CardTitle>
              <CardDescription className="mt-0.5 text-xs space-y-0.5">
                <p className="font-medium text-foreground/60">
                  {project.client.company
                    ? `${project.client.name} · ${project.client.company}`
                    : project.client.name}
                </p>
                {project.description && <p>{project.description}</p>}
                {project.deadline && (
                  <p>⏱ {new Date(project.deadline).toLocaleDateString()}</p>
                )}
                {project.budget != null && (
                  <p className="text-green-600 font-medium">{fmt(project.budget)}</p>
                )}
              </CardDescription>
            </div>
            <div
              className="flex gap-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => onEdit(project, e)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={(e) => onDelete(project.id, e)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

// ---- Edit Card ----

function EditCard({
  project,
  onSave,
  onCancel,
}: {
  project: Project;
  onSave: (id: string, data: { name: string; description: string; deadline: string; status: ProjectStatus; budget: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: project.name,
    description: project.description ?? "",
    deadline: project.deadline ? project.deadline.slice(0, 10) : "",
    status: project.status,
    budget: project.budget != null ? String(project.budget) : "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSave(project.id, form);
    setSubmitting(false);
  }

  return (
    <Card>
      <CardContent className="p-3">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-7 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="h-7 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Deadline</Label>
            <Input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              className="h-7 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Budget ($)</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              className="h-7 text-sm"
              placeholder="0"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" size="sm" className="h-6 text-xs" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-6 text-xs" disabled={submitting}>
              {submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---- Main Page ----

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

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

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const newStatus = over.id as ProjectStatus;
    const project = projects.find((p) => p.id === active.id);
    if (!project || project.status === newStatus) return;

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => (p.id === active.id ? { ...p, status: newStatus } : p))
    );

    const res = await fetch(`/api/projects/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...project, status: newStatus }),
    });

    if (!res.ok) {
      // Revert on error
      setProjects((prev) =>
        prev.map((p) => (p.id === active.id ? { ...p, status: project.status } : p))
      );
    }
  }

  async function handleSave(
    id: string,
    data: { name: string; description: string; deadline: string; status: ProjectStatus; budget: string }
  ) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      setEditingId(null);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
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

  const activeProject = projects.find((p) => p.id === activeId);

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
        {projects.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport} className="ml-auto shrink-0">
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        )}
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
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 items-start overflow-x-auto pb-4">
              {COLUMNS.map((col) => {
                const colProjects = projects.filter((p) => p.status === col.id);
                return (
                  <KanbanColumn key={col.id} column={col} count={colProjects.length}>
                    {colProjects.map((project) =>
                      editingId === project.id ? (
                        <EditCard
                          key={project.id}
                          project={project}
                          onSave={handleSave}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onEdit={(p, e) => {
                            e.stopPropagation();
                            setEditingId(p.id);
                          }}
                          onDelete={handleDelete}
                        />
                      )
                    )}
                  </KanbanColumn>
                );
              })}
            </div>

            <DragOverlay>
              {activeProject && (
                <ProjectCard
                  project={activeProject}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  overlay
                />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </main>
    </div>
  );
}
