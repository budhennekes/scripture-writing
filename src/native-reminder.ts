import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

const REMINDER_STORAGE_KEY = 'scripture-scribe-daily-reminder-v1'
const REMINDER_NOTIFICATION_ID = 264001
const REMINDER_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export type DailyReminder = { enabled: boolean; time: string }
export type ReminderScheduleResult = 'scheduled' | 'cancelled' | 'denied' | 'superseded'

let reminderRevision = 0
let reminderQueue: Promise<void> = Promise.resolve()

export function isNativeIOS(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

export function isValidReminderTime(time: string): boolean {
  return REMINDER_TIME_PATTERN.test(time)
}

export function loadDailyReminder(): DailyReminder {
  try {
    const value = JSON.parse(localStorage.getItem(REMINDER_STORAGE_KEY) || 'null')
    if (value && typeof value.enabled === 'boolean' && isValidReminderTime(value.time)) {
      return { enabled: value.enabled, time: value.time }
    }
  } catch {
    // Use a quiet evening reminder by default.
  }
  return { enabled: false, time: '19:00' }
}

export function saveDailyReminder(reminder: DailyReminder): void {
  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(reminder))
  } catch {
    // Local notification scheduling can still succeed if browser storage is full.
  }
}

export function reconcileDailyReminder(reminder: DailyReminder, requestPermission: boolean): Promise<ReminderScheduleResult> {
  const revision = ++reminderRevision
  const operation = reminderQueue.then(async (): Promise<ReminderScheduleResult> => {
    if (revision !== reminderRevision) return 'superseded'
    if (!reminder.enabled) {
      await cancelNativeReminder()
      return revision === reminderRevision ? 'cancelled' : 'superseded'
    }
    if (!isValidReminderTime(reminder.time)) throw new RangeError('Choose a valid reminder time.')

    let permission = await LocalNotifications.checkPermissions()
    if (revision !== reminderRevision) return 'superseded'
    if (permission.display !== 'granted' && requestPermission) {
      permission = await LocalNotifications.requestPermissions()
    }
    if (revision !== reminderRevision) return 'superseded'
    if (permission.display !== 'granted') {
      await cancelNativeReminder()
      return revision === reminderRevision ? 'denied' : 'superseded'
    }

    const [hour, minute] = reminder.time.split(':').map(Number)
    const at = new Date()
    at.setHours(hour, minute, 0, 0)
    if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1)

    await cancelNativeReminder()
    if (revision !== reminderRevision) return 'superseded'
    await LocalNotifications.schedule({
      notifications: [{
        id: REMINDER_NOTIFICATION_ID,
        title: 'A quiet moment with Scripture',
        body: 'Take a few minutes to write a passage by hand.',
        schedule: { at, repeats: true, every: 'day', allowWhileIdle: true },
      }],
    })
    return revision === reminderRevision ? 'scheduled' : 'superseded'
  })
  reminderQueue = operation.then(() => undefined, () => undefined)
  return operation
}

async function cancelNativeReminder(): Promise<void> {
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_NOTIFICATION_ID }] })
}
