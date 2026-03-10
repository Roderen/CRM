"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Users, FolderKanban, CheckSquare, Loader2, AlertTriangle, Clock, ListTodo, FileText, TrendingUp } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { fmtCurrency } from "@/lib/format";

interface ProjectRow {
  id: string;
  name: string;
  deadline: string;
  status: string;
  client: { id: string; name: string };
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  project: { id: string; name: string };
}

interface Stats {
  clientsCount: number;
  projects: { planned: number; inProgress: number; completed: number };
  tasksInProgress: number;
  overdueProjects: ProjectRow[];
  weekDeadlines: ProjectRow[];
  activeTasks: TaskRow[];
  revenueByMonth: { month: string; revenue: number }[];
  totalRevenue: number;
  invoices: { draft: number; sent: number; paid: number; overdue: number };
}

function formatDeadline(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function daysLeft(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function daysOverdue(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.ceil(diff / 86400000);
  return days === 1 ? "1 day" : `${days} days`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => { if (data.clientsCount !== undefined) setStats(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between gap-4 overflow-x-auto">
        <h1 className="text-xl font-semibold whitespace-nowrap shrink-0">CRM Dashboard</h1>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <UserButton />
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-8">
        {/* Navigation */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Navigation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/clients">
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle>Clients</CardTitle>
                      <CardDescription>Manage your clients</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/projects">
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <FolderKanban className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle>Projects</CardTitle>
                      <CardDescription>View all projects</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/invoices">
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle>Invoices</CardTitle>
                      <CardDescription>Manage invoices & payments</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </section>

        {/* Counts */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Overview</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <StatCard label="Clients" value={stats?.clientsCount ?? 0} color="text-blue-500" />
              <StatCard label="Planned" value={stats?.projects.planned ?? 0} color="text-slate-500" sub="projects" />
              <StatCard label="In Progress" value={stats?.projects.inProgress ?? 0} color="text-amber-500" sub="projects" />
              <StatCard label="Completed" value={stats?.projects.completed ?? 0} color="text-green-500" sub="projects" />
              <StatCard label="Tasks in Progress" value={stats?.tasksInProgress ?? 0} color="text-purple-500" sub="tasks" />
            </div>
          )}
        </section>

        {/* Charts */}
        {!loading && stats && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Revenue (6 months)
                    </CardTitle>
                    <CardDescription className="text-xl font-bold text-foreground mt-1">
                      {fmtCurrency(stats.totalRevenue)}
                    </CardDescription>
                  </div>
                  <Link href="/invoices" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    View invoices →
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <RevenueChart data={stats.revenueByMonth} />
              </CardContent>
            </Card>

            {/* Projects + Invoices breakdown */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <FolderKanban className="h-4 w-4 text-blue-500" />
                    Projects by Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProjectStatusBar
                    planned={stats.projects.planned}
                    inProgress={stats.projects.inProgress}
                    completed={stats.projects.completed}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-purple-500" />
                    Invoices by Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InvoiceStatusBar invoices={stats.invoices} />
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Alerts */}
        {!loading && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Overdue */}
            <AlertCard
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
              title="Overdue Projects"
              count={stats?.overdueProjects.length ?? 0}
              emptyText="No overdue projects"
              accentClass="border-red-200 dark:border-red-800"
            >
              {stats?.overdueProjects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <div className="flex items-start justify-between gap-2 py-2 px-3 rounded-md hover:bg-accent transition-colors cursor-pointer">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.client.name}</p>
                    </div>
                    <span className="text-xs text-red-500 whitespace-nowrap shrink-0 mt-0.5">
                      +{daysOverdue(p.deadline)}
                    </span>
                  </div>
                </Link>
              ))}
            </AlertCard>

            {/* Week deadlines */}
            <AlertCard
              icon={<Clock className="h-4 w-4 text-amber-500" />}
              title="Deadlines This Week"
              count={stats?.weekDeadlines.length ?? 0}
              emptyText="No deadlines this week"
              accentClass="border-amber-200 dark:border-amber-800"
            >
              {stats?.weekDeadlines.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <div className="flex items-start justify-between gap-2 py-2 px-3 rounded-md hover:bg-accent transition-colors cursor-pointer">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.client.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">{formatDeadline(p.deadline)}</p>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">{daysLeft(p.deadline)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </AlertCard>

            {/* Active tasks */}
            <AlertCard
              icon={<ListTodo className="h-4 w-4 text-blue-500" />}
              title="Active Tasks"
              count={stats?.activeTasks.length ?? 0}
              emptyText="No active tasks"
              accentClass="border-blue-200 dark:border-blue-800"
            >
              {stats?.activeTasks.map((t) => (
                <Link key={t.id} href={`/projects/${t.project.id}`}>
                  <div className="flex items-start justify-between gap-2 py-2 px-3 rounded-md hover:bg-accent transition-colors cursor-pointer">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.project.name}</p>
                    </div>
                    <span className={`text-xs whitespace-nowrap shrink-0 mt-0.5 ${t.status === "IN_PROGRESS" ? "text-amber-500" : "text-muted-foreground"}`}>
                      {t.status === "IN_PROGRESS" ? "in progress" : "todo"}
                    </span>
                  </div>
                </Link>
              ))}
            </AlertCard>
          </section>
        )}

      </main>
    </div>
  );
}

