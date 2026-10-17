// DW-054: نص ملفات البوربوينت (.pptx) والوورد (.docx) بالجهاز، بدون نت وبدون مكتبات
// الملفين ZIP فيه XML: نقرا الفهرس، نفك الضغط بـ DecompressionStream، ونطلع النص سطر سطر
(function () {
  'use strict';

  const u16 = (b, o) => b[o] | (b[o + 1] << 8);
  const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  const dec = new TextDecoder('utf-8');

  function entries(buf) {
    const b = new Uint8Array(buf);
    let eocd = -1;
    for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('zip');
    const n = u16(b, eocd + 10);
    let p = u32(b, eocd + 16);
    const out = [];
    for (let k = 0; k < n && u32(b, p) === 0x02014b50; k++) {
      const method = u16(b, p + 10), csize = u32(b, p + 20), nlen = u16(b, p + 28), xlen = u16(b, p + 30), clen = u16(b, p + 32), off = u32(b, p + 42);
      out.push({ name: dec.decode(b.subarray(p + 46, p + 46 + nlen)), method, csize, off });
      p += 46 + nlen + xlen + clen;
    }
    return { b, out };
  }
  async function read(b, e) {
    const start = e.off + 30 + u16(b, e.off + 26) + u16(b, e.off + 28);
    const raw = b.subarray(start, start + e.csize);
    if (e.method === 0) return dec.decode(raw);
    if (e.method !== 8 || typeof DecompressionStream !== 'function') throw new Error('inflate');
    const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return dec.decode(await new Response(stream).arrayBuffer());
  }
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  const unxml = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, c) => c[0] === '#' ? String.fromCodePoint(c[1].toLowerCase() === 'x' ? parseInt(c.slice(2), 16) : Number(c.slice(1))) : (ENT[c] || m));
  // كل فقرة <a:p> أو <w:p> سطر، والنص داخل <a:t> أو <w:t>
  function paras(xml, ns) {
    const lines = [];
    for (const p of xml.split(new RegExp('</' + ns + ':p>'))) {
      const t = [...p.matchAll(new RegExp('<' + ns + ':t(?:\\s[^>]*)?>([^<]*)</' + ns + ':t>', 'g'))].map((m) => m[1]).join('');
      if (t.trim()) lines.push(unxml(t).trim());
    }
    return lines;
  }

  async function extract(file) {
    const name = String(file.name || '').toLowerCase();
    if (/\.(ppt|doc)$/.test(name)) throw new Error('old');
    const { b, out } = entries(await file.arrayBuffer());
    const slides = out.filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.name)).sort((x, y) => Number(x.name.match(/\d+/)[0]) - Number(y.name.match(/\d+/)[0]));
    if (slides.length) {
      const parts = [];
      for (let i = 0; i < slides.length; i++) {
        const lines = paras(await read(b, slides[i]), 'a');
        if (lines.length) parts.push('— ' + (i + 1) + ' —\n' + lines.join('\n'));
      }
      return { kind: 'pptx', count: slides.length, text: parts.join('\n\n') };
    }
    const doc = out.find((e) => e.name === 'word/document.xml');
    if (doc) {
      const lines = paras(await read(b, doc), 'w');
      return { kind: 'docx', count: lines.length, text: lines.join('\n') };
    }
    throw new Error('type');
  }

  window.HayatiOffice = { extract };
})();
