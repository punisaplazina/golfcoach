import { WorkSchedule, ScheduleException, Lesson } from './types'

export function getAvailableSlots(
  date: Date,
  workSchedule: WorkSchedule[],
  exceptions: ScheduleException[],
  bookedLessons: Lesson[]
): string[] {
  const dateStr = formatDate(date)
  const dayOfWeek = date.getDay() // 0=Sun, 1=Mon...

  // Check for exception
  const exception = exceptions.find(e => e.exception_date === dateStr)
  if (exception?.type === 'day_off') return []

  let slots: string[] = []

  if (exception?.type === 'extra' && exception.extra_slots) {
    slots = exception.extra_slots
  } else {
    slots = workSchedule
      .filter(ws => ws.day_of_week === dayOfWeek && ws.active)
      .map(ws => ws.start_time.slice(0, 5))
  }

  // Remove booked slots
  const bookedTimes = bookedLessons
    .filter(l => l.lesson_date === dateStr && l.status !== 'cancelled')
    .map(l => l.start_time.slice(0, 5))

  return slots.filter(s => !bookedTimes.includes(s))
}

export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${parseInt(d)}. ${MONTH_NAMES[parseInt(m) - 1]} ${y}`
}

export function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5)
}

export function formatCurrency(amount: number): string {
  return `€${amount.toLocaleString('de-DE')}`
}

export const MONTH_NAMES = [
  'januar', 'februar', 'mart', 'april', 'maj', 'jun',
  'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'
]

export const MONTH_NAMES_CAP = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
  'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
]

export const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_LABELS = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota']
export const DAY_SHORT = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub']
