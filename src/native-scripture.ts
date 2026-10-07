import { registerPlugin } from '@capacitor/core'

type VerseOptions = { reference: string; text: string }

type ScriptureNativePlugin = {
  openHandwriting(options: VerseOptions): Promise<{ opened: boolean }>
  updateWidget(options: VerseOptions): Promise<void>
}

const ScriptureNative = registerPlugin<ScriptureNativePlugin>('ScriptureNative')

export function openNativeHandwriting(options: VerseOptions): Promise<{ opened: boolean }> {
  return ScriptureNative.openHandwriting(options)
}

export function syncNativeVerseWidget(options: VerseOptions): Promise<void> {
  return ScriptureNative.updateWidget(options)
}
