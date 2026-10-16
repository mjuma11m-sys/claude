// DW-021 phase 2 — lecture notes → summary / practice questions.
// DW-034 — photo of a board or page → notes text (the image is only passed through, never stored).
// DW-036 — lecture PDF → notes + summary + practice questions in one call (the file is only passed through, never stored).
// DW-037 — «اسأل حياتي»: a question about the user's own numbers, answered from a snapshot the app sends with it (nothing is stored here).
// Secrets (Supabase → Edge Functions → Secrets, never in the app or repo):
//   ANTHROPIC_API_KEY  required
//   AI_MODEL           optional, default claude-opus-5-5 (summaries, questions, photos, PDFs)
//   AI_MODEL_ASK       optional, default claude-sonnet-5-5 for «اسأل حياتي» (DW-046: short answers from ready numbers, about half the cost)
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
  photo: {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
    additionalProperties: false,
  },
  pdf: {
    type: "object",
    properties: {
      notes: { type: "string" },
      summary: { type: "string" },
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
    required: ["notes", "summary", "cards"],
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

// DW-022: the app renders ^ powers, _ subscripts, sqrt() and keeps an equation left-to-right inside Arabic text.
const MATH =
  " The notes may contain math or formulas. Keep every formula exactly as given. Write math in plain text the app can display: " +
  "² and ³ for squares and cubes, ^ for other powers (x^(n+1)), _ for subscripts (x_1), sqrt() or √, ×, ÷, ≤, ≥, ≠. Do not use LaTeX or Markdown.";

const TASKS = {
  summary:
    "Summarize the lecture notes below for a university student revising for an exam. " +
    "Write 5–8 short lines, each one key idea, most important first. Keep technical terms as they appear in the notes. " +
    "Write in the same language the notes are mostly written in. Use only what is in the notes; do not add outside facts. If a formula is central, put it on its own line." + MATH,
  quiz:
    "Write 5–8 practice questions that check whether the student understood the lecture notes below. " +
    "Mix recall and 'why/how' questions. Each answer is one or two sentences. " +
    "Write in the same language the notes are mostly written in. Base every question and answer only on the notes. " +
    "If the notes contain formulas, include 1–3 short calculation questions with small round numbers; " +
    "each answer shows the formula, the numbers substituted and the result, checked carefully." + MATH,
  photo:
    "This is a photo a university student took of a whiteboard, slide or page during a lecture. " +
    "Transcribe the lecture content into clean study notes: keep headings, bullet points and every formula, in reading order. " +
    "Keep the original language of each line (Arabic or English). Do not add explanations or anything that is not in the photo. " +
    "If nothing is readable, or the photo is not lecture material, return an empty string." + MATH,
  pdf:
    "This PDF is a university lecture (slides or handout). Produce three things for a student revising for an exam: " +
    "notes: the key points as short lines in reading order, every definition and formula kept exactly (at most about 40 lines); " +
    "summary: 5–8 short lines, each one key idea, most important first; " +
    "cards: 5–8 practice questions with one- or two-sentence answers, mixing recall and 'why/how', plus 1–3 short calculation questions if the lecture has formulas " +
    "(each answer shows the formula, the numbers substituted and the result, checked carefully). " +
    "Write in the language the lecture is mostly written in. Use only what is in the PDF; do not add outside facts. " +
    "If the PDF is not lecture material or has no readable text, return empty notes and summary and no cards." + MATH,
};
const MEDIA = ["image/jpeg", "image/png", "image/webp"];

// DW-037: the app sends a compact JSON snapshot of the user's data with each question; the answer may only use it.
const ASK_SYSTEM =
  "You are the assistant inside «حياتي» (Hayati), a personal planner app for a university student in Bahrain. " +
  "Answer in the language of the question; for Arabic use simple Gulf Arabic. Be brief: 3–6 short lines or a few bullet points. " +
  "Use only the numbers and facts in <data>; never invent amounts, dates or appointments. If the data does not contain the answer, say so plainly. " +
  "Amounts are Bahraini dinars with three decimals (e.g. 12.500 د.ب). If asked for a plan (study or saving), give a practical plan with days and times that fit the schedule. " +
  "You give no religious rulings (fatwa) and no financial or medical advice beyond the user's own numbers. Plain text only, no Markdown tables or headings.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await db.auth.getUser();
  if (!user) return json({ error: "signin" }, 401);

  let body: { mode?: string; title?: string; notes?: string; image?: string; media?: string; data?: string; messages?: { role: string; content: string }[] };
  try { body = await req.json(); } catch { return json({ error: "bad" }, 400); }
  const mode = body.mode === "quiz" ? "quiz" : body.mode === "summary" ? "summary" : body.mode === "photo" ? "photo" : body.mode === "pdf" ? "pdf" : body.mode === "ask" ? "ask" : null;
  // ask: last 8 turns, alternating, ending with the user's question
  const turns = (Array.isArray(body.messages) ? body.messages : []).slice(-8)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  while (turns.length && turns[0].role !== "user") turns.shift();
  const data = String(body.data ?? "").slice(0, 40000);
  const notes = String(body.notes ?? "").slice(0, 20000).trim();
  const title = String(body.title ?? "").slice(0, 120).trim();
  const image = String(body.image ?? ""), media = String(body.media ?? "image/jpeg");
  if (!mode) return json({ error: "bad" }, 400);
  if (mode === "photo") {
    // the app sends a resized JPEG (~300 KB); 5 MB of base64 is the hard cap
    if (!image || image.length > 5_000_000 || !/^[A-Za-z0-9+/=]+$/.test(image.slice(0, 200)) || !MEDIA.includes(media)) return json({ error: "bad" }, 400);
  } else if (mode === "pdf") {
    // ≤ 6 MB file → ≤ 8.4 MB of base64
    if (!image || image.length > 8_400_000 || !image.startsWith("JVBER")) return json({ error: "bad" }, 400);
  } else if (mode === "ask") {
    if (!turns.length || turns[turns.length - 1].role !== "user" || !data) return json({ error: "bad" }, 400);
  } else if (notes.length < 200) return json({ error: "bad" }, 400);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "not_configured" }, 503);

  const limit = Number(Deno.env.get("AI_DAILY_LIMIT") ?? 10);
  const { data: allowed, error: limErr } = await db.rpc("bump_ai_usage", { lim: limit });
  if (limErr) return json({ error: "usage" }, 500);
  if (!allowed) return json({ error: "limit" }, 429);

  const model = mode === "ask"
    ? Deno.env.get("AI_MODEL_ASK") ?? "claude-sonnet-5-5"
    : Deno.env.get("AI_MODEL") ?? "claude-opus-5-5";
  const client = new Anthropic({ apiKey: key });
  const opus5 = model.startsWith("claude-opus-5");
  try {
    if (mode === "ask") {
      const r = await client.beta.messages.create({
        model,
        max_tokens: 2000,
        ...(opus5 ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
        system: ASK_SYSTEM + "\n\n<data>\n" + data + "\n</data>",
        messages: turns,
      } as any);
      if (r.stop_reason === "refusal") return json({ error: "refused" }, 422);
      const t = r.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("").trim();
      return t ? json({ text: t }) : json({ error: "empty" }, 502);
    }
    const response = await client.beta.messages.create({
      model,
      max_tokens: 8000,   // Edge Function wall-clock limit: keep answers short enough to finish in time
      ...(opus5 ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
      output_config: { format: { type: "json_schema", schema: SCHEMAS[mode] } },
      messages: [{
        role: "user",
        content: mode === "pdf"
          ? [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: image } },
            { type: "text", text: TASKS.pdf + (title ? "\n\n<title>" + title + "</title>" : "") },
          ]
          : mode === "photo"
          ? [
            { type: "image", source: { type: "base64", media_type: media, data: image } },
            { type: "text", text: TASKS.photo + (title ? "\n\n<title>" + title + "</title>" : "") },
          ]
          : TASKS[mode] + "\n\n<title>" + title + "</title>\n<notes>\n" + notes + "\n</notes>",
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
