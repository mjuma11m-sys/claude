export const POLICY_DATE = '13 أكتوبر 2026'
/* Legal gate (DW-008): real sign-up stays closed until a privacy contact exists. */
export const PRIVACY_CONTACT: string = import.meta.env.VITE_PRIVACY_CONTACT ?? ''
/* sessionStorage 'sh.homeIntro' (the Home entrance plays once per tab) clears itself when the tab closes. */
export const DEMO_KEYS = ['sh.demoRole', 'sh.motmVote', 'sh.favClub', 'sh.installDismissed', 'sh.demoReport', 'sh.demoAgreement', 'sh.demoImport', 'sh.demoDev', 'sh.nextMatch', 'sh.demoLineups', 'sh.demoAttendance', 'sh.demoRights', 'sh.demoReports']
