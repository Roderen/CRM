"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent, DragOverEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, Plus, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;
}

interface Project {
  id: string;
  name: string;
  clientId: string;
  client: { id: string; name: string };
  tasks: Task[];
}

// ─── Column config ─────────────────────────────────────────────────────────────

const COLUMNS: { status: TaskStatus; label: string; color: string; headerColor: string }[] = [
  {
    status: "TODO",
    label: "To Do",
    color: "bg-slate-50 border-slate-200",
    headerColor: "bg-slate-200 text-slate-700",
  },
  {
    status: "IN_PROGRESS",
    label: "In Progress",
    color: "bg-blue-50 border-blue-200",
    headerColor: "bg-blue-200 text-blue-800",
  },
  {
    status: "DONE",
    label: "Done",
    color: "bg-green-50 border-green-200",
    headerColor: "bg-green-200 text-green-800",
  },
];

const COLUMN_IDS = new Set<string>(COLUMNS.map((c) => c.status));

// ─── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({ task, overlay }: { task: Task; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = overlay
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "bg-white border rounded-lg p-3 select-none",
        overlay
          ? "shadow-xl rotate-1 cursor-grabbing"
          : "cursor-grab shadow-sm hover:shadow-md transition-shadow",
        isDragging && !overlay ? "opacity-30" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
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
  headerColor,
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
  headerColor: string;
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
    <div className="flex flex-col min-w-[260px] flex-1">
      {/* Column header */}
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${headerColor}`}
      >
        <span className="font-semibold text-sm">
          {label}
          <span className="ml-2 font-normal opacity-70">{tasks.length}</span>
        </span>
        <button
          onClick={onAddClick}
          className="opacity-70 hover:opacity-100 transition-opacity"
          title="Add task"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={[
          "flex-1 border border-t-0 rounded-b-lg p-2 space-y-2 min-h-48 transition-colors",
          colorClass,
          isOver ? "ring-2 ring-inset ring-primary/30" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {/* Inline add form */}
        {isAdding && (
          <form
            onSubmit={onSubmit}
            className="bg-white border rounded-lg p-2 shadow-sm space-y-2"
          >
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
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
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

// ─── Helpers ───────────────────────────────────────────────────────────────────

function colTasks(tasks: Task[], status: TaskStatus) {
  return tasks.filter((t) => t.status === status);
}

function assignPositions(tasks: Task[]): Task[] {
  const grouped: Record<string, Task[]> = {};
  for (const t of tasks) {
    if (!grouped[t.status]) grouped[t.status] = [];
    grouped[t.status].push(t);
  }
  return Object.values(grouped).flatMap((col) =>
    col.map((t, i) => ({ ...t, position: i }))
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
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  useEffect(() => {
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchProject() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}/tasks`);
      if (res.status === 404) { setNotFound(true); return; }
      const data: Project = await res.json();
      setProject(data);
      setTasks(assignPositions(data.tasks));
    } finally {
      setLoading(false);
    }
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === active.id) ?? null);
  }

  // Live preview while dragging over another column
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    const targetStatus = COLUMN_IDS.has(overId)
      ? (overId as TaskStatus)
      : tasks.find((t) => t.id === overId)?.status;

    if (!targetStatus || targetStatus === activeTask.status) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, status: targetStatus } : t))
    );
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    setTasks((prev) => {
      const activeTask = prev.find((t) => t.id === activeId);
      if (!activeTask) return prev;

      const targetStatus: TaskStatus = COLUMN_IDS.has(overId)
        ? (overId as TaskStatus)
        : (prev.find((t) => t.id === overId)?.status ?? activeTask.status);

      // Build per-column arrays
      const srcCol = colTasks(prev, activeTask.status);
      const dstCol =
        activeTask.status === targetStatus ? srcCol : colTasks(prev, targetStatus);

      if (activeTask.status === targetStatus) {
        // Same column — reorder
        const fromIdx = srcCol.findIndex((t) => t.id === activeId);
        const toIdx = COLUMN_IDS.has(overId)
          ? srcCol.length - 1
          : srcCol.findIndex((t) => t.id === overId);
        if (fromIdx === toIdx) return prev;

        const reordered = arrayMove(srcCol, fromIdx, toIdx);
        const rest = prev.filter((t) => t.status !== targetStatus);
        return assignPositions([...rest, ...reordered]);
      } else {
        // Cross-column move (status already updated in onDragOver)
        // Just re-derive positions
        return assignPositions(prev);
      }
    });

    // Persist after state settles
    setTimeout(async () => {
      setTasks((current) => {
        void fetch("/api/tasks/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tasks: current.map(({ id, status, position }) => ({ id, status, position })),
          }),
        });
        return current;
      });
    }, 0);
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
        setTasks((prev) => [
          ...prev,
          { ...task, status: addingToColumn, position: colTasks(prev, addingToColumn).length },
        ]);
        setNewTaskTitle("");
        setAddingToColumn(null);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

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

      <main className="flex-1 p-6 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setActiveTask(null);
            fetchProject(); // revert to server state
          }}
        >
          <div className="flex gap-4 min-w-max sm:min-w-0">
            {COLUMNS.map(({ status, label, color, headerColor }) => (
              <KanbanColumn
                key={status}
                status={status}
                label={label}
                colorClass={color}
                headerColor={headerColor}
                tasks={colTasks(tasks, status)}
                isAdding={addingToColumn === status}
                newTitle={addingToColumn === status ? newTaskTitle : ""}
                submitting={submitting}
                onAddClick={() => { setAddingToColumn(status); setNewTaskTitle(""); }}
                onTitleChange={setNewTaskTitle}
                onSubmit={handleAddTask}
                onCancelAdd={() => { setAddingToColumn(null); setNewTaskTitle(""); }}
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
