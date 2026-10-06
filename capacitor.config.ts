import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.scripturebyhand.app',
  appName: 'Scripture by Hand',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#24251f',
  },
}

export default config
