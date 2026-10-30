// DW-021 phase 2 — lecture notes → summary / practice questions.
// DW-034 — photo of a board or page → notes text (the image is only passed through, never stored).
// DW-036 — lecture PDF → notes + summary + practice questions in one call (the file is only passed through, never stored).
// DW-051 — class timetable (photo, PDF or pasted text) → weekly classes with days and times (the file is only passed through, never stored).
// DW-054 — text of a PowerPoint/Word file (extracted on the phone) → short review notes + summary + practice questions.
// DW-037 — «اسأل حياتي»: a question about the user's own numbers, answered from a snapshot the app sends with it (nothing is stored here).
// Secrets (Supabase → Edge Functions → Secrets, never in the app or repo):
//   ANTHROPIC_API_KEY  required
//   AI_MODEL           optional, default claude-opus-5-5 (summaries, questions, photos, PDFs)
//   AI_MODEL_ASK       optional, default claude-sonnet-5-5 for «اسأل حياتي» (DW-046: short answers from ready numbers, about half the cost)
//   AI_DAILY_LIMIT     optional, default 10 calls per user per day (abuse guard)
//   AI_MONTHLY         optional JSON, free uses per user per month by feature group (DW-068),
//                      default {"study":3,"slides":3,"schedule":2,"ask":5,"trip":2}
// DW-096 — «خطط رحلتي»: city + days + style → a day-by-day plan with places, estimated fees, budget and packing (nothing is stored here).
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

// DW-068: which free monthly quota each mode spends
const GROUP: Record<string, string> = { summary: "study", quiz: "study", pdf: "study", photo: "study", slides: "slides", schedule: "schedule", ask: "ask", trip: "trip" };
const MONTHLY_DEFAULT: Record<string, number> = { study: 3, slides: 3, schedule: 2, ask: 5, trip: 2 };
function monthly(): Record<string, number> {
  try { return { ...MONTHLY_DEFAULT, ...JSON.parse(Deno.env.get("AI_MONTHLY") ?? "{}") }; } catch { return MONTHLY_DEFAULT; }
}

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
  schedule: {
    type: "object",
    properties: {
      courses: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            days: { type: "array", items: { type: "integer" } },
            start: { type: "string" },
            end: { type: "string" },
            room: { type: "string" },
          },
          required: ["name", "days", "start", "end", "room"],
          additionalProperties: false,
        },
      },
    },
    required: ["courses"],
    additionalProperties: false,
  },
  trip: {
    type: "object",
    properties: {
      currency: { type: "string" },
      days: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            places: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" }, name_en: { type: "string" }, tag: { type: "string" }, time: { type: "string" },
                  fee_local: { type: "number" }, fee_bhd: { type: "number" }, activities: { type: "string" },
                },
                required: ["name", "name_en", "tag", "time", "fee_local", "fee_bhd", "activities"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "places"],
          additionalProperties: false,
        },
      },
      budget: {
        type: "object",
        properties: { hotel_night: { type: "number" }, food_day: { type: "number" }, transport_day: { type: "number" }, activities_total: { type: "number" } },
        required: ["hotel_night", "food_day", "transport_day", "activities_total"],
        additionalProperties: false,
      },
      packing: { type: "array", items: { type: "string" } },
      tips: { type: "array", items: { type: "string" } },
    },
    required: ["currency", "days", "budget", "packing", "tips"],
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

// DW-069: notes are often an automatic transcript of a recorded class, with students' side talk mixed in
const CHATTER = " The notes may be an automatic transcript of a recorded class that also caught side conversations between students " +
  "(jokes, plans, chat unrelated to the subject). Ignore anything that is not about the lesson topic; never summarize or ask about it.";
