export function Soon({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
      <div className="glass space-y-3 p-5">
        <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-xs text-warn">قيد التطوير · المرحلة الثانية</span>
        <ul className="list-inside list-disc space-y-1 text-mute">
          {items.map((i) => <li key={i}>{i}</li>)}
        </ul>
      </div>
    </section>
  )
}
