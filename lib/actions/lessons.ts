'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { LessonCategory, LessonType, LessonSource } from '@/lib/types'

export async function getLessons(date?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('lessons')
    .select('*, student:students(id, first_name, last_name, source), location:locations(id, name)')
    .order('lesson_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (date) query = query.eq('lesson_date', date)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getLessonsByMonth(year: number, month: number) {
  const supabase = await createClient()
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = `${year}-${String(month).padStart(2, '0')}-31`

  const { data, error } = await supabase
    .from('lessons')
    .select('id, lesson_date, start_time, duration_hours, category, source, status, student:students(id, first_name, last_name)')
    .gte('lesson_date', start)
    .lte('lesson_date', end)
    .neq('status', 'cancelled')
    .order('lesson_date')
    .order('start_time')

  if (error) throw error
  return data
}

export async function createLesson(formData: {
  student_id?: string
  lesson_date: string
  start_times: string[]
  category: LessonCategory
  lesson_type: LessonType
  location_id: string
  source: LessonSource
  price?: number
  notes?: string
  status?: 'pending' | 'confirmed'
}) {
  const supabase = await createClient()
  const lessons = formData.start_times.map(time => ({
    student_id: formData.student_id || null,
    lesson_date: formData.lesson_date,
    start_time: time,
    duration_hours: 1,
    category: formData.category,
    lesson_type: formData.lesson_type,
    location_id: formData.location_id,
    source: formData.source,
    price: formData.price || null,
    notes: formData.notes || null,
    status: formData.status || 'confirmed',
  }))

  const { data, error } = await supabase.from('lessons').insert(lessons).select()
  if (error) throw error

  // Create notification for admin if club booking
  if (formData.source === 'club') {
    await supabase.from('notifications').insert({
      title: 'Golf klub zakazao čas',
      description: `${formData.start_times.join(', ')} · ${formData.lesson_date}`,
      type: 'club_request',
      read: false,
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/calendar')
  return data
}

export async function updateLessonStatus(id: string, status: 'confirmed' | 'cancelled') {
  const supabase = await createClient()
  const { error } = await supabase
    .from('lessons')
    .update({ status })
    .eq('id', id)

  if (error) throw error
  revalidatePath('/dashboard')
  revalidatePath('/calendar')
}

export async function getWorkSchedule() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('work_schedule')
    .select('*')
    .eq('active', true)
    .order('day_of_week')
    .order('start_time')
  if (error) throw error
  return data
}

export async function getScheduleExceptions(year: number, month: number) {
  const supabase = await createClient()
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = `${year}-${String(month).padStart(2, '0')}-31`
  const { data, error } = await supabase
    .from('schedule_exceptions')
    .select('*')
    .gte('exception_date', start)
    .lte('exception_date', end)
  if (error) throw error
  return data
}

export async function upsertScheduleException(formData: {
  exception_date: string
  type: 'day_off' | 'extra'
  extra_slots?: string[]
  note?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('schedule_exceptions')
    .upsert(formData, { onConflict: 'exception_date' })
  if (error) throw error
  revalidatePath('/calendar')
  revalidatePath('/settings/hours')
}

export async function updateWorkSchedule(updates: { id: string; active: boolean }[]) {
  const supabase = await createClient()
  for (const u of updates) {
    await supabase.from('work_schedule').update({ active: u.active }).eq('id', u.id)
  }
  revalidatePath('/settings/hours')
}
