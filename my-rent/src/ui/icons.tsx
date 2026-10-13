// أيقونات خط 1.8 بنفس الشبكة 24px
import type { ReactNode } from "react";

const I = ({ children, size = 24 }: { children: ReactNode; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const Icon = {
  home: <I><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></I>,
  tenants: <I><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6 6 0 0 0-4-5.6" /></I>,
  budget: <I><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></I>,
  bank: <I><path d="M3 9l9-5 9 5M5 9v9M10 9v9M14 9v9M19 9v9M3 20h18" /></I>,
  wallet: <I><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M16 15h2" /></I>,
  travel: <I><path d="M2 16l20-6-3-2-6 2-6-5-2 1 3 5-4 1-2-1z" /></I>,
  house: <I><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" /></I>,
  vendors: <I><path d="M3 7h13v10H3zM16 10h4l1 3v4h-5" /><circle cx="7" cy="18" r="1.5" /><circle cx="18" cy="18" r="1.5" /></I>,
  chevron: <I size={18}><path d="M15 6l-6 6 6 6" /></I>,
  close: <I size={22}><path d="M6 6l12 12M18 6L6 18" /></I>,
  check: <I size={20}><path d="M5 12l5 5L20 7" /></I>,
  phone: <I size={18}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></I>,
};
