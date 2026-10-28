// DW-048: قراءة عقد المالك من Word (.docx) أو نص (.txt) — على الجهاز نفسه، ولا شي يطلع للنت
import { unzipSync, strFromU8 } from "fflate";

export const IMPORT_ACCEPT = ".docx,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

/** نص الملف، أو رسالة خطأ واضحة (PDF والصور ما تنقرا بهالمرحلة) */
export async function readContractFile(f: File): Promise<{ text: string } | { error: string }> {
  const name = f.name.toLowerCase();
  if (f.size > 5 * 1024 * 1024) return { error: "الملف أكبر من 5MB" };
  if (name.endsWith(".pdf") || f.type === "application/pdf") return { error: "PDF العربي ينقرا حروف مقلوبة. صدّره Word (.docx) من برنامج العقد، أو انسخ النص والصقه بالمحرر." };
  if (f.type.startsWith("image/")) return { error: "الصور ما تنقرا للحين. ارفع نسخة Word (.docx) أو الصق النص." };
  if (name.endsWith(".doc") && !name.endsWith(".docx")) return { error: "صيغة Word القديمة (.doc) ما تنقرا. احفظه .docx من Word وارفعه." };
  try {
    if (name.endsWith(".txt") || f.type === "text/plain") return { text: tidy(await f.text()) };
    if (name.endsWith(".docx")) return { text: tidy(docxText(new Uint8Array(await f.arrayBuffer()))) };
  } catch { return { error: "ما قدرنا نقرا الملف. تأكد إنه Word (.docx) سليم." }; }
  return { error: "ارفع Word (.docx) أو نص (.txt)." };
}

/** فقرات word/document.xml بالترتيب: كل <w:p> سطر، و<w:tab> مسافة، و<w:br> سطر جديد */
export function docxText(bytes: Uint8Array): string {
  const files = unzipSync(bytes, { filter: (f) => f.name === "word/document.xml" });
  const xml = files["word/document.xml"];
  if (!xml) throw new Error("not docx");
  const doc = new DOMParser().parseFromString(strFromU8(xml), "application/xml");
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const out: string[] = [];
  for (const p of Array.from(doc.getElementsByTagNameNS(W, "p"))) {
    let line = "";
    const walk = (n: Node) => {
      for (const c of Array.from(n.childNodes)) {
        if (c.nodeType !== 1) continue;
        const el = c as Element;
        if (el.namespaceURI === W && el.localName === "t") line += el.textContent ?? "";
        else if (el.namespaceURI === W && el.localName === "tab") line += "\t";
        else if (el.namespaceURI === W && (el.localName === "br" || el.localName === "cr")) line += "\n";
        else if (!(el.namespaceURI === W && el.localName === "p")) walk(el); // فقرة داخل فقرة (جداول) تنقرا لحالها
      }
    };
    walk(p);
    out.push(line);
  }
  return out.join("\n");
}

const tidy = (s: string) => s.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
