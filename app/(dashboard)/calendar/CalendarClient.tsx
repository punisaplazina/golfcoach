'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Location, WorkSchedule, Lesson, CATEGORY_LABELS } from '@/lib/types'

type StudentPartial = { id: string; first_name: string; last_name: string; source: string }
import { formatDate, MONTH_NAMES_CAP, DAY_SHORT } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus, X, Check, Clock } from 'lucide-react'

interface Props {
  profile: Profile
  locations: Location[]
  students: StudentPartial[]
  workSchedule: WorkSchedule[]
}

export default function CalendarClient({ profile, locations, students, workSchedule }: Props) {
  const supabase = createClient()
  const isAdmin = profile.role === 'admin'

  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(today)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [exceptions, setExceptions] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    student_id: '',
    category: 'regular',
    lesson_type: 'individual',
    location_id: locations[0]?.id || '',
    price: '',
    notes: '',
    new_student: false,
    new_first: '', new_last: '', new_phone: '', new_gender: 'M', new_handedness: 'right', new_age: '',
  })

  const fetchLessons = useCallback(async () => {
    const start = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`
    const end = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-31`
    const { data } = await supabase
      .from('lessons')
      .select('*, student:students(id, first_name, last_name, source)')
      .gte('lesson_date', start)
      .lte('lesson_date', end)
      .neq('status', 'cancelled')
      .order('start_time')
    setLessons(data || [])
  }, [viewMonth, viewYear])

  const fetchExceptions = useCallback(async () => {
    const start = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`
    const end = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-31`
    const { data } = await supabase
      .from('schedule_exceptions')
      .select('*')
      .gte('exception_date', start)
      .lte('exception_date', end)
    setExceptions(data || [])
  }, [viewMonth, viewYear])

  useEffect(() => { fetchLessons(); fetchExceptions() }, [fetchLessons, fetchExceptions])

  function getFreeSlots(date: Date): string[] {
    const dateStr = formatDate(date)
    const dow = date.getDay()
    const ex = exceptions.find(e => e.exception_date === dateStr)
    if (ex?.type === 'day_off') return []
    let slots: string[] = []
    if (ex?.type === 'extra') {
      slots = ex.extra_slots || []
    } else {
      slots = workSchedule
        .filter(ws => ws.day_of_week === dow)
        .map(ws => ws.start_time.slice(0, 5))
    }
    const booked = lessons
      .filter(l => l.lesson_date === dateStr)
      .map(l => l.start_time.slice(0, 5))
    return slots.filter(s => !booked.includes(s))
  }

  function getDayLessons(date: Date) {
    return lessons.filter(l => l.lesson_date === formatDate(date))
  }

  function buildCalendarDays() {
    const first = new Date(viewYear, viewMonth, 1)
    const last = new Date(viewYear, viewMonth + 1, 0)
    const startDow = (first.getDay() + 6) % 7 // Mon=0
    const days: (Date | null)[] = []
    for (let i = 0; i < startDow; i++) days.push(null)
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(viewYear, viewMonth, d))
    while (days.length % 7 !== 0) days.push(null)
    return days
  }

  function toggleSlot(t: string) {
    setSelectedSlots(prev =>
      prev.includes(t) ? prev.filter(s => s !== t) : [...prev, t].sort()
    )
  }

  async function handleBook() {
    if (!selectedDate || !selectedSlots.length) return
    setSaving(true)
    try {
      let studentId = form.student_id

      if (form.new_student) {
        const { data: newStu } = await supabase.from('students').insert({
          first_name: form.new_first,
          last_name: form.new_last,
          phone: form.new_phone || null,
          gender: form.new_gender,
          handedness: form.new_handedness,
          age: form.new_age ? parseInt(form.new_age) : null,
          source: 'club',
        }).select().single()
        studentId = newStu?.id || ''
      }

      const lessonRows = selectedSlots.map(t => ({
        student_id: studentId || null,
        lesson_date: formatDate(selectedDate),
        start_time: t,
        duration_hours: 1,
        category: form.category,
        lesson_type: form.lesson_type,
        location_id: form.location_id,
        source: isAdmin ? 'private' : 'club',
        price: form.price ? parseFloat(form.price) : null,
        notes: form.notes || null,
        status: isAdmin ? 'confirmed' : 'pending',
      }))

      await supabase.from('lessons').insert(lessonRows)

      if (!isAdmin) {
        await supabase.from('notifications').insert({
          title: 'Golf klub zakazao čas',
          description: `${selectedSlots.join(', ')} · ${formatDate(selectedDate)}`,
          type: 'club_request',
          read: false,
        })
      }

      setShowModal(false)
      setSelectedSlots([])
      fetchLessons()
    } finally {
      setSaving(false)
    }
  }

  const calDays = buildCalendarDays()
  const selDateStr = selectedDate ? formatDate(selectedDate) : null
  const dayLessons = selectedDate ? getDayLessons(selectedDate) : []
  const freeSlots = selectedDate ? getFreeSlots(selectedDate) : []

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold">Kalendar</h1>
        {isAdmin && (
          <button onClick={() => { setShowModal(true); setSelectedSlots([]) }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg"
            style={{ background: '#1D9E75' }}>
            <Plus size={15} /> Nov čas
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-500 mb-4 flex-wrap">
        {isAdmin && <><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-600 inline-block"></span>Privatni</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>Klub</span></>}
        {!isAdmin && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>Vaši časovi</span>}
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-600 inline-block"></span>Slobodni termini</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Calendar */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1) } else setViewMonth(m => m-1) }}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold">{MONTH_NAMES_CAP[viewMonth]} {viewYear}</span>
            <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1) } else setViewMonth(m => m+1) }}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="p-3">
            {/* Day names */}
            <div className="grid grid-cols-7 mb-1">
              {['Pon','Uto','Sre','Čet','Pet','Sub','Ned'].map(d => (
                <div key={d} className="text-center text-xs text-gray-400 py-1 font-medium">{d}</div>
              ))}
            </div>
            {/* Days */}
            <div className="grid grid-cols-7 gap-0.5">
              {calDays.map((date, i) => {
                if (!date) return <div key={i} />
                const dateStr = formatDate(date)
                const isToday = dateStr === formatDate(today)
                const isSel = selDateStr === dateStr
                const dayL = getDayLessons(date)
                const hasFree = getFreeSlots(date).length > 0
                const hasPrivate = dayL.some(l => l.source === 'private')
                const hasClub = dayL.some(l => l.source === 'club')

                return (
                  <button key={dateStr} onClick={() => setSelectedDate(date)}
                    className={`relative flex flex-col items-center py-1.5 rounded-lg transition-all ${
                      isSel ? 'bg-green-50' : 'hover:bg-gray-50'
                    } ${hasFree ? 'border-b-2 border-green-500' : ''}`}>
                    <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-green-600 text-white font-semibold' : isSel ? 'font-semibold text-green-800' : 'text-gray-700'
                    }`}>
                      {date.getDate()}
                    </span>
                    <div className="flex gap-0.5 mt-0.5">
                      {isAdmin && hasPrivate && <span className="w-1 h-1 rounded-full bg-green-600" />}
                      {hasClub && <span className="w-1 h-1 rounded-full bg-blue-500" />}
                      {!isAdmin && dayL.some(l => l.source === 'private') && <span className="w-1 h-1 rounded-full bg-gray-400" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Day detail */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold">
              {selectedDate
                ? `${selectedDate.getDate()}. ${MONTH_NAMES_CAP[selectedDate.getMonth()].toLowerCase()}`
                : 'Izaberi datum'}
            </span>
            {selectedDate && freeSlots.length > 0 && !isAdmin && (
              <button
                onClick={() => { setShowModal(true); setSelectedSlots([]) }}
                className="text-xs px-2.5 py-1 rounded-lg font-medium text-white"
                style={{ background: '#378ADD' }}>
                + Zakaži
              </button>
            )}
          </div>

          {!selectedDate ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Klikni na datum u kalendaru</div>
          ) : (
            <div className="p-3 space-y-1.5">
              {/* Booked */}
              {dayLessons.map(lesson => {
                const isPrivate = lesson.source === 'private'
                const showDetails = isAdmin || !isPrivate
                return (
                  <div key={lesson.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg ${
                    isPrivate && !isAdmin ? 'bg-gray-50' : isPrivate ? 'bg-green-50' : 'bg-blue-50'
                  }`}>
                    <div className="w-1 h-8 rounded-full flex-shrink-0"
                      style={{ background: isPrivate && !isAdmin ? '#9ca3af' : isPrivate ? '#1D9E75' : '#378ADD' }} />
                    <span className="text-xs text-gray-500 w-10">{lesson.start_time?.slice(0,5)}</span>
                    <div className="flex-1 min-w-0">
                      {showDetails ? (
                        <>
                          <div className="text-xs font-medium truncate">
                            {lesson.student ? `${lesson.student.first_name} ${lesson.student.last_name}` : 'Grupni čas'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {CATEGORY_LABELS[lesson.category as keyof typeof CATEGORY_LABELS]}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-gray-400 font-medium">Zauzeto</div>
                      )}
                    </div>
                    {isAdmin && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isPrivate ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {isPrivate ? 'Priv.' : 'Klub'}
                      </span>
                    )}
                  </div>
                )
              })}

              {/* Free slots */}
              {freeSlots.length > 0 && (
                <>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1 pt-2">
                    Slobodni termini {!isAdmin && '— klikni da odabereš'}
                  </div>
                  {freeSlots.map(t => (
                    <button key={t} onClick={() => {
                      if (isAdmin) { setSelectedSlots([t]); setShowModal(true) }
                      else toggleSlot(t)
                    }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-left ${
                        selectedSlots.includes(t)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-100 hover:border-green-300 hover:bg-green-50'
                      }`}>
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <Clock size={14} className="text-gray-400" />
                        {t}
                      </span>
                      {selectedSlots.includes(t)
                        ? <Check size={14} className="text-green-600" />
                        : <span className="text-xs text-gray-400">1h</span>}
                    </button>
                  ))}
                </>
              )}

              {!dayLessons.length && !freeSlots.length && (
                <div className="text-sm text-gray-400 text-center py-4">Nema termina za ovaj dan</div>
              )}

              {/* Club: book selected button */}
              {!isAdmin && selectedSlots.length > 0 && (
                <div className="pt-2">
                  <button onClick={() => setShowModal(true)}
                    className="w-full py-2 text-sm font-medium text-white rounded-lg"
                    style={{ background: '#378ADD' }}>
                    Zakaži odabrane ({selectedSlots.length}h) →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold">
                {isAdmin ? 'Nov čas' : 'Zakaži čas'} — {selectedDate?.getDate()}. {selectedDate ? MONTH_NAMES_CAP[selectedDate.getMonth()].toLowerCase() : ''}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Selected slots info */}
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="text-xs text-gray-500 mb-1">Odabrani termini</div>
                {selectedSlots.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSlots.map(t => (
                      <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full font-medium">
                        {t}
                        <button onClick={() => toggleSlot(t)}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">
                    {freeSlots.map(t => (
                      <button key={t} onClick={() => toggleSlot(t)}
                        className={`mr-1.5 mb-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-all ${
                          selectedSlots.includes(t) ? 'bg-green-100 border-green-400 text-green-800' : 'border-gray-200 hover:border-green-300'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                )}
                {selectedSlots.length > 0 && (
                  <div className="text-xs text-gray-400 mt-1">{selectedSlots.length}h ukupno</div>
                )}
              </div>

              {/* Student */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Učenik</label>
                <select value={form.new_student ? 'new' : form.student_id}
                  onChange={e => {
                    if (e.target.value === 'new') setForm(f => ({ ...f, new_student: true, student_id: '' }))
                    else setForm(f => ({ ...f, new_student: false, student_id: e.target.value }))
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">— Izaberi —</option>
                  {(isAdmin ? students : students.filter(s => s.source === 'club')).map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                  ))}
                  <option value="new">+ Novi učenik</option>
                </select>
              </div>

              {/* New student fields */}
              {form.new_student && (
                <div className="space-y-3 border border-gray-100 rounded-xl p-3 bg-gray-50">
                  <div className="text-xs font-medium text-gray-500">Profil novog učenika</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Ime" value={form.new_first} onChange={e => setForm(f => ({ ...f, new_first: e.target.value }))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <input placeholder="Prezime" value={form.new_last} onChange={e => setForm(f => ({ ...f, new_last: e.target.value }))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={form.new_gender} onChange={e => setForm(f => ({ ...f, new_gender: e.target.value }))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="M">Muški</option>
                      <option value="F">Ženski</option>
                    </select>
                    <input placeholder="Starost" type="number" value={form.new_age} onChange={e => setForm(f => ({ ...f, new_age: e.target.value }))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={form.new_handedness} onChange={e => setForm(f => ({ ...f, new_handedness: e.target.value }))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="right">Desnoruk</option>
                      <option value="left">Levoruk</option>
                    </select>
                    <input placeholder="Telefon" value={form.new_phone} onChange={e => setForm(f => ({ ...f, new_phone: e.target.value }))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Vrsta časa</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="regular">Regularni</option>
                    <option value="demo">Demo</option>
                    <option value="academy">Akademija</option>
                    <option value="green_card">Green Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Tip</label>
                  <select value={form.lesson_type} onChange={e => setForm(f => ({ ...f, lesson_type: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="individual">Individualni</option>
                    <option value="group">Grupni</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Lokacija</label>
                <select value={form.location_id} onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Cena (€)</label>
                  <input type="number" placeholder="npr. 45" value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Napomena</label>
                <textarea placeholder="Fokus časa, posebni zahtevi..." value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-16 resize-none" />
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                Otkaži
              </button>
              <button onClick={handleBook} disabled={saving || !selectedSlots.length}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ background: isAdmin ? '#1D9E75' : '#378ADD' }}>
                {saving ? 'Čuvanje...' : isAdmin ? 'Sačuvaj čas' : 'Pošalji zahtev'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
