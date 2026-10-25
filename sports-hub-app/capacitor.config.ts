import type { CapacitorConfig } from '@capacitor/cli'

/* iOS shell for trying the app on a phone through Xcode. Build the web app first with the trial flags (see package.json "ios:sync"). */
const config: CapacitorConfig = {
  appId: 'app.sportshub.trial',
  appName: 'Sports Hub',
  webDir: 'dist',
  ios: { contentInset: 'always' },
}
export default config
