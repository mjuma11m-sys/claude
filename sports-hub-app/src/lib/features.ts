/* The app serves clubs and the federation first. The fan zone (home, vote, season pass) is built and tested but switched off:
   set VITE_FAN_ZONE=true at build time to bring it back. Nothing here is security; the data rules live in RLS. */
export const FAN_ZONE = import.meta.env.VITE_FAN_ZONE === 'true'

/* Social sign-in buttons show only when that provider is switched on in Supabase (Auth > Providers) AND the flag is set at build time,
   so a button never leads to a "provider is not enabled" error. */
export const OAUTH_PROVIDERS = [
  ...(import.meta.env.VITE_AUTH_GOOGLE === 'true' ? (['google'] as const) : []),
  ...(import.meta.env.VITE_AUTH_APPLE === 'true' ? (['apple'] as const) : []),
]
