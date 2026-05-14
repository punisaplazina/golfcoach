import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudentsClient from './StudentsClient'

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: packages } = await supabase.from('packages').select('*').eq('active', true)

  return <StudentsClient profile={profile} packages={packages || []} />
}
