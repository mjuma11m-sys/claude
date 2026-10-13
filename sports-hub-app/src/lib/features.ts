/* The app serves clubs and the federation first. The fan zone (home, vote, season pass) is built and tested but switched off:
   set VITE_FAN_ZONE=true at build time to bring it back. Nothing here is security; the data rules live in RLS. */
export const FAN_ZONE = import.meta.env.VITE_FAN_ZONE === 'true'
