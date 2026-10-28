// DW-037: توافق Safari/آيفون القديم بدون متصفح — كل color-mix() وdvh لازم قبلها بديل بنفس القاعدة،
// ونمنع ميزات JS اللي ما تشتغل قبل iOS 15.4. node tests/compat.mjs
import fs from "node:fs";
import path from "node:path";
let failed = 0;
const ok = (c, name, extra = "") => { console.log(`${c ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`); if (!c) failed++; };
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk("src");

for (const f of files.filter((x) => x.endsWith(".css"))) {
  const css = fs.readFileSync(f, "utf8");
  const bad = [];
  const re = /(?<![\w-])([a-z-]+)\s*:\s*([^;{}]*?(?:color-mix\(|\d+dvh)[^;{}]*?)(?=;|\})/g;
  for (const m of css.matchAll(re)) {
    const block = css.slice(css.lastIndexOf("{", m.index) + 1, m.index);
    const prev = [...block.matchAll(new RegExp(`(?<![\\w-])${m[1]}\\s*:\\s*([^;]*);`, "g"))].pop();
    if (!prev || /color-mix\(|dvh/.test(prev[1])) bad.push(`${m[1]}: ${m[2].slice(0, 40)}`);
  }
  ok(bad.length === 0, `${f}: كل color-mix/dvh لها بديل قبلها`, bad.slice(0, 3).join(" | "));
}

const js = files.filter((x) => /\.(ts|tsx)$/.test(x)).map((f) => [f, fs.readFileSync(f, "utf8")]);
const banned = [[/\(\?<[=!]/, "lookbehind بالـ regex (iOS 16.4+)"], [/\.toSorted\(|\.toReversed\(|\.findLast\(|Object\.groupBy|structuredClone\(|\.at\(-?\d/, "دوال JS جديدة (iOS 16+)"], [/crypto\.randomUUID/, "crypto.randomUUID (iOS 15.4+)"]];
for (const [re, what] of banned) {
  const hits = js.filter(([, s]) => re.test(s)).map(([f]) => f);
  ok(hits.length === 0, `بدون ${what}`, hits.join(", "));
}
const share = js.filter(([, s]) => /navigator\.share\(/.test(s) && !/if \(navigator\.share\)/.test(s)).map(([f]) => f);
ok(share.length === 0, "navigator.share دايماً بشرط (Safari على الماك ممكن ما يدعمه)", share.join(", "));
const month = js.filter(([, s]) => /type="month"/.test(s) && !/type="month"[^>]*placeholder="\d{4}-\d{2}"/.test(s)).map(([f]) => f);
ok(month.length === 0, 'خانة type="month" فيها مثال (Safari الماك يعرضها نص)', month.join(", "));
const html = fs.readFileSync("index.html", "utf8");
ok(/apple-mobile-web-app-capable/.test(html) && /apple-touch-icon/.test(html) && /viewport-fit=cover/.test(html), "آيفون: أيقونة الشاشة الرئيسية + وضع التطبيق + الحواف");
// DW-038: سياسة الخصوصية العامة (رابط المتجر) = نفس نص التطبيق
{
  const tsx = fs.readFileSync("src/pages/Privacy.tsx", "utf8"), pub = fs.readFileSync("public/privacy.html", "utf8");
  const ver = tsx.match(/POLICY_VERSION = "([^"]+)"/)[1];
  const strip = (x) => x.replace(/\{t\("((?:[^"\\]|\\.)*)"\)\}/g, (_, s) => JSON.parse(`"${s}"`)).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(); // DW-049: النص داخل t()
  const items = [...tsx.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => strip(m[1]));
  const pubText = strip(pub);
  const missing = items.filter((t) => !pubText.includes(t));
  ok(pub.includes(ver) && missing.length === 0 && items.length > 10, `privacy.html مطابقة للتطبيق (النسخة ${ver}، ${items.length} بند)`, missing.slice(0, 2).join(" | "));
}
// DW-040: نسخة المتجر — بيان خصوصية أبل داخل مشروع Xcode، وكل نافذة (role=dialog) تتسكّر بزر الرجوع بأندرويد
{
  const pi = "ios/App/App/PrivacyInfo.xcprivacy", pbx = fs.readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
  const x = fs.existsSync(pi) ? fs.readFileSync(pi, "utf8") : "";
  ok(/<key>NSPrivacyTracking<\/key>\s*<false\/>/.test(x) && /UserDefaults[\s\S]*CA92\.1/.test(x) && /PrivacyInfo\.xcprivacy in Resources \*\/,/.test(pbx), "PrivacyInfo.xcprivacy موجود، بدون تتبّع، ومضاف لموارد التطبيق");
  const dialogs = js.filter(([, s]) => /role="dialog"/.test(s) && !/onBack\(/.test(s)).map(([f]) => f);
  ok(dialogs.length === 0, "كل نافذة تسجّل نفسها لزر الرجوع (onBack)", dialogs.join(", "));
}
console.log(failed ? `\n${failed} فشل` : "\nكل فحوصات التوافق نجحت");
process.exit(failed ? 1 : 0);
