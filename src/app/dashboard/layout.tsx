"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  CalendarDays,
  CheckSquare,
  FileText,
  Bot,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
}

const navItems = [
  { href: "/dashboard", label: "Kezdőlap", icon: Home },
  { href: "/dashboard/utemterv", label: "Ütemterv", icon: CalendarDays },
  { href: "/dashboard/feladatok", label: "Feladatok", icon: CheckSquare },
  { href: "/dashboard/dokumentumok", label: "Dokumentumok", icon: FileText },
  { href: "/dashboard/ai-asszisztens", label: "AI Asszisztens", icon: Bot },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("ef-theme");
    if (stored === "light") {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      } else {
        setProfile({
          first_name:
            user.user_metadata?.first_name ||
            user.user_metadata?.given_name ||
            "",
          last_name:
            user.user_metadata?.last_name ||
            user.user_metadata?.family_name ||
            "",
          email: user.email || "",
          avatar_url:
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            null,
        });
      }

      setLoading(false);
    }

    loadUser();
  }, [router]);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("ef-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("ef-theme", "light");
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const displayName =
    profile?.first_name || profile?.last_name
      ? `${profile.last_name} ${profile.first_name}`.trim()
      : profile?.email || "";

  const initials = profile
    ? `${(profile.first_name || "")[0] || ""}${(profile.last_name || "")[0] || ""}`.toUpperCase() ||
      "?"
    : "?";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link
            href="/dashboard"
            className="font-serif text-lg tracking-tight text-foreground"
          >
            Expert Flow
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-[var(--radius)] p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue text-blue-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-medium text-foreground">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile?.email}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleTheme}
              className="flex-1 rounded-[var(--radius)] px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={darkMode ? "Világos mód" : "Sötét mód"}
            >
              {darkMode ? (
                <Sun className="mx-auto h-4 w-4" />
              ) : (
                <Moon className="mx-auto h-4 w-4" />
              )}
            </button>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius)] px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span>Kilépés</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-16 items-center border-b border-border px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-[var(--radius)] p-2 text-muted-foreground hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 font-serif text-lg tracking-tight text-foreground">
            Expert Flow
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
