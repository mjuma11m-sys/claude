// DW-099 — توقعات الطقس للرحلة من Apple WeatherKit (نفس بيانات تطبيق الطقس بالآيفون). المفتاح بالسيرفر بس.
// Secrets (Supabase → Edge Functions → Secrets):
//   WEATHERKIT_TEAM_ID, WEATHERKIT_KEY_ID, WEATHERKIT_SERVICE_ID, WEATHERKIT_PRIVATE_KEY (محتوى ملف .p8)
// بدونها ترجع {unavailable:true} والتطبيق يكتفي بالمتوسط التقريبي.
import { createClient } from "npm:@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "npm:jose@5";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// forecastStart بتوقيت غرينتش (منتصف الليل هناك) ← تاريخ اليوم بتوقيت المدينة
const localDate = (iso: string, tz: string) => { try { return new Date(iso).toLocaleDateString("en-CA", { timeZone: tz }); } catch { return String(iso).slice(0, 10); } };
let cached: { token: string; exp: number } | null = null;
async function token(): Promise<string | null> {
  const team = Deno.env.get("WEATHERKIT_TEAM_ID"), kid = Deno.env.get("WEATHERKIT_KEY_ID"), sid = Deno.env.get("WEATHERKIT_SERVICE_ID"), pem = Deno.env.get("WEATHERKIT_PRIVATE_KEY");
  if (!team || !kid || !sid || !pem) return null;
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const key = await importPKCS8(pem.replace(/\\n/g, "\n"), "ES256");
  const t = await new SignJWT({ sub: sid }).setProtectedHeader({ alg: "ES256", kid, id: team + "." + sid })
    .setIssuer(team).setIssuedAt(now).setExpirationTime(now + 3600).sign(key);
  cached = { token: t, exp: now + 3600 };
  return t;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await db.auth.getUser();
  if (!user) return json({ error: "signin" }, 401);
  let body: { lat?: number; lng?: number; tz?: string };
  try { body = await req.json(); } catch { return json({ error: "bad" }, 400); }
  const lat = Number(body.lat), lng = Number(body.lng), tz = String(body.tz ?? "UTC").slice(0, 40);
  if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180) || !/^[A-Za-z_]+(\/[A-Za-z_+-]+)*$/.test(tz)) return json({ error: "bad" }, 400);
  let t: string | null;
  try { t = await token(); } catch (e) { console.error("weather key", e instanceof Error ? e.message : e); return json({ unavailable: true }); }
  // 200 مو 503: عشان التطبيق ما يعتبر الذكاء كله مطفي
  if (!t) return json({ unavailable: true });
  const url = "https://weatherkit.apple.com/api/v1/weather/ar/" + lat.toFixed(3) + "/" + lng.toFixed(3) + "?dataSets=forecastDaily&timezone=" + encodeURIComponent(tz);
  const r = await fetch(url, { headers: { Authorization: "Bearer " + t } });
  if (!r.ok) { console.error("weatherkit", r.status, (await r.text()).slice(0, 200)); return json({ error: "upstream" }, 502); }
  const w = await r.json();
  const days = ((w.forecastDaily && w.forecastDaily.days) || []).slice(0, 10).map((d: any) => ({
    date: localDate(d.forecastStart, tz), max: Math.round(d.temperatureMax), min: Math.round(d.temperatureMin),
    code: String(d.conditionCode || ""), rain: Math.round((d.precipitationChance || 0) * 100),
  }));
  return json({ days, attribution: "https://developer.apple.com/weatherkit/data-source-attribution/" });
});
