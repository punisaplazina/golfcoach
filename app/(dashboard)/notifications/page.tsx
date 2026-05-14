'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Calendar, CreditCard, Building2, Info } from 'lucide-react'

const TYPE_ICONS: Record<string, React.ElementType> = {
  lesson_reminder: Calendar,
  payment: CreditCard,
  club_request: Building2,
  club_invoice: CreditCard,
  general: Info,
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  lesson_reminder: { bg: '#FAEEDA', color: '#854F0B' },
  payment: { bg: '#E1F5EE', color: '#0F6E56' },
  club_request: { bg: '#E6F1FB', color: '#185FA5' },
  club_invoice: { bg: '#FAEEDA', color: '#854F0B' },
  general: { bg: '#F1EFE8', color: '#5F5E5A' },
}

export default function NotificationsPage() {
  const supabase = createClient()
  const [notifs, setNotifs] = useState<any[]>([])

  async function fetchNotifs() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
    setNotifs(data || [])
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    fetchNotifs()
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('read', false)
    fetchNotifs()
  }

  useEffect(() => { fetchNotifs() }, [])

  const unread = notifs.filter(n => !n.read).length

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Notifikacije</h1>
          {unread > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ background: '#1D9E75' }}>
              {unread} novo
            </span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs text-gray-500 hover:text-gray-700 underline">
            Označi sve kao pročitano
          </button>
        )}
      </div>

      <div className="space-y-2">
        {!notifs.length && (
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-10 text-center text-sm text-gray-400">
            <Bell size={28} className="mx-auto mb-2 text-gray-300" />
            Nema notifikacija
          </div>
        )}
        {notifs.map(n => {
          const Icon = TYPE_ICONS[n.type] || Info
          const colors = TYPE_COLORS[n.type] || TYPE_COLORS.general
          return (
            <div key={n.id}
              className={`bg-white rounded-xl border px-4 py-3 flex gap-3 transition-all ${
                n.read ? 'border-gray-100' : 'border-gray-200'
              }`}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: colors.bg }}>
                <Icon size={16} color={colors.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${n.read ? 'text-gray-600' : 'font-medium text-gray-900'}`}>
                  {n.title}
                </div>
                {n.description && (
                  <div className="text-xs text-gray-500 mt-0.5">{n.description}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(n.created_at).toLocaleString('sr')}
                </div>
              </div>
              {!n.read && (
                <button onClick={() => markRead(n.id)}
                  className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 self-start mt-0.5">
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
