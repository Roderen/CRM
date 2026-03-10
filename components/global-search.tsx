"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, FolderKanban, CheckSquare, FileText, Loader2 } from "lucide-react";

interface SearchResult {
  clients: { id: string; name: string; email?: string | null; company?: string | null }[];
  projects: { id: string; name: string; status: string; client: { name: string } }[];
  tasks: { id: string; title: string; status: string; projectId: string; project: { name: string } }[];
  invoices: { id: string; number: string; status: string; client: { name: string } }[];
}

type FlatItem =
  | { type: "client"; id: string; label: string; sub: string; href: string }
  | { type: "project"; id: string; label: string; sub: string; href: string }
  | { type: "task"; id: string; label: string; sub: string; href: string }
  | { type: "invoice"; id: string; label: string; sub: string; href: string };

function flattenResults(r: SearchResult): FlatItem[] {
  return [
    ...r.clients.map((c) => ({
      type: "client" as const,
      id: c.id,
      label: c.name,
      sub: c.company ?? c.email ?? "Client",
      href: `/clients/${c.id}`,
    })),
    ...r.projects.map((p) => ({
      type: "project" as const,
      id: p.id,
      label: p.name,
      sub: p.client.name,
      href: `/projects/${p.id}`,
    })),
    ...r.tasks.map((t) => ({
      type: "task" as const,
      id: t.id,
      label: t.title,
      sub: t.project.name,
      href: `/projects/${t.projectId}`,
    })),
    ...r.invoices.map((i) => ({
      type: "invoice" as const,
      id: i.id,
      label: i.number,
      sub: i.client.name,
      href: `/invoices/${i.id}`,
    })),
  ];
}

const typeIcon: Record<string, React.ReactNode> = {
  client: <Users className="h-3.5 w-3.5 text-blue-500" />,
  project: <FolderKanban className="h-3.5 w-3.5 text-amber-500" />,
  task: <CheckSquare className="h-3.5 w-3.5 text-purple-500" />,
  invoice: <FileText className="h-3.5 w-3.5 text-green-500" />,
};

const typeLabel: Record<string, string> = {
  client: "Client",
  project: "Project",
  task: "Task",
  invoice: "Invoice",
};

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FlatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data: SearchResult) => {
        setResults(flattenResults(data));
        setOpen(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cmd/Ctrl+K to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const navigate = (item: FlatItem) => {
    router.push(item.href);
    setOpen(false);
    setQuery("");
    setCursor(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, -1)); }
    else if (e.key === "Enter" && cursor >= 0) { navigate(results[cursor]); }
    else if (e.key === "Escape") { setOpen(false); setCursor(-1); inputRef.current?.blur(); }
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setCursor(-1); }}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          onKeyDown={onKeyDown}
          placeholder="Search… ⌘K"
          className="w-full h-9 rounded-md border bg-background pl-8 pr-8 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border bg-popover shadow-md overflow-hidden">
          {results.map((item, i) => (
            <button
              key={`${item.type}-${item.id}`}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                i === cursor ? "bg-accent" : "hover:bg-accent"
              }`}
              onMouseEnter={() => setCursor(i)}
              onMouseDown={(e) => { e.preventDefault(); navigate(item); }}
            >
              {typeIcon[item.type]}
              <span className="flex-1 min-w-0">
                <span className="font-medium truncate block">{item.label}</span>
                <span className="text-xs text-muted-foreground truncate block">{item.sub}</span>
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0 bg-muted rounded px-1.5 py-0.5">
                {typeLabel[item.type]}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border bg-popover shadow-md px-3 py-4 text-sm text-muted-foreground text-center">
          No results for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
