import { format, toZonedTime } from 'date-fns-tz'

// KSA timezone as per backend spec (M018)
const KSA_TIMEZONE = 'Asia/Riyadh'

/**
 * Get current date in KSA timezone (YYYY-MM-DD format)
 * Day definition: Asia/Riyadh for everyone (per spec)
 */
export function getKSADate(): string {
  const now = new Date()
  const ksaTime = toZonedTime(now, KSA_TIMEZONE)
  return format(ksaTime, 'yyyy-MM-dd')
}

/**
 * Get current time in KSA timezone
 */
export function getKSATime(): Date {
  const now = new Date()
  return toZonedTime(now, KSA_TIMEZONE)
}

/**
 * Calculate seconds until next KSA midnight
 * Used for signed URL TTL (per spec)
 */
export function secondsUntilNextKSAMidnight(): number {
  const now = new Date()
  const ksaTime = toZonedTime(now, KSA_TIMEZONE)

  // Create next midnight in KSA
  const nextMidnight = new Date(ksaTime)
  nextMidnight.setDate(nextMidnight.getDate() + 1)
  nextMidnight.setHours(0, 0, 0, 0)

  // Convert back to UTC for calculation
  const nextMidnightUTC = new Date(nextMidnight.getTime() - (3 * 60 * 60 * 1000)) // KSA is UTC+3

  return Math.floor((nextMidnightUTC.getTime() - now.getTime()) / 1000)
}

/**
 * Check if date is today in KSA timezone
 */
export function isToday(dateString: string): boolean {
  return dateString === getKSADate()
}

/**
 * Format KSA date for display
 */
export function formatKSADate(dateString: string, locale: string = 'ar'): string {
  const date = new Date(dateString + 'T00:00:00')

  if (locale === 'ar') {
    return new Intl.DateTimeFormat('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: KSA_TIMEZONE
    }).format(date)
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: KSA_TIMEZONE
  }).format(date)
}