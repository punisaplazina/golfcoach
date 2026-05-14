'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Profile } from '@/lib/types'
import { LayoutDashboard, Calendar, Users, CreditCard, Receipt } from 'lucide-react'

interface Props { profile: Profile }

const adminItems = [
  { href: '/dashboard', label: 'Pregled', icon: LayoutDashboard },
  { href: '/calendar', label: 'Kalendar', icon: Calendar },
  { href: '/students', label: 'Učenici', icon: Users },
  { href: '/payments', label: 'Plaćanja', icon: CreditCard },
]

const clubItems = [
  { href: '/dashboard', label: 'Kalendar', icon: Calendar },
  { href: '/students', label: 'Učenici', icon: Users },
  { href: '/invoice', label: 'Faktura', icon: Receipt },
]

export default function MobileNav({ profile }: Props) {
  const pathname = usePathname()
  const items = profile.role === 'admin' ? adminItems : clubItems

  return (
    <nav className="flex bg-white border-t border-gray-100 safe-area-inset-bottom">
      {items.map(item => {
        const active = pathname === item.href
        return (
          <Link key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-xs transition-colors ${
              active ? 'text-green-700' : 'text-gray-400'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
