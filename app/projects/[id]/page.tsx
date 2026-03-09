"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const TiptapEditor = dynamic(() => import("@/components/tiptap-editor"), {
  ssr: false,
});

interface Project {
  id: string;
  name: string;
  clientId: string;
  client: { id: string; name: string };
  notes: string | null;
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function fetchProject() {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${id}/tasks`);
        if (res.status === 404) { setNotFound(true); return; }
        const data: Project = await res.json();
        setProject(data);
        setNotes(data.notes ?? "");
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [id]);

  const saveNotes = useCallback(
    async (value: string) => {
      setSaving(true);
      try {
        await fetch(`/api/projects/${id}/notes`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: value }),
        });
        setSaved(true);
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setSaved(false), 3000);
      } finally {
        setSaving(false);
      }
    },
    [id]
  );

  function handleNotesChange(value: string) {
    setNotes(value);
    setSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNotes(value), 1500);
  }

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
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-[80px] justify-end">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saved && !saving && <Check className="h-3.5 w-3.5 text-green-500" />}
          <span>{saving ? "Saving…" : saved ? "Saved" : ""}</span>
        </div>
      </header>

      <main className="flex-1 p-6">
        <TiptapEditor value={notes} onChange={handleNotesChange} />
      </main>
    </div>
  );
}
