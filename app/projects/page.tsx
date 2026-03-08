"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FolderKanban } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

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

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data))
      .finally(() => setLoading(false));
  }, []);

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
            {projects.map((project) => (
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
                  <CardDescription className="space-y-0.5">
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
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
