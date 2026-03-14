"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  CheckSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Phase {
  id: string;
  phase_number: number;
  title: string;
  status: string;
}

interface Task {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  due_date: string | null;
}

const taskStatusConfig = {
  completed: {
    icon: CheckCircle2,
    label: "Kész",
    className: "text-success",
    badgeClass: "bg-success/10 text-success",
  },
  in_progress: {
    icon: Clock,
    label: "Folyamatban",
    className: "text-blue",
    badgeClass: "bg-blue/10 text-blue",
  },
  pending: {
    icon: Circle,
    label: "Várakozik",
    className: "text-muted-foreground",
    badgeClass: "bg-accent text-muted-foreground",
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("hu-HU", {
    month: "short",
    day: "numeric",
  });
}

export default function FeladatokPage() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: project } = await supabase
        .from("client_projects")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (project) {
        const { data: phasesData } = await supabase
          .from("client_phases")
          .select("id, phase_number, title, status")
          .eq("project_id", project.id)
          .order("phase_number");

        if (phasesData) setPhases(phasesData);

        const { data: tasksData } = await supabase
          .from("client_tasks")
          .select("*")
          .eq("project_id", project.id)
          .order("due_date", { ascending: true });

        if (tasksData) setTasks(tasksData);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const filteredTasks =
    filterStatus === "all"
      ? tasks
      : tasks.filter((t) => t.status === filterStatus);

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressCount = tasks.filter(
    (t) => t.status === "in_progress"
  ).length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;

  // Group tasks by phase
  const tasksByPhase = phases
    .map((phase) => ({
      phase,
      tasks: filteredTasks.filter((t) => t.phase_id === phase.id),
    }))
    .filter((group) => group.tasks.length > 0);

  // Tasks without phase
  const orphanTasks = filteredTasks.filter(
    (t) => !phases.find((p) => p.id === t.phase_id)
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Feladatok</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tasks.length > 0
            ? `${completedCount} kész, ${inProgressCount} folyamatban, ${pendingCount} várakozik`
            : "A feladataid itt jelennek meg."}
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-card p-8 text-center">
          <CheckSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Még nincsenek feladatok beállítva.
          </p>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="mb-6 flex gap-2">
            {[
              { key: "all", label: `Mind (${tasks.length})` },
              { key: "in_progress", label: `Folyamatban (${inProgressCount})` },
              { key: "pending", label: `Várakozik (${pendingCount})` },
              { key: "completed", label: `Kész (${completedCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`rounded-[var(--radius)] px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterStatus === tab.key
                    ? "bg-blue text-blue-foreground"
                    : "bg-accent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Task groups */}
          <div className="space-y-6">
            {tasksByPhase.map(({ phase, tasks: groupTasks }) => (
              <div key={phase.id}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {phase.phase_number}. fázis — {phase.title}
                </h2>
                <div className="space-y-2">
                  {groupTasks.map((task) => {
                    const config = taskStatusConfig[task.status];
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 rounded-[var(--radius)] border border-border bg-card p-4"
                      >
                        <StatusIcon
                          className={`mt-0.5 h-5 w-5 shrink-0 ${config.className}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm font-medium ${
                                task.status === "completed"
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              }`}
                            >
                              {task.title}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${config.badgeClass}`}
                            >
                              {config.label}
                            </span>
                          </div>
                          {task.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {task.description}
                            </p>
                          )}
                          {task.due_date && (
                            <p className="mt-1.5 text-[11px] text-muted-foreground">
                              Határidő: {formatDate(task.due_date)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {orphanTasks.length > 0 && (
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Egyéb feladatok
                </h2>
                <div className="space-y-2">
                  {orphanTasks.map((task) => {
                    const config = taskStatusConfig[task.status];
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 rounded-[var(--radius)] border border-border bg-card p-4"
                      >
                        <StatusIcon
                          className={`mt-0.5 h-5 w-5 shrink-0 ${config.className}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm font-medium ${
                                task.status === "completed"
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              }`}
                            >
                              {task.title}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${config.badgeClass}`}
                            >
                              {config.label}
                            </span>
                          </div>
                          {task.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {task.description}
                            </p>
                          )}
                          {task.due_date && (
                            <p className="mt-1.5 text-[11px] text-muted-foreground">
                              Határidő: {formatDate(task.due_date)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
