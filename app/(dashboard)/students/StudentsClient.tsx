'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Package, Student, CATEGORY_LABELS, LEVEL_LABELS } from '@/lib/types'
import { Plus, X, Search } from 'lucide-react'

interface Props { profile: Profile; packages: Package[] }

const SOURCE_LABELS = { private: 'Privatni', club: 'Klub' }
const HAND_LABELS = { right: 'Desnoruk', left: 'Levoruk' }
const GENDER_LABELS = { M: 'Muški', F: 'Ženski' }

export default function StudentsClient({ profile, packages }: Props) {
  const supabase = createClient()
  const isAdmin = profile.role === 'admin'
  const [students, setStudents] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    gender: 'M', handedness: 'right', age: '',
    source: isAdmin ? 'private' : 'club',
    level: 'beginner', notes: '', package_id: '',
  })

  async function fetchStudents() {
    let query = supabase
      .from('students')
      .select('*, student_packages(*, package:packages(*))')
      .eq('active', true)
      .order('first_name')
    if (!isAdmin) query = query.eq('source', 'club')
    const { data } = await query
    setStudents(data || [])
  }

  useEffect(() => { fetchStudents() }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const { package_id, age, ...rest } = form
      const { data: stu } = await supabase.from('students').insert({
        ...rest,
        age: age ? parseInt(age) : null,
      }).select().single()

      if (stu && package_id) {
        const pkg = packages.find(p => p.id === package_id)
        if (pkg) {
          await supabase.from('student_packages').insert({
            student_id: stu.id,
            package_id,
            lessons_remaining: pkg.lessons_count,
            total_due: pkg.price,
            total_paid: 0,
          })
        }
      }

      setShowModal(false)
      setForm({ first_name: '', last_name: '', phone: '', email: '', gender: 'M', handedness: 'right', age: '', source: isAdmin ? 'private' : 'club', level: 'beginner', notes: '', package_id: '' })
      fetchStudents()
    } finally {
      setSaving(false)
    }
  }

  const filtered = students.filter(s => {
    const name = `${s.first_name} ${s.last_name}`.toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase())
    const matchSource = filterSource === 'all' || s.source === filterSource
    return matchSearch && matchSource
  })

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold">Učenici</h1>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg"
          style={{ background: isAdmin ? '#1D9E75' : '#378ADD' }}>
          <Plus size={15} /> Novi učenik
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Pretraži..." className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-48" />
        </div>
        {isAdmin && (
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="all">Svi izvori</option>
            <option value="private">Privatni</option>
            <option value="club">Golf klub</option>
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Učenik</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Pol / Ruka</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">God.</th>
                {isAdmin && <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Izvor</th>}
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Paket</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Preost.</th>
                {isAdmin && <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Plaćanje</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => {
                const pkg = s.student_packages?.[0]
                const due = pkg ? pkg.total_due - pkg.total_paid : 0
                const pct = pkg ? Math.round(pkg.total_paid / pkg.total_due * 100) : 100
                const payStatus = !pkg ? null : due === 0 ? 'paid' : pkg.total_paid === 0 ? 'unpaid' : 'partial'
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.first_name} {s.last_name}</div>
                      {s.phone && <div className="text-xs text-gray-400">{s.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {GENDER_LABELS[s.gender as keyof typeof GENDER_LABELS] || '—'} / {HAND_LABELS[s.handedness as keyof typeof HAND_LABELS] || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.age || '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.source === 'private' ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'}`}>
                          {SOURCE_LABELS[s.source as keyof typeof SOURCE_LABELS]}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-600">{pkg?.package?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${(pkg?.lessons_remaining || 0) <= 2 ? 'text-amber-700' : 'text-gray-700'}`}>
                        {pkg?.lessons_remaining ?? '—'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {payStatus && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            payStatus === 'paid' ? 'bg-green-50 text-green-800' :
                            payStatus === 'unpaid' ? 'bg-red-50 text-red-700' :
                            'bg-amber-50 text-amber-800'
                          }`}>
                            {payStatus === 'paid' ? 'Plaćeno' : payStatus === 'unpaid' ? 'Neplaćeno' : `€${due} duguje`}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Nema učenika</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold">Novi učenik</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Ime</label>
                  <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    placeholder="Ime" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Prezime</label>
                  <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    placeholder="Prezime" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Pol</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="M">Muški</option>
                    <option value="F">Ženski</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Starost</label>
                  <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                    placeholder="npr. 30" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Dominantna ruka</label>
                  <select value={form.handedness} onChange={e => setForm(f => ({ ...f, handedness: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="right">Desnoruk</option>
                    <option value="left">Levoruk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Telefon</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+381..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Izvor</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="private">Privatni</option>
                    <option value="club">Golf klub</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Paket</label>
                <select value={form.package_id} onChange={e => setForm(f => ({ ...f, package_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Bez paketa</option>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name} — €{p.price}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Napomena</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ciljevi, posebni zahtevi..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-16 resize-none" />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Otkaži</button>
              <button onClick={handleSave} disabled={saving || !form.first_name || !form.last_name}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ background: '#1D9E75' }}>
                {saving ? 'Čuvanje...' : 'Dodaj učenika'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
