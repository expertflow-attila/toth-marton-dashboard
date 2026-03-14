import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { message, project_id } = await request.json();

    if (!message || !project_id) {
      return new Response(
        JSON.stringify({ error: "Hiányzó adatok." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Nem vagy bejelentkezve." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify user owns this project
    const { data: project } = await supabase
      .from("client_projects")
      .select("id, client_name, business_name, package_tier, package_name, start_date")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (!project) {
      return new Response(
        JSON.stringify({ error: "Projekt nem található." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get project phases for context
    const { data: phases } = await supabase
      .from("client_phases")
      .select("phase_number, title, status, start_date, end_date")
      .eq("project_id", project_id)
      .order("phase_number");

    // Get recent tasks for context
    const { data: tasks } = await supabase
      .from("client_tasks")
      .select("title, status, due_date")
      .eq("project_id", project_id)
      .order("due_date", { ascending: true })
      .limit(20);

    // Save user message
    await supabase.from("client_chat_messages").insert({
      project_id,
      user_id: user.id,
      role: "user",
      content: message,
    });

    // Get recent chat history for context
    const { data: chatHistory } = await supabase
      .from("client_chat_messages")
      .select("role, content")
      .eq("project_id", project_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Build system prompt
    const packageLabels: Record<string, string> = {
      "1mo": "Gyorsstart (1 hónapos)",
      "3mo": "Fejlődés (3 hónapos)",
      "6mo": "Transzformáció (6 hónapos)",
    };

    const phasesSummary = phases
      ?.map(
        (p) =>
          `  ${p.phase_number}. ${p.title} — ${p.status === "completed" ? "Kész" : p.status === "in_progress" ? "Folyamatban" : "Következő"}`
      )
      .join("\n") || "Még nincs ütemterv beállítva.";

    const tasksSummary = tasks
      ?.map(
        (t) =>
          `  - ${t.title} (${t.status === "completed" ? "Kész" : t.status === "in_progress" ? "Folyamatban" : "Várakozik"})`
      )
      .join("\n") || "Még nincsenek feladatok.";

    const systemPrompt = `Te az Expert Flow személyes AI asszisztense vagy. Segítesz a kliensnek a projektjével kapcsolatos kérdésekben. Magyarul válaszolj. Légy segítőkész, tárgyilagos és professzionális.

Kliens információk:
- Név: ${project.client_name}
- Vállalkozás: ${project.business_name}
- Csomag: ${packageLabels[project.package_tier] || project.package_name}
- Kezdés dátuma: ${project.start_date || "Még nem kezdődött"}

Projekt fázisok:
${phasesSummary}

Aktuális feladatok:
${tasksSummary}

Fontos szabályok:
- Csak a projekttel kapcsolatos témákban segíts.
- Ha olyan kérdést kap amit nem tudsz megválaszolni, ajánld fel hogy kérje az Expert Flow csapatot (hello@expertflow.hu).
- Ne találd ki információkat — ha nem vagy biztos, mondd el őszintén.
- Röviden és lényegretörően válaszolj.`;

    // Build messages for API
    const apiMessages: Array<{ role: string; content: string }> = [];

    // Add chat history (reversed to chronological)
    if (chatHistory) {
      const reversed = [...chatHistory].reverse().slice(0, -1); // exclude current message
      for (const msg of reversed) {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current message
    apiMessages.push({ role: "user", content: message });

    // Call Anthropic API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API kulcs nincs beállítva." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!anthropicRes.ok) {
      const errorBody = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errorBody);
      return new Response(
        JSON.stringify({ error: "AI szolgáltatás hiba." }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream the response
    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicRes.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  if (
                    parsed.type === "content_block_delta" &&
                    parsed.delta?.text
                  ) {
                    const text = parsed.delta.text;
                    fullResponse += text;
                    controller.enqueue(encoder.encode(text));
                  }
                } catch {
                  // Skip unparseable chunks
                }
              }
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
        } finally {
          controller.close();

          // Save assistant response
          if (fullResponse) {
            const saveSupabase = await createClient();
            await saveSupabase.from("client_chat_messages").insert({
              project_id,
              user_id: user.id,
              role: "assistant",
              content: fullResponse,
            });
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("AI chat error:", err);
    return new Response(
      JSON.stringify({ error: "Szerverhiba." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
