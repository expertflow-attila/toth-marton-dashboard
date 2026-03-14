"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckSquare,
  FileText,
  Bot,
  ExternalLink,
  FolderOpen,
  ChevronRight,
  Loader2,
  Package,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Project {
  id: string;
  client_name: string;
  business_name: string;
  package_tier: string;
  package_name: string;
  total_price: number;
  status: string;
  start_date: string | null;
  google_drive_url: string | null;
  telegram_link: string | null;
}

interface Phase {
  id: string;
  phase_number: number;
  title: string;
  status: string;
}

interface Task {
  id: string;
  status: string;
}

const packageLabels: Record<string, string> = {
  "1mo": "Gyorsstart",
  "3mo": "Fejlődés",
  "6mo": "Transzformáció",
};

const quickLinks = [
  { href: "/dashboard/utemterv", label: "Ütemterv", icon: CalendarDays },
  { href: "/dashboard/feladatok", label: "Feladatok", icon: CheckSquare },
  { href: "/dashboard/dokumentumok", label: "Dokumentumok", icon: FileText },
  {
    href: "/dashboard/ai-asszisztens",
    label: "AI Asszisztens",
    icon: Bot,
  },
];

export default function DashboardPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get user name
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setUserName(
          `${profileData.last_name || ""} ${profileData.first_name || ""}`.trim()
        );
      } else {
        const meta = user.user_metadata;
        setUserName(
          `${meta?.last_name || meta?.family_name || ""} ${meta?.first_name || meta?.given_name || ""}`.trim() ||
            user.email ||
            ""
        );
      }

      // Get project
      const { data: projectData } = await supabase
        .from("client_projects")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (projectData) {
        setProject(projectData);

        // Get phases
        const { data: phasesData } = await supabase
          .from("client_phases")
          .select("id, phase_number, title, status")
          .eq("project_id", projectData.id)
          .order("phase_number");

        if (phasesData) setPhases(phasesData);

        // Get tasks
        const { data: tasksData } = await supabase
          .from("client_tasks")
          .select("id, status")
          .eq("project_id", projectData.id);

        if (tasksData) setTasks(tasksData);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const completedPhases = phases.filter((p) => p.status === "completed").length;
  const currentPhase = phases.find((p) => p.status === "in_progress");

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">
          Üdv, {userName || "Felhasználó"}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {project
            ? `${project.business_name} — ${packageLabels[project.package_tier] || project.package_name}`
            : "Itt látható a személyes irányítópultod."}
        </p>
      </div>

      {/* Package + Progress */}
      {project ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {/* Package info */}
          <div className="rounded-[var(--radius)] border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-[var(--radius)] bg-accent p-2.5">
                <Package className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Csomag</p>
                <p className="mt-0.5 text-base font-semibold text-foreground">
                  {packageLabels[project.package_tier] || project.package_name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {project.package_tier === "1mo"
                    ? "1 hónapos program"
                    : project.package_tier === "3mo"
                      ? "3 hónapos program"
                      : "6 hónapos program"}
                </p>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="rounded-[var(--radius)] border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Összes haladás</p>
              <span className="text-sm font-semibold text-foreground">
                {progressPercent}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-border">
              <div
                className="h-2 rounded-full bg-blue transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span>
                {completedPhases}/{phases.length} fázis
              </span>
              <span>
                {completedTasks}/{totalTasks} feladat
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-[var(--radius)] border border-border bg-card p-6 text-center">
          <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Még nincs aktív projektod. Hamarosan beállítjuk!
          </p>
        </div>
      )}

      {/* Current phase */}
      {currentPhase && (
        <div className="mb-8 rounded-[var(--radius)] border border-blue/30 bg-blue/5 p-5">
          <p className="text-xs font-medium text-blue">Aktuális fázis</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {currentPhase.phase_number}. {currentPhase.title}
          </p>
          <Link
            href="/dashboard/utemterv"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue hover:underline"
          >
            Részletek megtekintése
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="mb-8">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Gyors navigáció
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3.5 transition-colors hover:border-muted-foreground/30"
              >
                <Icon className="h-[18px] w-[18px] text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {link.label}
                </span>
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* External links */}
      {project && (project.google_drive_url || project.telegram_link) && (
        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Külső linkek
          </h2>
          <div className="flex flex-wrap gap-3">
            {project.google_drive_url && (
              <a
                href={project.google_drive_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors hover:border-muted-foreground/30"
              >
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                Google Drive
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            )}
            {project.telegram_link && (
              <a
                href={project.telegram_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors hover:border-muted-foreground/30"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                Telegram csoport
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