const TASKS = {
  summary:
    "Summarize the lesson notes below for a student (school or university) revising for an exam. " +
    "Write 5–8 short lines, each one key idea, most important first. Keep technical terms as they appear in the notes. " +
    "Write in the same language the notes are mostly written in. Use only what is in the notes; do not add outside facts. If a formula is central, put it on its own line." + CHATTER + MATH,
  quiz:
    "Write 5–8 practice questions that check whether the student understood the lecture notes below. " +
    "Mix recall and 'why/how' questions. Each answer is one or two sentences. " +
    "Write in the same language the notes are mostly written in. Base every question and answer only on the notes. " +
    "If the notes contain formulas, include 1–3 short calculation questions with small round numbers; " +
    "each answer shows the formula, the numbers substituted and the result, checked carefully." + CHATTER + MATH,
  photo:
    "This is a photo a student took of a whiteboard, slide or page during a lecture. " +
    "Transcribe the lecture content into clean study notes: keep headings, bullet points and every formula, in reading order. " +
    "Keep the original language of each line (Arabic or English). Do not add explanations or anything that is not in the photo. " +
    "If nothing is readable, or the photo is not lecture material, return an empty string." + MATH,
  pdf:
    "This PDF is a lesson or lecture (slides or handout) for a school or university student. Produce three things for a student revising for an exam: " +
    "notes: the key points as short lines in reading order, every definition and formula kept exactly (at most about 40 lines); " +
    "summary: 5–8 short lines, each one key idea, most important first; " +
    "cards: 5–8 practice questions with one- or two-sentence answers, mixing recall and 'why/how', plus 1–3 short calculation questions if the lecture has formulas " +
    "(each answer shows the formula, the numbers substituted and the result, checked carefully). " +
    "Write in the language the lecture is mostly written in. Use only what is in the PDF; do not add outside facts. " +
    "If the PDF is not lecture material or has no readable text, return empty notes and summary and no cards." + MATH,
  slides:
    "Below is the text of a lesson's PowerPoint slides or Word handout (extracted from the file, one block per slide), for a student revising for an exam (school or university; adapt depth to the level of the material). Produce three things: " +
    "notes: a short review of what the student must know, as short lines in slide order: key points, every definition, rule, date and formula kept exactly (at most about 40 lines; skip titles, page numbers and repeated headers); " +
    "summary: 5–8 short lines, each one key idea, most important first; " +
    "cards: 5–8 practice questions with one- or two-sentence answers, mixing recall and 'why/how', plus 1–3 short calculation questions if the material has formulas " +
    "(each answer shows the formula, the numbers substituted and the result, checked carefully). " +
    "Write in the language the material is mostly written in. Use only what is in the text; do not add outside facts. " +
    "If the text is not study material, return empty notes and summary and no cards." + MATH,
  trip:
    "Plan a trip for a traveller from Bahrain. Write everything in Gulf Arabic, except name_en (the place's common English or local Latin name, for map search). " +
    "Return one day object per trip day, in order: title = a short theme for the day; places = 3–4 real, well-known places in or near the city that fit the trip style, ordered so the day flows by area. " +
    "For each place: name = Arabic name, tag = one of «نقطة الانطلاق», «معلم مشهور», «طبيعة», «مغامرة», «تسوق», «مطعم», «ثقافة», «زيارة دينية»; time = a sensible start time HH:MM (24-hour); " +
    "fee_local = typical entry fee per adult in the local currency (0 if free), fee_bhd = the same in Bahraini dinars (approximate); activities = one or two sentences of what to do there. " +
    "currency = the ISO code of the local currency. budget = typical mid-range costs per person in Bahraini dinars: hotel_night, food_day, transport_day, activities_total. " +
    "packing = 5–8 items specific to this destination, season and style (not generic basics like passport or charger); tips = 3 short practical tips (transport, money, customs, safety). " +
    "Prefer halal-friendly food suggestions. Use only real places you are confident exist; never invent a place. Prices are estimates and may have changed.",
  schedule:
    "This is a student's weekly timetable, most likely from Bahrain, in any format: a university portal screenshot or PDF (UOB, Polytechnic, AUBH, RUW, AMA and others), " +
    "a public or private school grid (primary, intermediate, secondary; Arabic or English), an Excel/Word table, a photo of a printed or handwritten sheet, or copied text. " +
    "List every weekly class meeting. For each: name = course code and title as written for university (e.g. \"ITCS 113 Computer Programming I\"; add \" (Lab)\" or \" (Tutorial)\" if that meeting is one), or the subject name for school; " +
    "days = weekday numbers 0=Sunday 1=Monday 2=Tuesday 3=Wednesday 4=Thursday 5=Friday 6=Saturday; start and end = 24-hour HH:MM; room = building and room as written, or empty. " +
    "Reading days: portal letters U=Sunday M=Monday T=Tuesday W=Wednesday H or R=Thursday (UTH = [0,2,4], MW = [1,3]); Arabic الأحد/احد، الاثنين/اثنين، الثلاثاء، الأربعاء، الخميس; English Sun/Mon/Tue/Wed/Thu; " +
    "«Day 1…Day 5» on a Sunday–Thursday school week = Sunday…Thursday. " +
    "Reading grids: find which axis is days and which is periods (days may be rows or columns; periods may be called الحصة الأولى/الثانية… or Period 1/2…). " +
    "A cell takes the time printed in its own cell, else in its period's header, else in a separate bell-times table on the same page; never invent a time that is not shown anywhere (skip that meeting instead). " +
    "A cell spanning several periods, or the same subject in back-to-back periods on the same day, is one meeting from the first start to the last end. " +
    "A cell split into two stacked subjects for the same period (two groups or a choice, e.g. حاسوب over اسرية, مجالات 1 over مجالات 2) is one meeting named with both joined by « / », or the name once if both halves are the same subject. " +
    "If the timetable has alternating weeks (Week A/B, أسبوع أ/ب), add \" (A)\"/\" (B)\" or \" (أ)\"/\" (ب)\" to the name. " +
    "Times: university classes run about 07:00–21:00 and school days about 06:45–14:45, so a time without am/pm from 12:00 to 7:59 is midday or afternoon (12:15 stays 12:15, 1:00 = 13:00). " +
    "Skip breaks and non-classes (الفسحة، استراحة، Break, Lunch, صلاة, الطابور الصباحي, Assembly), titles (e.g. «الثالث الإعدادي فرقة 5»), teacher names, section/CRN numbers and class codes like «3ع 5» or «مجال1». " +
    "Write school subject names in full in the timetable's language: ريض=رياضيات، عرب=لغة عربية، إنج=لغة إنجليزية، دين/إسلامية=تربية إسلامية، رياضة=تربية رياضية، اسرية=تربية أسرية، فني=تربية فنية، اجتماعيات، علوم، مواطنة، تلاوة، اقتصاد، حاسوب، مجالات؛ " +
    "Math, Eng, Sci, Arb, Isl, Soc, PE, ICT, Art → Mathematics, English, Science, Arabic, Islamic Studies, Social Studies, Physical Education, ICT, Art; keep anything you are not sure of exactly as written. " +
    "Copy only what is in the timetable. If this is not a timetable or nothing is readable, return no courses.",
};
// DW-056: the same reader for a work shift roster or a training schedule
const KIND_HINT = (k?: string) =>
  k === "work" ? " This is a work schedule, not a class timetable, in any format: a weekly shift roster, a monthly rota with dates, an app screenshot, a photo or text. " +
    "name = the shift or job as written (e.g. «دوام صباحي», «Night shift»), or \"دوام\" if none; a day range like Sun–Thu or «الأحد – الخميس» means every day in between; room = the workplace or branch if shown. " +
    "Shift codes: M/AM/صباحي = morning, E/PM/A/مسائي = evening, N/ليلي = night; use the times printed in the legend or header for each code, and skip any code with no time shown. Skip OFF, Rest, إجازة, عطلة and leave days. " +
    "If dates are shown for one or more weeks, map each date to its weekday and list the usual weekly pattern once (if weeks differ, use the first full week). A night shift that ends after midnight keeps its printed start and end."
  : k === "gym" ? " This is a training or workout schedule, not a class timetable: name = the session as written (e.g. \"جيم صدر\", \"Running\"), or \"تمرين\" if none; room = the gym, pitch or place if shown. Sessions without am/pm between 1:00 and 9:59 are usually in the evening."
  : "";
