/* A ball that rolls: the app's loader. Static under reduced motion. */
export function Spinner() {
  return (
    <svg role="status" aria-label="جارٍ التحميل" viewBox="0 0 40 40" className="spin-ball size-10">
      <circle cx="20" cy="20" r="17" fill="none" stroke="var(--color-ink)" strokeOpacity=".3" strokeWidth="2" />
      <g stroke="var(--color-ink)" strokeOpacity=".3" strokeWidth="1.5" strokeLinecap="round"><line x1="20.00" y1="13.00" x2="20.00" y2="4.00"/><line x1="26.66" y1="17.84" x2="35.22" y2="15.06"/><line x1="24.11" y1="25.66" x2="29.40" y2="32.94"/><line x1="15.89" y1="25.66" x2="10.60" y2="32.94"/><line x1="13.34" y1="17.84" x2="4.78" y2="15.06"/></g>
      <path d="M20.00 13.00 L26.66 17.84 L24.11 25.66 L15.89 25.66 L13.34 17.84Z" fill="var(--color-pulse)" />
    </svg>
  )
}
