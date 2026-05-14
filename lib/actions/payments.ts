'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getPayments() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*, student:students(id, first_name, last_name)')
    .order('payment_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createPayment(formData: {
  student_id: string
  amount: number
  payment_date: string
  note?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('payments').insert(formData)
  if (error) throw error

  // Update student_packages total_paid
  const { data: pkgs } = await supabase
    .from('student_packages')
    .select('*')
    .eq('student_id', formData.student_id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (pkgs && pkgs.length > 0) {
    const pkg = pkgs[0]
    await supabase
      .from('student_packages')
      .update({ total_paid: Math.min(pkg.total_paid + formData.amount, pkg.total_due) })
      .eq('id', pkg.id)
  }

  revalidatePath('/payments')
  revalidatePath('/students')
}

export async function getClubInvoices() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('club_invoices')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function markInvoicePaid(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('club_invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  revalidatePath('/payments')
}

export async function getClubLessonsForInvoice(periodStart: string, periodEnd: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lessons')
    .select('*, student:students(id, first_name, last_name)')
    .eq('source', 'club')
    .eq('status', 'confirmed')
    .gte('lesson_date', periodStart)
    .lte('lesson_date', periodEnd)
    .in('category', ['academy', 'demo', 'green_card'])
    .order('lesson_date')
  if (error) throw error
  return data
}