const MEDIA = ["image/jpeg", "image/png", "image/webp"];

// DW-037: the app sends a compact JSON snapshot of the user's data with each question; the answer may only use it.
const ASK_SYSTEM =
  "You are the assistant inside «حياتي» (Hayati), a personal planner app for students (school or university) and others in Bahrain. " +
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

  let body: { city?: string; days?: number; style?: string; month?: string; people?: number; kind?: string; mode?: string; title?: string; notes?: string; image?: string; media?: string; data?: string; messages?: { role: string; content: string }[] };
  try { body = await req.json(); } catch { return json({ error: "bad" }, 400); }
  const mode = body.mode === "quiz" ? "quiz" : body.mode === "summary" ? "summary" : body.mode === "photo" ? "photo" : body.mode === "pdf" ? "pdf" : body.mode === "ask" ? "ask" : body.mode === "schedule" ? "schedule" : body.mode === "slides" ? "slides" : body.mode === "trip" ? "trip" : null;
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
  } else if (mode === "schedule") {
    // one of: resized JPEG/PNG, a PDF (≤ 6 MB), or pasted text
    const pdf = image.startsWith("JVBER");
    if (image && (image.length > 8_400_000 || (!pdf && (image.length > 5_000_000 || !/^[A-Za-z0-9+/=]+$/.test(image.slice(0, 200)) || !MEDIA.includes(media))))) return json({ error: "bad" }, 400);
    if (!image && notes.length < 20) return json({ error: "bad" }, 400);
  } else if (mode === "slides") {
    if (notes.length < 50) return json({ error: "bad" }, 400);
  } else if (mode === "trip") {
    const d = Number(body.days);
    if (String(body.city ?? "").trim().length < 2 || !(d >= 1 && d <= 14)) return json({ error: "bad" }, 400);
  } else if (mode === "ask") {
    if (!turns.length || turns[turns.length - 1].role !== "user" || !data) return json({ error: "bad" }, 400);
  } else if (notes.length < 200) return json({ error: "bad" }, 400);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "not_configured" }, 503);

  const limit = Number(Deno.env.get("AI_DAILY_LIMIT") ?? 10);
  const { data: allowed, error: limErr } = await db.rpc("bump_ai_usage", { lim: limit });
  if (limErr) return json({ error: "usage" }, 500);
  if (!allowed) return json({ error: "limit" }, 429);

  const feature = GROUP[mode], cap = Number(monthly()[feature]) || 0;
  const { data: left, error: qErr } = await db.rpc("bump_ai_quota", { feat: feature, lim: cap });
  if (qErr) return json({ error: "usage" }, 500);
  if (left < 0) return json({ error: "quota", feature, limit: cap }, 429);
  const quota = { feature, left, limit: cap };
  // nothing useful came back → give the use back
  const fail = async (body: unknown, status: number) => { await db.rpc("refund_ai_quota", { feat: feature }); return json(body, status); };

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
      if (r.stop_reason === "refusal") return fail({ error: "refused" }, 422);
      const t = r.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("").trim();
      return t ? json({ text: t, _quota: quota }) : fail({ error: "empty" }, 502);
    }
    const response = await client.beta.messages.create({
      model,
      max_tokens: 8000,   // Edge Function wall-clock limit: keep answers short enough to finish in time
      ...(opus5 ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
      output_config: { format: { type: "json_schema", schema: (SCHEMAS as any)[mode === "slides" ? "pdf" : mode] } },
      messages: [{
        role: "user",
        content: mode === "schedule"
          ? (image.startsWith("JVBER")
            ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: image } }, { type: "text", text: TASKS.schedule + KIND_HINT(body.kind) }]
            : image
            ? [{ type: "image", source: { type: "base64", media_type: media, data: image } }, { type: "text", text: TASKS.schedule + KIND_HINT(body.kind) }]
            : TASKS.schedule + KIND_HINT(body.kind) + "\n\n<timetable>\n" + notes + "\n</timetable>")
          : mode === "trip"
          ? TASKS.trip + "\n\n<trip>\ncity: " + String(body.city).slice(0, 60) + "\ndays: " + Math.round(Number(body.days)) + "\nstyle: " + String(body.style ?? "").slice(0, 40) +
            "\nmonth: " + String(body.month ?? "").slice(0, 20) + "\npeople: " + Math.max(1, Math.min(20, Math.round(Number(body.people) || 1))) + "\n</trip>"
          : mode === "slides"
          ? TASKS.slides + (title ? "\n\n<title>" + title + "</title>" : "") + "\n<slides>\n" + notes + "\n</slides>"
          : mode === "pdf"
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
    if (response.stop_reason === "refusal") return fail({ error: "refused" }, 422);
    const text = response.content.find((b: { type: string }) => b.type === "text") as { text: string } | undefined;
    if (!text) return fail({ error: "empty" }, 502);
    return json({ ...JSON.parse(text.text), _quota: quota });
  } catch (e) {
    console.error("lecture-ai", e instanceof Error ? e.message : e);
    return fail({ error: "upstream" }, 502);
  }
});
