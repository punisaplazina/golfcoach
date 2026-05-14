'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/actions/auth'
import { Profile } from '@/lib/types'
import {
  LayoutDashboard, Calendar, Users, CreditCard,
  Bell, Settings, LogOut, Building2, Receipt, Shield
} from 'lucide-react'

interface Props { profile: Profile }

const adminNav = [
  { href: '/dashboard', label: 'Pregled', icon: LayoutDashboard },
  { href: '/calendar', label: 'Kalendar', icon: Calendar },
  { href: '/students', label: 'Učenici', icon: Users },
  { href: '/payments', label: 'Plaćanja', icon: CreditCard },
]
const adminNav2 = [
  { href: '/notifications', label: 'Notifikacije', icon: Bell },
  { href: '/settings/hours', label: 'Radno vreme', icon: Settings },
]

const clubNav = [
  { href: '/dashboard', label: 'Kalendar', icon: Calendar },
  { href: '/students', label: 'Moji učenici', icon: Users },
  { href: '/invoice', label: 'Faktura', icon: Receipt },
]

export default function Sidebar({ profile }: Props) {
  const pathname = usePathname()
  const isAdmin = profile.role === 'admin'
  const nav1 = isAdmin ? adminNav : clubNav
  const nav2 = isAdmin ? adminNav2 : []

  return (
    <div className="w-52 flex flex-col bg-white border-r border-gray-100 h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: isAdmin ? '#1D9E75' : '#378ADD' }}>
          {isAdmin
            ? <Shield size={14} color="white" />
            : <Building2 size={14} color="white" />}
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">GolfCoach</div>
          <div className="text-xs text-gray-400 leading-tight">
            {isAdmin ? 'Administrator' : 'Golf klub'}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {nav1.map(item => (
          <NavItem key={item.href} {...item} active={pathname === item.href} />
        ))}
        {nav2.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-3">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Ostalo</div>
            </div>
            {nav2.map(item => (
              <NavItem key={item.href} {...item} active={pathname === item.href} />
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-gray-50">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
            style={{ background: isAdmin ? '#E1F5EE' : '#E6F1FB', color: isAdmin ? '#0F6E56' : '#185FA5' }}>
            {profile.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{profile.name}</div>
            <div className="text-xs text-gray-400">{isAdmin ? 'Admin' : 'Klub'}</div>
          </div>
          <form action={logout}>
            <button type="submit" className="text-gray-400 hover:text-gray-600 transition-colors p-1">
              <LogOut size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function NavItem({ href, label, icon: Icon, active }: {
  href: string; label: string; icon: React.ElementType; active: boolean
}) {
  return (
    <Link href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
        active
          ? 'bg-green-50 text-green-800 font-medium border-l-2 border-green-600 rounded-l-none'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon size={16} />
      {label}
    </Link>
  )
}
