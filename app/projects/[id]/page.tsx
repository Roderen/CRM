"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2, Check, Paperclip, Upload, X, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

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

interface Attachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  url: string | null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function fetchProject() {
      setLoading(true);
      try {
        const [projRes, attRes] = await Promise.all([
          fetch(`/api/projects/${id}/tasks`),
          fetch(`/api/projects/${id}/attachments`),
        ]);
        if (projRes.status === 404) { setNotFound(true); return; }
        const data: Project = await projRes.json();
        setProject(data);
        setNotes(data.notes ?? "");
        if (attRes.ok) {
          const atts: Attachment[] = await attRes.json();
          setAttachments(atts);
        }
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/projects/${id}/attachments`, {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        const att: Attachment = await res.json();
        setAttachments((prev) => [att, ...prev]);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attId: string) {
    setDeletingId(attId);
    try {
      const res = await fetch(`/api/attachments/${attId}`, { method: "DELETE" });
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== attId));
      }
    } finally {
      setDeletingId(null);
    }
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
      <header className="border-b px-6 py-4 flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.push("/clients")}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm whitespace-nowrap"
          >
            Clients
          </button>
          <span className="text-muted-foreground shrink-0">/</span>
          <button
            onClick={() => router.push(`/clients/${project.clientId}`)}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm whitespace-nowrap"
          >
            {project.client.name}
          </button>
          <span className="text-muted-foreground shrink-0">/</span>
          <h1 className="text-base font-semibold whitespace-nowrap">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saved && !saving && <Check className="h-3.5 w-3.5 text-green-500" />}
            <span>{saving ? "Saving…" : saved ? "Saved" : ""}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col gap-8">
        <TiptapEditor value={notes} onChange={handleNotesChange} />

        {/* Attachments */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Paperclip className="h-4 w-4" />
              <span>Attachments</span>
              {attachments.length > 0 && (
                <span className="text-muted-foreground font-normal">({attachments.length})</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Upload className="h-3.5 w-3.5 mr-1.5" />
              )}
              {uploading ? "Uploading…" : "Upload file"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {attachments.length === 0 && !uploading && (
            <p className="text-sm text-muted-foreground">No attachments yet.</p>
          )}

          {attachments.length > 0 && (
            <div className="flex flex-col gap-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 rounded-lg border px-4 py-3"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{att.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(att.size)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {att.url && (
                      <a href={att.url} target="_blank" rel="noopener noreferrer" download={att.name}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(att.id)}
                      disabled={deletingId === att.id}
                    >
                      {deletingId === att.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
