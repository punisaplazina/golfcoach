import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, formatCurrency, MONTH_NAMES_CAP } from '@/lib/utils'
import { CATEGORY_LABELS } from '@/lib/types'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const today = formatDate(new Date())
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`

  const { data: todayLessons } = await supabase
    .from('lessons')
    .select('*, student:students(first_name, last_name, source), location:locations(name)')
    .eq('lesson_date', today)
    .neq('status', 'cancelled')
    .order('start_time')

  const { data: pendingLessons } = await supabase
    .from('lessons')
    .select('*, student:students(first_name, last_name)')
    .eq('status', 'pending')
    .order('lesson_date')
    .order('start_time')
    .limit(5)

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(5)

  // Month earnings (admin only)
  let monthEarnings = 0
  if (profile.role === 'admin') {
    const { data: monthLessons } = await supabase
      .from('lessons')
      .select('price')
      .gte('lesson_date', monthStart)
      .lte('lesson_date', monthEnd)
      .eq('status', 'confirmed')
    monthEarnings = (monthLessons || []).reduce((s, l) => s + (l.price || 0), 0)
  }

  const monthName = MONTH_NAMES_CAP[now.getMonth()]
  const isAdmin = profile.role === 'admin'

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">
            {isAdmin ? `Dobro jutro, ${profile.name}` : 'Dobrodošli'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('sr', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {isAdmin && (
          <Link href="/calendar"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg"
            style={{ background: '#1D9E75' }}>
            + Nov čas
          </Link>
        )}
      </div>

      {/* Stats */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Danas" value={String(todayLessons?.length || 0)} sub="časova" />
          <StatCard label={`Prihod (${monthName})`} value={formatCurrency(monthEarnings)} sub="ovog meseca" />
          <StatCard label="Na čekanju" value={String(pendingLessons?.length || 0)} sub="zahteva kluba" color="amber" />
          <StatCard label="Notifikacije" value={String(notifications?.length || 0)} sub="nepročitanih" color="blue" />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Today's lessons */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Danas, {new Date().getDate()}. {monthName.toLowerCase()}</h2>
            <Link href="/calendar" className="text-xs text-green-700 hover:underline">Kalendar →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!todayLessons?.length && (
              <div className="px-4 py-6 text-sm text-gray-400 text-center">Nema časova danas</div>
            )}
            {todayLessons?.map(lesson => (
              <div key={lesson.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-1.5 h-8 rounded-full flex-shrink-0"
                  style={{ background: lesson.source === 'private' ? '#1D9E75' : '#378ADD' }} />
                <div className="text-xs text-gray-400 w-12">{lesson.start_time?.slice(0,5)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {lesson.student
                      ? `${lesson.student.first_name} ${lesson.student.last_name}`
                      : 'Grupni čas'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {CATEGORY_LABELS[lesson.category as keyof typeof CATEGORY_LABELS]} · {lesson.location?.name}
                  </div>
                </div>
                {isAdmin && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    lesson.source === 'private'
                      ? 'bg-green-50 text-green-800'
                      : 'bg-blue-50 text-blue-800'
                  }`}>
                    {lesson.source === 'private' ? 'Privatni' : 'Klub'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pending requests (admin) or notifications (club) */}
        {isAdmin ? (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold">Zahtevi golf kluba</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {!pendingLessons?.length && (
                <div className="px-4 py-6 text-sm text-gray-400 text-center">Nema zahteva na čekanju</div>
              )}
              {pendingLessons?.map(lesson => (
                <PendingLesson key={lesson.id} lesson={lesson} />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Zakazani časovi</h2>
              <Link href="/invoice" className="text-xs text-blue-700 hover:underline">Faktura →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {!todayLessons?.filter((l: any) => l.source === 'club').length && (
                <div className="px-4 py-6 text-sm text-gray-400 text-center">Nema vaših časova danas</div>
              )}
              {todayLessons?.filter((l: any) => l.source === 'club').map((lesson: any) => (
                <div key={lesson.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: '#378ADD' }} />
                  <div className="text-xs text-gray-400 w-12">{lesson.start_time?.slice(0,5)}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {lesson.student ? `${lesson.student.first_name} ${lesson.student.last_name}` : 'Grupni'}
                    </div>
                    <div className="text-xs text-gray-400">{CATEGORY_LABELS[lesson.category as keyof typeof CATEGORY_LABELS]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color = 'green' }: {
  label: string; value: string; sub: string; color?: string
}) {
  const colors: Record<string, string> = {
    green: 'text-green-700',
    amber: 'text-amber-700',
    blue: 'text-blue-700',
    gray: 'text-gray-700',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${colors[color]}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  )
}

function PendingLesson({ lesson }: { lesson: any }) {
  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <div className="w-1.5 h-8 rounded-full flex-shrink-0 mt-0.5" style={{ background: '#378ADD' }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">
          {lesson.student
            ? `${lesson.student.first_name} ${lesson.student.last_name}`
            : 'Grupni čas'}
        </div>
        <div className="text-xs text-gray-400">
          {lesson.lesson_date} · {lesson.start_time?.slice(0,5)} · {CATEGORY_LABELS[lesson.category as keyof typeof CATEGORY_LABELS]}
        </div>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <ApproveButton id={lesson.id} action="confirmed" />
        <ApproveButton id={lesson.id} action="cancelled" />
      </div>
    </div>
  )
}

function ApproveButton({ id, action }: { id: string; action: 'confirmed' | 'cancelled' }) {
  const isApprove = action === 'confirmed'
  return (
    <form action={async () => {
      'use server'
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      await supabase.from('lessons').update({ status: action }).eq('id', id)
    }}>
      <button type="submit"
        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
          isApprove
            ? 'bg-green-50 text-green-800 hover:bg-green-100'
            : 'bg-red-50 text-red-700 hover:bg-red-100'
        }`}>
        {isApprove ? 'Prihvati' : 'Odbij'}
      </button>
    </form>
  )
}
