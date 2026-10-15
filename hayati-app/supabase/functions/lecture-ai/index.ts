// DW-021 phase 2 — lecture notes → summary / practice questions.
// Secrets (Supabase → Edge Functions → Secrets, never in the app or repo):
//   ANTHROPIC_API_KEY  required
//   AI_MODEL           optional, default claude-opus-5-5 (claude-haiku-5-5 is ~35× cheaper)
//   AI_DAILY_LIMIT     optional, default 10 calls per user per day
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SCHEMAS = {
  summary: {
    type: "object",
    properties: { summary: { type: "string" } },
    required: ["summary"],
    additionalProperties: false,
  },
  quiz: {
    type: "object",
    properties: {
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: { q: { type: "string" }, a: { type: "string" } },
          required: ["q", "a"],
          additionalProperties: false,
        },
      },
    },
    required: ["cards"],
    additionalProperties: false,
  },
};

const TASKS = {
  summary:
    "Summarize the lecture notes below for a university student revising for an exam. " +
    "Write 5–8 short lines, each one key idea, most important first. Keep technical terms as they appear in the notes. " +
    "Write in the same language the notes are mostly written in. Use only what is in the notes; do not add outside facts.",
  quiz:
    "Write 5–8 practice questions that check whether the student understood the lecture notes below. " +
    "Mix recall and 'why/how' questions. Each answer is one or two sentences. " +
    "Write in the same language the notes are mostly written in. Base every question and answer only on the notes.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await db.auth.getUser();
  if (!user) return json({ error: "signin" }, 401);

  let body: { mode?: string; title?: string; notes?: string };
  try { body = await req.json(); } catch { return json({ error: "bad" }, 400); }
  const mode = body.mode === "quiz" ? "quiz" : body.mode === "summary" ? "summary" : null;
  const notes = String(body.notes ?? "").slice(0, 20000).trim();
  const title = String(body.title ?? "").slice(0, 120).trim();
  if (!mode || notes.length < 200) return json({ error: "bad" }, 400);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "not_configured" }, 503);

  const limit = Number(Deno.env.get("AI_DAILY_LIMIT") ?? 10);
  const { data: allowed, error: limErr } = await db.rpc("bump_ai_usage", { lim: limit });
  if (limErr) return json({ error: "usage" }, 500);
  if (!allowed) return json({ error: "limit" }, 429);

  const model = Deno.env.get("AI_MODEL") ?? "claude-opus-5-5";
  const client = new Anthropic({ apiKey: key });
  const opus5 = model.startsWith("claude-opus-5");
  try {
    const response = await client.beta.messages.create({
      model,
      max_tokens: 8000,
      ...(opus5 ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
      output_config: { format: { type: "json_schema", schema: SCHEMAS[mode] } },
      messages: [{
        role: "user",
        content: TASKS[mode] + "\n\n<title>" + title + "</title>\n<notes>\n" + notes + "\n</notes>",
      }],
    } as any);
    if (response.stop_reason === "refusal") return json({ error: "refused" }, 422);
    const text = response.content.find((b: { type: string }) => b.type === "text") as { text: string } | undefined;
    if (!text) return json({ error: "empty" }, 502);
    return json(JSON.parse(text.text));
  } catch (e) {
    console.error("lecture-ai", e instanceof Error ? e.message : e);
    return json({ error: "upstream" }, 502);
  }
});
