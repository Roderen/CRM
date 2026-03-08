"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { Loader2, Plus, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
}

interface Project {
  id: string;
  name: string;
  clientId: string;
  client: { id: string; name: string };
  tasks: Task[];
}

// ─── Column config ─────────────────────────────────────────────────────────────

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "TODO", label: "To Do", color: "bg-slate-50 border-slate-200" },
  {
    status: "IN_PROGRESS",
    label: "In Progress",
    color: "bg-blue-50 border-blue-200",
  },
  { status: "DONE", label: "Done", color: "bg-green-50 border-green-200" },
];

// ─── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({ task, overlay }: { task: Task; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id, data: { status: task.status } });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "bg-white border rounded-lg p-3 select-none",
        overlay
          ? "shadow-lg rotate-1 cursor-grabbing"
          : "cursor-grab shadow-sm hover:shadow-md transition-shadow",
        isDragging && !overlay ? "opacity-40" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start gap-2">
        <div
          {...listeners}
          {...attributes}
          className="mt-0.5 text-muted-foreground shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <p className="text-sm leading-snug">{task.title}</p>
      </div>
      {task.description && (
        <p className="text-xs text-muted-foreground mt-1 ml-6 line-clamp-2">
          {task.description}
        </p>
      )}
    </div>
  );
}

// ─── KanbanColumn ──────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  label,
  colorClass,
  tasks,
  isAdding,
  newTitle,
  submitting,
  onAddClick,
  onTitleChange,
  onSubmit,
  onCancelAdd,
}: {
  status: TaskStatus;
  label: string;
  colorClass: string;
  tasks: Task[];
  isAdding: boolean;
  newTitle: string;
  submitting: boolean;
  onAddClick: () => void;
  onTitleChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancelAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col min-w-0 flex-1">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-foreground">
          {label}
          <span className="ml-2 text-muted-foreground font-normal">
            {tasks.length}
          </span>
        </h3>
        <button
          onClick={onAddClick}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Add task"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={[
          "flex-1 rounded-xl border-2 border-dashed p-3 space-y-2 min-h-48 transition-colors",
          colorClass,
          isOver ? "border-primary/50 bg-primary/5" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}

        {/* Inline add form */}
        {isAdding && (
          <form onSubmit={onSubmit} className="bg-white border rounded-lg p-2 shadow-sm space-y-2">
            <Input
              autoFocus
              value={newTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Task title..."
              className="text-sm h-8"
            />
            <div className="flex gap-1.5">
              <Button
                type="submit"
                size="sm"
                className="h-7 text-xs"
                disabled={submitting || !newTitle.trim()}
              >
                {submitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
              <button
                type="button"
                onClick={onCancelAdd}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchProject() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}/tasks`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data: Project = await res.json();
      setProject(data);
      setTasks(data.tasks);
    } finally {
      setLoading(false);
    }
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === active.id) ?? null);
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      );
    }
  }

  // ── Add task ───────────────────────────────────────────────────────────────

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || !addingToColumn) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle.trim(), status: addingToColumn }),
      });
      if (res.ok) {
        const task: Task = await res.json();
        // Override status to match the column the user added from
        setTasks((prev) => [...prev, { ...task, status: addingToColumn }]);
        setNewTaskTitle("");
        setAddingToColumn(null);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="outline" onClick={() => router.push("/clients")}>
          ← Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => router.push("/clients")}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          Clients
        </button>
        <span className="text-muted-foreground">/</span>
        <button
          onClick={() => router.push(`/clients/${project.clientId}`)}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          {project.client.name}
        </button>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-base font-semibold">{project.name}</h1>
      </header>

      {/* Kanban board */}
      <main className="flex-1 p-6 overflow-x-auto">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTask(null)}
        >
          <div className="flex gap-5 min-w-max sm:min-w-0 h-full">
            {COLUMNS.map(({ status, label, color }) => (
              <KanbanColumn
                key={status}
                status={status}
                label={label}
                colorClass={color}
                tasks={tasks.filter((t) => t.status === status)}
                isAdding={addingToColumn === status}
                newTitle={addingToColumn === status ? newTaskTitle : ""}
                submitting={submitting}
                onAddClick={() => {
                  setAddingToColumn(status);
                  setNewTaskTitle("");
                }}
                onTitleChange={setNewTaskTitle}
                onSubmit={handleAddTask}
                onCancelAdd={() => {
                  setAddingToColumn(null);
                  setNewTaskTitle("");
                }}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? <TaskCard task={activeTask} overlay /> : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
}
