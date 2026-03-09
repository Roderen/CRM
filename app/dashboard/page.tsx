"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Users, FolderKanban, CheckSquare, Loader2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface Stats {
  clientsCount: number;
  projects: {
    planned: number;
    inProgress: number;
    completed: number;
  };
  tasksInProgress: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">CRM Dashboard</h1>
        <UserButton />
      </header>

      <main className="p-6 max-w-4xl mx-auto space-y-8">
        {/* Stats */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Overview</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading stats…</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Clients"
                value={stats?.clientsCount ?? 0}
                color="text-blue-500"
              />
              <StatCard
                label="Planned"
                value={stats?.projects.planned ?? 0}
                color="text-slate-500"
                sub="projects"
              />
              <StatCard
                label="In Progress"
                value={stats?.projects.inProgress ?? 0}
                color="text-amber-500"
                sub="projects"
              />
              <StatCard
                label="Completed"
                value={stats?.projects.completed ?? 0}
                color="text-green-500"
                sub="projects"
              />
            </div>
          )}
          {!loading && (
            <div className="mt-4">
              <Card className="max-w-[200px] border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="pt-4 flex items-center gap-3">
                  <CheckSquare className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-2xl font-bold">{stats?.tasksInProgress ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Tasks in progress</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        {/* Navigation */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Navigation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: number;
  color: string;
  sub?: string;
}) {
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
