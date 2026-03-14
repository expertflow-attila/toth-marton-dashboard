"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  FolderOpen,
  Loader2,
  File,
  FileImage,
  FileSpreadsheet,
  Presentation,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
}

const fileTypeIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  ppt: Presentation,
  pptx: Presentation,
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DokumentumokPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [googleDriveUrl, setGoogleDriveUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: project } = await supabase
        .from("client_projects")
        .select("id, google_drive_url")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (project) {
        setGoogleDriveUrl(project.google_drive_url);

        const { data: docsData } = await supabase
          .from("client_documents")
          .select("*")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false });

        if (docsData) setDocuments(docsData);
      }

      setLoading(false);
    }

    loadData();
  }, []);

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
        <h1 className="text-2xl font-semibold text-foreground">Dokumentumok</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Projekt dokumentumok, sablonok és anyagok.
        </p>
      </div>

      {/* Google Drive link */}
      {googleDriveUrl && (
        <a
          href={googleDriveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 flex items-center gap-3 rounded-[var(--radius)] border border-blue/30 bg-blue/5 p-4 transition-colors hover:bg-blue/10"
        >
          <div className="rounded-[var(--radius)] bg-blue/10 p-2.5">
            <FolderOpen className="h-5 w-5 text-blue" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Google Drive mappa
            </p>
            <p className="text-xs text-muted-foreground">
              Töltsd fel ide a fájljaidat, vagy tekintsd meg a megosztott
              anyagokat.
            </p>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
        </a>
      )}

      {/* Documents list */}
      {documents.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-card p-8 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Még nincsenek dokumentumok feltöltve.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const ext = doc.file_type?.toLowerCase() || "";
            const IconComponent = fileTypeIcons[ext] || File;

            return (
              <div
                key={doc.id}
                className="flex items-center gap-4 rounded-[var(--radius)] border border-border bg-card p-4"
              >
                <div className="rounded-[var(--radius)] bg-accent p-2.5">
                  <IconComponent className="h-5 w-5 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {doc.title}
                  </p>
                  {doc.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {doc.description}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDate(doc.created_at)}
                    {doc.file_type && ` · ${doc.file_type.toUpperCase()}`}
                  </p>
                </div>
                {doc.file_url && (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-[var(--radius)] p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Letöltés"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