// ── Chart components ──────────────────────────────────────────────────────────

function RevenueChart({ data }: { data: { month: string; revenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const hasAny = data.some((d) => d.revenue > 0);

  if (!hasAny) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No paid invoices yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1.5 h-28">
        {data.map(({ month, revenue }) => {
          const heightPct = revenue > 0 ? Math.max((revenue / max) * 100, 4) : 0;
          return (
            <div key={month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
              {revenue > 0 && (
                <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none">
                  <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-background border rounded px-1 py-0.5 shadow-sm">
                    {fmtCurrency(revenue)}
                  </span>
                </div>
              )}
              <div
                className="w-full bg-green-500/80 hover:bg-green-500 rounded-t transition-colors"
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        {data.map(({ month }) => (
          <div key={month} className="flex-1 text-center">
            <span className="text-[10px] text-muted-foreground">{month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectStatusBar({
  planned,
  inProgress,
  completed,
}: {
  planned: number;
  inProgress: number;
  completed: number;
}) {
  const total = planned + inProgress + completed;

  if (total === 0) {
    return <p className="text-sm text-muted-foreground py-1">No projects yet</p>;
  }

  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;

  return (
    <div className="space-y-3">
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
        {planned > 0 && (
          <div className="bg-slate-400 rounded-full" style={{ width: `${(planned / total) * 100}%` }} />
        )}
        {inProgress > 0 && (
          <div className="bg-blue-500 rounded-full" style={{ width: `${(inProgress / total) * 100}%` }} />
        )}
        {completed > 0 && (
          <div className="bg-green-500 rounded-full" style={{ width: `${(completed / total) * 100}%` }} />
        )}
      </div>
      <div className="grid grid-cols-3 gap-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
          <span className="text-muted-foreground truncate">{planned} <span className="hidden sm:inline">Planned</span></span>
          <span className="text-muted-foreground ml-auto">{pct(planned)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
          <span className="text-muted-foreground truncate">{inProgress} <span className="hidden sm:inline">Active</span></span>
          <span className="text-muted-foreground ml-auto">{pct(inProgress)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
          <span className="text-muted-foreground truncate">{completed} <span className="hidden sm:inline">Done</span></span>
          <span className="text-muted-foreground ml-auto">{pct(completed)}</span>
        </div>
      </div>
    </div>
  );
}

function InvoiceStatusBar({
  invoices,
}: {
  invoices: { draft: number; sent: number; paid: number; overdue: number };
}) {
  const { draft, sent, paid, overdue } = invoices;
  const total = draft + sent + paid + overdue;

  if (total === 0) {
    return <p className="text-sm text-muted-foreground py-1">No invoices yet</p>;
  }

  const items = [
    { label: "Draft", value: draft, color: "bg-slate-400" },
    { label: "Sent", value: sent, color: "bg-blue-400" },
    { label: "Paid", value: paid, color: "bg-green-500" },
    { label: "Overdue", value: overdue, color: "bg-red-500" },
  ].filter((i) => i.value > 0);

  return (
    <div className="space-y-3">
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
        {items.map(({ label, value, color }) => (
          <div
            key={label}
            className={`${color} rounded-full`}
            style={{ width: `${(value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs">
        {items.map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${color} shrink-0`} />
            <span className="text-muted-foreground">{value} {label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function StatCard({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        <p className="text-sm font-medium mt-1">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function AlertCard({
  icon,
  title,
  count,
  emptyText,
  accentClass,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  emptyText: string;
  accentClass: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`border ${accentClass}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {count > 0 && (
            <span className="ml-auto text-xs bg-muted rounded-full px-2 py-0.5">{count}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {count === 0 ? (
          <p className="text-xs text-muted-foreground py-2">{emptyText}</p>
        ) : (
          <div className="space-y-0.5">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}
