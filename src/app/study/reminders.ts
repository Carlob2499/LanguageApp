/**
 * Local reminders without a server. A reminder time is kept in settings; while the app is open
 * (or installed and recently open), a timer fires a notification at that time if there is work.
 * The app badge mirrors the number of due reviews where the Badging API exists.
 */

export interface ReminderSettings {
  enabled: boolean
  /** "HH:MM", 24-hour local time. */
  time: string
}

export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, time: '19:00' }

export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined' && 'serviceWorker' in navigator
}

export async function askNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

/** Milliseconds until the next occurrence of `time` (today if still ahead, else tomorrow). */
export function msUntil(time: string, now = new Date()): number {
  const [h = 0, m = 0] = time.split(':').map((n) => Number.parseInt(n, 10))
  const next = new Date(now)
  next.setHours(h, m, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime()
}

export async function showReminder(due: number): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  const title =
    due > 0 ? `${due} ${due === 1 ? 'card is' : 'cards are'} waiting` : 'Time for Kintsugi'
  const body =
    due > 0 ? 'A short session keeps your reviews on schedule.' : 'Learn something new today?'
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (reg) {
      await reg.showNotification(title, {
        body,
        tag: 'kintsugi-reminder',
        icon: '/icons/icon-192.png',
      })
      return
    }
    new Notification(title, { body, tag: 'kintsugi-reminder', icon: '/icons/icon-192.png' })
  } catch {
    // Notifications are best effort.
  }
}

export function setBadge(due: number): void {
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }
  try {
    if (due > 0) void nav.setAppBadge?.(due)
    else void nav.clearAppBadge?.()
  } catch {
    // Not installed, or no badge support.
  }
}

/**
 * Arms one timer for the next reminder. Returns a disposer. `dueCount` is read when the timer
 * fires so the message is current.
 */
export function armReminder(
  settings: ReminderSettings,
  dueCount: () => Promise<number>,
): () => void {
  if (!settings.enabled) return () => {}
  const delay = Math.min(msUntil(settings.time), 2 ** 31 - 1)
  const id = window.setTimeout(() => {
    void dueCount().then((due) => showReminder(due))
  }, delay)
  return () => window.clearTimeout(id)
}
