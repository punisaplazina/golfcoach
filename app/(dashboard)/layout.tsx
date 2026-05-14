import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Profile doesn't exist yet — sign out and redirect
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar — desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar profile={profile} />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Mobile nav */}
        <div className="md:hidden">
          <MobileNav profile={profile} />
        </div>
      </div>
    </div>
  )
}
