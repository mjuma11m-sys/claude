// ملفات العقود (DW-020): الملف نفسه ما يدخل البيانات ولا سجل المزامنة — كبير.
// بالجهاز: IndexedDB. مع حساب: كمان bucket «contracts» الخاص (مجلد لكل مساحة، RLS بالسيرفر).
import { loadSyncConfig } from "./sync";

export const MAX_FILE = 10 * 1024 * 1024;
export const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/heic";

const DB = "idarati-files", STORE = "files";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const q = fn(db.transaction(STORE, mode).objectStore(STORE));
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
}
export const putLocal = (id: string, blob: Blob) => tx("readwrite", (s) => s.put(blob, id));
export const getLocal = (id: string) => tx<Blob | undefined>("readonly", (s) => s.get(id));
export const delLocal = (id: string) => tx("readwrite", (s) => s.delete(id));

/** يتحقق قبل الحفظ: النوع والحجم */
export function checkFile(f: File): string | null {
  if (!/^(application\/pdf|image\/)/.test(f.type)) return "الملف لازم PDF أو صورة";
  if (f.size > MAX_FILE) return "الملف أكبر من 10MB. صوّره بدقة أقل أو اضغطه";
  return null;
}

const safe = (name: string) => name.replace(/[^\w.\-]+/g, "_").slice(-60);

/** يرفع للسحابة لو المزامنة شغالة. يرجّع المسار أو undefined (محلي بس) */
export async function uploadCloud(id: string, f: Blob, name: string): Promise<string | undefined> {
  const cfg = loadSyncConfig();
  if (!cfg?.familyId) return undefined;
  const { getClient } = await import("./supabase");
  const sb = await getClient(cfg.url, cfg.key);
  const path = `${cfg.familyId}/${id}-${safe(name)}`;
  const { error } = await sb.storage.from("contracts").upload(path, f, { contentType: f.type, upsert: false });
  if (error) throw new Error("ما ارتفع للسحابة: " + error.message);
  return path;
}

/** يجيب الملف: من الجهاز أول، وإلا من السحابة (ويحفظه بالجهاز) */
export async function fetchFile(id: string, path?: string): Promise<Blob | null> {
  const local = await getLocal(id).catch(() => undefined);
  if (local) return local;
  const cfg = loadSyncConfig();
  if (!path || !cfg?.familyId) return null;
  const { getClient } = await import("./supabase");
  const sb = await getClient(cfg.url, cfg.key);
  const { data, error } = await sb.storage.from("contracts").download(path);
  if (error || !data) return null;
  await putLocal(id, data).catch(() => undefined);
  return data;
}

export async function removeFile(id: string, path?: string) {
  await delLocal(id).catch(() => undefined);
  const cfg = loadSyncConfig();
  if (!path || !cfg?.familyId) return;
  const { getClient } = await import("./supabase");
  const sb = await getClient(cfg.url, cfg.key);
  await sb.storage.from("contracts").remove([path]);
}
