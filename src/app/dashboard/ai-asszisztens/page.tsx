"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export default function AIAsszisztensPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        setProjectId(project.id);

        // Load existing messages
        const { data: messagesData } = await supabase
          .from("client_chat_messages")
          .select("*")
          .eq("project_id", project.id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(50);

        if (messagesData) setMessages(messagesData);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Optimistic user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, project_id: projectId }),
      });

      if (!res.ok) {
        throw new Error("Hiba történt a válasz generálása során.");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("Nem sikerült olvasni a választ.");

      // Add placeholder assistant message
      const tempAssistantId = `temp-assistant-${Date.now()}`;
      const tempAssistantMsg: Message = {
        id: tempAssistantId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempAssistantMsg]);

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId ? { ...m, content: fullContent } : m
          )
        );
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          err.message ||
          "Hiba történt. Kérlek próbáld újra később.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:h-screen">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">
          AI Asszisztens
        </h1>
        <p className="text-xs text-muted-foreground">
          Kérdezhetsz a projekteddel kapcsolatban.
        </p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Bot className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Szia! Miben segíthetek?
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Kérdezz bármit a projekteddel kapcsolatban.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
                    <Bot className="h-4 w-4 text-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-[var(--radius)] px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue text-blue-foreground"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.role === "assistant" &&
                    sending &&
                    msg.content === "" && (
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:0.2s]" />
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:0.4s]" />
                      </div>
                    )}
                </div>
                {msg.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
                    <User className="h-4 w-4 text-foreground" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border px-6 py-4">
        <div className="mx-auto max-w-2xl">
          {!projectId ? (
            <p className="text-center text-xs text-muted-foreground">
              Az AI asszisztens aktív projekt nélkül nem elérhető.
            </p>
          ) : (
            <div className="flex items-end gap-3 rounded-[var(--radius)] border border-border bg-card p-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoResize();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Írj egy üzenetet..."
                rows={1}
                className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-blue text-blue-foreground transition-colors hover:bg-blue/90 disabled:opacity-40"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
