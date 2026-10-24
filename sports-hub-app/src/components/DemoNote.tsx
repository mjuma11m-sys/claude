export function DemoNote({ text = '* بيانات تجريبية للعرض، مو نتائج حقيقية' }: { text?: string }) {
  return <p className="text-xs text-mute">{text}</p>
}
