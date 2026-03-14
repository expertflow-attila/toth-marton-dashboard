"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Phase {
  id: string;
  phase_number: number;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "upcoming" | "in_progress" | "completed";
}

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    label: "Kész",
    dotClass: "bg-success",
    lineClass: "bg-success",
    badgeClass: "bg-success/10 text-success",
  },
  in_progress: {
    icon: Clock,
    label: "Folyamatban",
    dotClass: "bg-blue",
    lineClass: "bg-blue",
    badgeClass: "bg-blue/10 text-blue",
  },
  upcoming: {
    icon: Circle,
    label: "Következő",
    dotClass: "bg-border",
    lineClass: "bg-border",
    badgeClass: "bg-accent text-muted-foreground",
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function UtemtervPage() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [packageTier, setPackageTier] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: project } = await supabase
        .from("client_projects")
        .select("id, package_tier")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (project) {
        setPackageTier(project.package_tier);

        const { data: phasesData } = await supabase
          .from("client_phases")
          .select("*")
          .eq("project_id", project.id)
          .order("phase_number");

        if (phasesData) setPhases(phasesData);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const tierLabel =
    packageTier === "1mo"
      ? "1 hónapos program — 4 heti fázis"
      : packageTier === "3mo"
        ? "3 hónapos program — 3 havi fázis"
        : packageTier === "6mo"
          ? "6 hónapos program — 3 fázis (2+2+2 hónap)"
          : "";

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Ütemterv</h1>
        {tierLabel && (
          <p className="mt-1 text-sm text-muted-foreground">{tierLabel}</p>
        )}
      </div>

      {phases.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-card p-8 text-center">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Még nincs beállítva ütemterv. Hamarosan elkészítjük!
          </p>
        </div>
      ) : (
        <div className="relative">
          {phases.map((phase, index) => {
            const config = statusConfig[phase.status];
            const StatusIcon = config.icon;
            const isLast = index === phases.length - 1;

            return (
              <div key={phase.id} className="relative flex gap-4 pb-8">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      phase.status === "in_progress"
                        ? "ring-4 ring-blue/20"
                        : ""
                    } ${config.dotClass}`}
                  >
                    <StatusIcon
                      className={`h-4 w-4 ${
                        phase.status === "upcoming"
                          ? "text-muted-foreground"
                          : "text-white"
                      }`}
                    />
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 flex-1 ${
                        phase.status === "completed"
                          ? config.lineClass
                          : "bg-border"
                      }`}
                    />
                  )}
                </div>

                {/* Content */}
                <div
                  className={`flex-1 rounded-[var(--radius)] border bg-card p-5 ${
                    phase.status === "in_progress"
                      ? "border-blue/30"
                      : "border-border"
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {phase.phase_number}. {phase.title}
                      </h3>
                      {(phase.start_date || phase.end_date) && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(phase.start_date)} —{" "}
                          {formatDate(phase.end_date)}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${config.badgeClass}`}
                    >
                      {config.label}
                    </span>
                  </div>
                  {phase.description && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {phase.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
