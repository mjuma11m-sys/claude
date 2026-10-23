/* "وضع الملعب": bigger text, brighter secondary text, stronger borders, bigger tap targets, for sun and one-handed use.
   A display preference only: stored on this device (sh.pitchMode), never sent anywhere, cleared by "delete all my data". */
export const PITCH_KEY = 'sh.pitchMode'

export function readPitch(): boolean {
  try { return localStorage.getItem(PITCH_KEY) === '1' } catch { return false }
}

export function applyPitch(on: boolean, root: HTMLElement = document.documentElement): void {
  if (on) root.setAttribute('data-pitch', ''); else root.removeAttribute('data-pitch')
}

export function setPitch(on: boolean): void {
  try { if (on) localStorage.setItem(PITCH_KEY, '1'); else localStorage.removeItem(PITCH_KEY) } catch { /* private mode: applies for this visit only */ }
  applyPitch(on)
}
