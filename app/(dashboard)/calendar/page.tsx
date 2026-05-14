import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarClient from './CalendarClient'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: locations } = await supabase.from('locations').select('*').eq('active', true)
  const { data: students } = await supabase
    .from('students')
    .select('id, first_name, last_name, source')
    .eq('active', true)
    .order('first_name') as { data: { id: string; first_name: string; last_name: string; source: string }[] | null }

  const { data: workSchedule } = await supabase
    .from('work_schedule')
    .select('*')
    .eq('active', true)
    .order('day_of_week')
    .order('start_time')

  return (
    <CalendarClient
      profile={profile}
      locations={locations || []}
      students={students || []}
      workSchedule={workSchedule || []}
    />
  )
}
