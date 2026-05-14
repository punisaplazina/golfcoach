'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Check } from 'lucide-react'

export default function PaymentsPage() {
  const supabase = createClient()
  const [students, setStudents] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState({ collected: 0, outstanding: 0, clubOwes: 0 })

  async function fetchData() {
    const { data: stus } = await supabase
      .from('students')
      .select('*, student_packages(*, package:packages(*))')
      .eq('active', true)
      .order('first_name')
    setStudents(stus || [])

    let collected = 0, outstanding = 0, clubOwes = 0
    for (const s of stus || []) {
      const pkg = s.student_packages?.[0]
      if (pkg) {
        collected += pkg.total_paid
        outstanding += Math.max(pkg.total_due - pkg.total_paid, 0)
      }
    }

    // Club owes for academy/demo/green_card
    const { data: clubLessons } = await supabase
      .from('lessons')
      .select('price')
      .eq('source', 'club')
      .in('category', ['academy', 'demo', 'green_card'])
      .eq('status', 'confirmed')
    clubOwes = (clubLessons || []).reduce((s: number, l: any) => s + (l.price || 0), 0)

    setStats({ collected, outstanding, clubOwes })
  }

  useEffect(() => { fetchData() }, [])

  async function markPaid(studentId: string, pkgId: string, totalDue: number) {
    await supabase.from('student_packages').update({ total_paid: totalDue }).eq('id', pkgId)
    await supabase.from('payments').insert({
      student_id: studentId,
      amount: totalDue,
      payment_date: new Date().toISOString().split('T')[0],
      note: 'Plaćeno u celosti',
    })
    fetchData()
  }

  const filtered = students.filter(s => {
    const pkg = s.student_packages?.[0]
    if (filter === 'all') return true
    if (filter === 'paid') return !pkg || pkg.total_paid >= pkg.total_due
    if (filter === 'unpaid') return pkg && pkg.total_paid === 0
    if (filter === 'partial') return pkg && pkg.total_paid > 0 && pkg.total_paid < pkg.total_due
    return true
  })

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold mb-5">Plaćanja</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500 mb-1">Naplaćeno</div>
          <div className="text-2xl font-semibold text-green-700">{formatCurrency(stats.collected)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500 mb-1">Neplaćeno (učenici)</div>
          <div className="text-2xl font-semibold text-red-600">{formatCurrency(stats.outstanding)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500 mb-1">Golf klub duguje</div>
          <div className="text-2xl font-semibold" style={{ color: '#854F0B' }}>{formatCurrency(stats.clubOwes)}</div>
          <div className="text-xs text-gray-400">Akademija + Demo + Green Card</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[['all','Svi'],['paid','Plaćeno'],['partial','Delimično'],['unpaid','Neplaćeno']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === v ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            style={filter === v ? { background: '#1D9E75' } : {}}>
            {l}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Učenik</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Izvor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Paket</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Ukupno</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Plaćeno</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Duguje</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Akcija</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => {
                const pkg = s.student_packages?.[0]
                const due = pkg ? Math.max(pkg.total_due - pkg.total_paid, 0) : 0
                const pct = pkg ? Math.round(pkg.total_paid / pkg.total_due * 100) : 100
                const status = !pkg ? 'na' : due === 0 ? 'paid' : pkg.total_paid === 0 ? 'unpaid' : 'partial'
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.first_name} {s.last_name}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.source === 'private' ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'}`}>
                        {s.source === 'private' ? 'Privatni' : 'Klub'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{pkg?.package?.name || '—'}</td>
                    <td className="px-4 py-3 font-medium">{pkg ? formatCurrency(pkg.total_due) : '—'}</td>
                    <td className="px-4 py-3 text-green-700">{pkg ? formatCurrency(pkg.total_paid) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={due > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                        {pkg ? formatCurrency(due) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {status === 'paid' || !pkg ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <button onClick={() => markPaid(s.id, pkg.id, pkg.total_due)}
                          className="flex items-center gap-1 ml-auto text-xs px-2.5 py-1 bg-green-50 text-green-800 rounded-lg font-medium hover:bg-green-100">
                          <Check size={12} /> Naplati
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Nema rezultata</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
