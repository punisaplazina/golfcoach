'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDisplayDate, MONTH_NAMES_CAP } from '@/lib/utils'
import { CATEGORY_LABELS } from '@/lib/types'
import { Download } from 'lucide-react'

const CATEGORY_PRICES: Record<string, number> = {
  academy: 40,
  demo: 30,
  green_card: 70,
}

export default function InvoicePage() {
  const supabase = createClient()
  const now = new Date()
  const [lessons, setLessons] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [stats, setStats] = useState({ academy: 0, demo: 0, green_card: 0, total: 0 })

  useEffect(() => {
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`

    supabase
      .from('lessons')
      .select('*, student:students(first_name, last_name)')
      .eq('source', 'club')
      .in('category', ['academy', 'demo', 'green_card'])
      .gte('lesson_date', start)
      .lte('lesson_date', end)
      .order('lesson_date')
      .then(({ data }) => {
        setLessons(data || [])
        const s = { academy: 0, demo: 0, green_card: 0, total: 0 }
        for (const l of data || []) {
          const price = l.price || CATEGORY_PRICES[l.category] || 0
          s[l.category as keyof typeof s] = (s[l.category as keyof typeof s] || 0) + price
          s.total += price
        }
        setStats(s)
      })

    supabase
      .from('club_invoices')
      .select('*')
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setHistory(data || []))
  }, [])

  const monthName = MONTH_NAMES_CAP[now.getMonth()]

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold">Faktura kluba</h1>
        <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
          <Download size={14} /> PDF
        </button>
      </div>

      {/* Alert */}
      {stats.total > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between"
          style={{ background: '#FAEEDA', borderColor: '#EF9F27', color: '#854F0B' }}>
          <span>Dugujete instruktoru za {monthName.toLowerCase()} {now.getFullYear()}</span>
          <span className="text-lg font-semibold">{formatCurrency(stats.total)}</span>
        </div>
      )}
      {stats.total === 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-800">
          Nema otvorenih stavki za ovaj mesec.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500 mb-1">Akademija</div>
          <div className="text-xl font-semibold text-purple-700">{formatCurrency(stats.academy)}</div>
          <div className="text-xs text-gray-400">{lessons.filter(l => l.category === 'academy').length} časa × €40</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500 mb-1">Demo časovi</div>
          <div className="text-xl font-semibold" style={{ color: '#854F0B' }}>{formatCurrency(stats.demo)}</div>
          <div className="text-xs text-gray-400">{lessons.filter(l => l.category === 'demo').length} časa × €30</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500 mb-1">Green Card</div>
          <div className="text-xl font-semibold text-green-700">{formatCurrency(stats.green_card)}</div>
          <div className="text-xs text-gray-400">{lessons.filter(l => l.category === 'green_card').length} polaganja × €70</div>
        </div>
      </div>

      {/* Detail table */}
      {lessons.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Detalji — {monthName} {now.getFullYear()}</h2>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#FAEEDA', color: '#854F0B' }}>Na čekanju</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Učenik</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Datum</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Vrsta</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Trajanje</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Cena</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lessons.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">
                      {l.student ? `${l.student.first_name} ${l.student.last_name}` : 'Grupni'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{l.lesson_date}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        l.category === 'academy' ? 'bg-purple-50 text-purple-800' :
                        l.category === 'demo' ? 'bg-amber-50 text-amber-800' :
                        'bg-green-50 text-green-800'
                      }`}>
                        {CATEGORY_LABELS[l.category as keyof typeof CATEGORY_LABELS]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {l.category === 'green_card' ? '—' : `${l.duration_hours}h`}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {formatCurrency(l.price || CATEGORY_PRICES[l.category] || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-right">Ukupno:</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(stats.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Rok plaćanja: {new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('sr')}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold">Istorija plaćanja</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {history.map(inv => (
              <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {new Date(inv.period_start).toLocaleDateString('sr', { month: 'long', year: 'numeric' })}
                  </div>
                  <div className="text-xs text-gray-400">
                    Plaćeno {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('sr') : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{formatCurrency(inv.total_amount)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-800 font-medium">Plaćeno</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
