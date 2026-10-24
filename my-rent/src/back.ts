// DW-040: زر الرجوع بأندرويد. كل نافذة مفتوحة تسجّل «سكّرني» هني، والزر يسكّر آخر وحدة انفتحت.
// لو ما فيه نافذة: يرجع للشاشة اللي قبل، ولو ما فيه شاشة قبل: يصغّر التطبيق (ما يقفله ويضيّع مكانك).
const stack: (() => void)[] = [];

/** النافذة تسجّل نفسها لما تنفتح، والدالة اللي ترجع تشيلها لما تنسكّر */
export function onBack(close: () => void) {
  stack.push(close);
  return () => {
    const i = stack.lastIndexOf(close);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** وش يسوي زر الرجوع الحين */
export function handleBack(canGoBack: boolean): "closed" | "back" | "minimize" {
  const close = stack[stack.length - 1];
  if (close) { close(); return "closed"; }
  return canGoBack ? "back" : "minimize";
}
