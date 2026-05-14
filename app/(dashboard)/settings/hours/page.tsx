'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DAY_LABELS } from '@/lib/utils'
import { Check } from 'lucide-react'

const ALL_SLOTS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']

export default function WorkHoursPage() {
  const supabase = createClient()
  const [schedule, setSchedule] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('work_schedule').select('*').order('day_of_week').order('start_time')
      .then(({ data }) => setSchedule(data || []))
  }, [])

  // Group by day
  const byDay: Record<number, { active: boolean; slots: string[] }> = {}
  for (let d = 0; d <= 6; d++) {
    const daySlots = schedule.filter(s => s.day_of_week === d)
    byDay[d] = {
      active: daySlots.some(s => s.active),
      slots: daySlots.filter(s => s.active).map(s => s.start_time.slice(0, 5)),
    }
  }

  async function toggleSlot(dow: number, slot: string) {
    const existing = schedule.find(s => s.day_of_week === dow && s.start_time.slice(0,5) === slot)
    if (existing) {
      await supabase.from('work_schedule').update({ active: !existing.active }).eq('id', existing.id)
    } else {
      await supabase.from('work_schedule').insert({ day_of_week: dow, start_time: slot, active: true })
    }
    const { data } = await supabase.from('work_schedule').select('*').order('day_of_week').order('start_time')
    setSchedule(data || [])
  }

  async function handleSave() {
    setSaving(true)
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000) }, 500)
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold">Radno vreme</h1>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg"
          style={{ background: '#1D9E75' }}>
          {saved ? <><Check size={14} /> Sačuvano!</> : saving ? 'Čuvanje...' : 'Sačuvaj'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800 mb-5">
        Odaberi termine kada si dostupan za časove. Golf klub i učenici mogu zakazivati samo u ovim terminima.
      </div>

      <div className="space-y-3">
        {[1,2,3,4,5,6,0].map(dow => {
          const day = byDay[dow] || { active: false, slots: [] }
          return (
            <div key={dow} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-50">
                <div className="w-28 text-sm font-medium text-gray-700">{DAY_LABELS[dow]}</div>
                <div className="text-xs text-gray-400">{day.slots.length} termina</div>
              </div>
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {ALL_SLOTS.map(slot => {
                  const active = day.slots.includes(slot)
                  return (
                    <button key={slot} onClick={() => toggleSlot(dow, slot)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        active
                          ? 'border-green-400 bg-green-50 text-green-800'
                          : 'border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'
                      }`}>
                      {slot}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
