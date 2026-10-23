/* In-page links ("#contracts"). The shared trial copy uses hash routes, where a bare "#id" would be read as a page, so there we scroll instead of following the link. */
export function jumpTo(e: { preventDefault(): void }, href: string | undefined): void {
  if (!import.meta.env.VITE_SHARE || !href?.startsWith('#')) return
  e.preventDefault()
  const el = document.getElementById(href.slice(1))
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  if (el.tabIndex < 0 && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}
