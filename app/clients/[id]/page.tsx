"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Loader2, FolderOpen, Pencil, Trash2, Phone, Users, Mail, FileText, DollarSign } from "lucide-react";
import { fmtCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
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
type ActivityType = "CALL" | "MEETING" | "EMAIL" | "NOTE";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  deadline: string | null;
  budget: number | null;
  createdAt: string;
}

interface Activity {
  id: string;
  type: ActivityType;
  note: string;
  date: string;
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

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  CALL: <Phone className="h-3.5 w-3.5" />,
  MEETING: <Users className="h-3.5 w-3.5" />,
  EMAIL: <Mail className="h-3.5 w-3.5" />,
  NOTE: <FileText className="h-3.5 w-3.5" />,
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  CALL: "Call",
  MEETING: "Meeting",
  EMAIL: "Email",
  NOTE: "Note",
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  CALL: "bg-green-100 text-green-700",
  MEETING: "bg-purple-100 text-purple-700",
  EMAIL: "bg-blue-100 text-blue-700",
  NOTE: "bg-slate-100 text-slate-700",
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", deadline: "" });

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    deadline: "",
    status: "PLANNED" as ProjectStatus,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Activity state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityForm, setActivityForm] = useState<{ type: ActivityType; note: string; date: string }>({
    type: "CALL",
    note: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [activitySubmitting, setActivitySubmitting] = useState(false);

  useEffect(() => {
    fetchClient();
    fetchActivities();
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

  async function fetchActivities() {
    setActivitiesLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}/activities`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } finally {
      setActivitiesLoading(false);
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

  function startEditProject(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditForm({
      name: project.name,
      description: project.description ?? "",
      deadline: project.deadline ? project.deadline.slice(0, 10) : "",
      status: project.status,
    });
  }

  async function handleEditProject(e: React.FormEvent, projectId: string) {
    e.preventDefault();
    if (!editForm.name.trim()) return;

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingProjectId(null);
        await fetchClient();
      }
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDeleteProject(projectId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this project? All tasks will be deleted too.")) return;

    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    setClient((prev) =>
      prev ? { ...prev, projects: prev.projects.filter((p) => p.id !== projectId) } : prev
    );
  }

  async function handleDeleteClient() {
    if (!confirm("Delete this client? All their projects and tasks will be deleted too.")) return;

    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    router.push("/clients");
  }

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!activityForm.note.trim()) return;

    setActivitySubmitting(true);
    try {
      const res = await fetch(`/api/clients/${id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityForm),
      });
      if (res.ok) {
        const created = await res.json();
        setActivities((prev) => [created, ...prev]);
        setActivityForm({ type: "CALL", note: "", date: new Date().toISOString().slice(0, 10) });
        setShowActivityForm(false);
      }
    } finally {
      setActivitySubmitting(false);
    }
  }

  async function handleDeleteActivity(activityId: string) {
    if (!confirm("Delete this activity?")) return;
    await fetch(`/api/activities/${activityId}`, { method: "DELETE" });
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
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
      <header className="border-b px-6 py-4 flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.push("/clients")}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm whitespace-nowrap"
          >
            ← Clients
          </button>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl font-semibold whitespace-nowrap">{client.name}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Button onClick={() => setShowForm((v) => !v)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Project
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Client Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>{client.name}</CardTitle>
                <CardDescription className="space-y-0.5 mt-1">
                  {client.company && <p>{client.company}</p>}
                  {client.email && <p>{client.email}</p>}
                  {client.phone && <p>{client.phone}</p>}
                  {(() => {
                    const total = client.projects.some((p) => p.budget != null)
                      ? client.projects.reduce((sum, p) => sum + (p.budget ?? 0), 0)
                      : null;
                    return total != null ? (
                      <p className="flex items-center gap-1 text-green-600 font-medium">
                        <DollarSign className="h-3.5 w-3.5" />
                        {fmtCurrency(total)}
                      </p>
                    ) : null;
                  })()}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                onClick={handleDeleteClient}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
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
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Website redesign"
                      required
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="proj-desc">Description</Label>
                    <Input
                      id="proj-desc"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Short description..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="proj-deadline">Deadline</Label>
                    <Input
                      id="proj-deadline"
                      type="date"
                      value={form.deadline}
                      onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
              {client.projects.map((project) =>
                editingProjectId === project.id ? (
                  <Card key={project.id}>
                    <CardContent className="pt-4">
                      <form
                        onSubmit={(e) => handleEditProject(e, project.id)}
                        className="space-y-3"
                      >
                        <div className="space-y-1">
                          <Label>Name *</Label>
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
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
                            onClick={() => setEditingProjectId(null)}
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
                          {project.description && (
                            <CardDescription>{project.description}</CardDescription>
                          )}
                          {project.deadline && (
                            <CardDescription>
                              Deadline: {new Date(project.deadline).toLocaleDateString()}
                            </CardDescription>
                          )}
                          {project.budget != null && (
                            <CardDescription className="text-green-600 font-medium">
                              {fmtCurrency(project.budget)}
                            </CardDescription>
                          )}
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
                              onClick={(e) => startEditProject(project, e)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={(e) => handleDeleteProject(project.id, e)}
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
        </section>

        {/* Activity Log */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Activity Log ({activities.length})</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowActivityForm((v) => !v)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Activity
            </Button>
          </div>

          {/* Add Activity Form */}
          {showActivityForm && (
            <Card className="mb-4">
              <CardContent className="pt-4">
                <form onSubmit={handleAddActivity} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Type</Label>
                      <select
                        value={activityForm.type}
                        onChange={(e) =>
                          setActivityForm((f) => ({ ...f, type: e.target.value as ActivityType }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="CALL">Call</option>
                        <option value="MEETING">Meeting</option>
                        <option value="EMAIL">Email</option>
                        <option value="NOTE">Note</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={activityForm.date}
                        onChange={(e) =>
                          setActivityForm((f) => ({ ...f, date: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Note *</Label>
                    <Input
                      value={activityForm.note}
                      onChange={(e) =>
                        setActivityForm((f) => ({ ...f, note: e.target.value }))
                      }
                      placeholder="What happened..."
                      required
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowActivityForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={activitySubmitting}>
                      {activitySubmitting && (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      )}
                      Save
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Activities List */}
          {activitiesLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No activity yet. Log a call, meeting or email!
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${ACTIVITY_COLORS[activity.type]}`}
                  >
                    {ACTIVITY_ICONS[activity.type]}
                    {ACTIVITY_LABELS[activity.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.note}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(activity.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDeleteActivity(activity.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
