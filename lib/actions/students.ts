'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getStudents(source?: 'private' | 'club') {
  const supabase = await createClient()
  let query = supabase
    .from('students')
    .select('*, student_packages(*, package:packages(*))')
    .eq('active', true)
    .order('first_name')

  if (source) query = query.eq('source', source)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createStudent(formData: {
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
  package_id?: string
}) {
  const supabase = await createClient()
  const { package_id, ...studentData } = formData

  const { data: student, error } = await supabase
    .from('students')
    .insert(studentData)
    .select()
    .single()

  if (error) throw error

  if (package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('*')
      .eq('id', package_id)
      .single()

    if (pkg) {
      await supabase.from('student_packages').insert({
        student_id: student.id,
        package_id,
        lessons_remaining: pkg.lessons_count,
        total_due: pkg.price,
        total_paid: 0,
      })
    }
  }

  revalidatePath('/students')
  return student
}

export async function updateStudent(id: string, updates: Partial<{
  first_name: string
  last_name: string
  phone: string
  email: string
  gender: 'M' | 'F'
  handedness: 'right' | 'left'
  age: number
  level: 'beginner' | 'intermediate' | 'advanced'
  notes: string
  active: boolean
}>) {
  const supabase = await createClient()
  const { error } = await supabase.from('students').update(updates).eq('id', id)
  if (error) throw error
  revalidatePath('/students')
}
