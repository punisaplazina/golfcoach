export type Role = 'admin' | 'club'

export interface Profile {
  id: string
  role: Role
  name: string
  created_at: string
}

export interface Student {
  id: string
  first_name: string
  last_name: string
  phone?: string
  email?: string
  gender?: 'M' | 'F'
  handedness?: 'right' | 'left'
  age?: number
  source: 'private' | 'club'
  level?: 'beginner' | 'intermediate' | 'advanced'
  notes?: string
  active: boolean
  created_at: string
  student_packages?: StudentPackage[]
}

export interface Package {
  id: string
  name: string
  price: number
  lessons_count: number
  description?: string
  active: boolean
}

export interface StudentPackage {
  id: string
  student_id: string
  package_id: string
  lessons_remaining: number
  total_paid: number
  total_due: number
  created_at: string
  package?: Package
}

export interface Location {
  id: string
  name: string
  address?: string
  type: 'driving_range' | 'golf_course' | 'simulator' | 'private'
  active: boolean
}

export type LessonCategory = 'regular' | 'demo' | 'academy' | 'green_card'
export type LessonType = 'individual' | 'group'
export type LessonStatus = 'pending' | 'confirmed' | 'cancelled'
export type LessonSource = 'private' | 'club'

export interface Lesson {
  id: string
  student_id?: string
  lesson_date: string
  start_time: string
  duration_hours: number
  category: LessonCategory
  lesson_type?: LessonType
  location_id?: string
  source?: LessonSource
  status: LessonStatus
  price?: number
  notes?: string
  reminder_sent: boolean
  created_at: string
  student?: Student
  location?: Location
}

export interface WorkSchedule {
  id: string
  day_of_week: number
  start_time: string
  active: boolean
}

export interface ScheduleException {
  id: string
  exception_date: string
  type: 'day_off' | 'extra'
  extra_slots?: string[]
  note?: string
}

export interface Payment {
  id: string
  student_id: string
  amount: number
  payment_date: string
  note?: string
  created_at: string
  student?: Student
}

export interface ClubInvoice {
  id: string
  period_start: string
  period_end: string
  total_amount: number
  status: 'pending' | 'paid'
  paid_at?: string
  created_at: string
}

export interface Notification {
  id: string
  title: string
  description?: string
  type: 'lesson_reminder' | 'payment' | 'club_request' | 'club_invoice' | 'general'
  read: boolean
  created_at: string
}

export const CATEGORY_LABELS: Record<LessonCategory, string> = {
  regular: 'Regularni',
  demo: 'Demo',
  academy: 'Akademija',
  green_card: 'Green Card',
}

export const LEVEL_LABELS = {
  beginner: 'Početnik',
  intermediate: 'Srednji',
  advanced: 'Napredni',
}

export const DAY_NAMES = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub']
export const MONTH_NAMES = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
  'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
]
