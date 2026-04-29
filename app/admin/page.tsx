import { createClient } from '@/lib/supabase/server'
import { Shield, Inbox, Clock, Loader2, AlertTriangle, CheckCircle2, Lock, XCircle } from 'lucide-react'
import { AdminTransactionRow } from './admin-transaction-row'
import { AdminSettings } from './admin-settings'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Transaction } from '@/lib/types'

const AUTO_FAIL_MINUTES = 60

// Check if transaction should be auto-failed
// ONLY applies to: status = awaiting_zelle_receipt AND receipt_url is null AND older than 60 minutes
// Production auto-fail should be handled by Supabase Edge Function or scheduled cron job later.
function shouldAutoFail(tx: Transaction): boolean {
  if (tx.status !== 'awaiting_zelle_receipt') return false
  if (tx.receipt_url) return false
  
  const createdAt = new Date(tx.created_at)
  const now = new Date()
  const minutesOld = (now.getTime() - createdAt.getTime()) / (1000 * 60)
  
  return minutesOld >= AUTO_FAIL_MINUTES
}

export default async function AdminPage() {
  const supabase = await createClient()
  
  // Check if user is authenticated and is admin
  const { data: { user } } = await supabase.auth.getUser()
  
  // If user is not signed in, redirect to login
  if (!user) {
    redirect('/auth/login')
  }
  
  // Admin check: email must be in the ADMIN_EMAILS whitelist
  const ADMIN_EMAILS = [
    "pminht83@gmail.com"
  ]
  const isAdmin = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  
  if (!isAdmin) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-destructive/10">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-xl font-bold mb-2">Bạn không có quyền truy cập trang này.</h1>
          <p className="text-muted-foreground mb-6">
            Vui lòng đăng nhập với tài khoản admin được ủy quyền.
          </p>
          <Link href="/">
            <Button className="rounded-full">
              Về trang chủ
            </Button>
          </Link>
        </div>
      </main>
    )
  }
  
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="min-h-[calc(100vh-4rem)] px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6">
            <p className="text-destructive">Error loading transactions: {error.message}</p>
          </div>
        </div>
      </main>
    )
  }

  let txns = transactions as Transaction[]

  // Auto-fail transactions that meet criteria (temporary frontend fallback)
  // ONLY: status = awaiting_zelle_receipt AND receipt_url is null AND older than 60 minutes
  // Production auto-fail should be handled by Supabase Edge Function or scheduled cron job later.
  const toAutoFail = txns.filter(shouldAutoFail)
  
  if (toAutoFail.length > 0) {
    // Update status to fail in database
    for (const tx of toAutoFail) {
      await supabase
        .from('transactions')
        .update({ status: 'fail' })
        .eq('id', tx.id)
    }
    
    // Update local array with failed status
    txns = txns.map(tx => 
      shouldAutoFail(tx) ? { ...tx, status: 'fail' as const } : tx
    )
  }

  // Stats by statuses
  const awaitingCount = txns.filter(t => t.status === 'awaiting_zelle_receipt').length
  const processingCount = txns.filter(t => t.status === 'processing_vn').length
  const verifyCount = txns.filter(t => t.status === 'verify').length
  const completeCount = txns.filter(t => t.status === 'complete').length
  const failCount = txns.filter(t => t.status === 'fail').length

  const stats = [
    { label: 'Chờ Zelle', count: awaitingCount, icon: Clock, color: 'text-amber-600' },
    { label: 'Đang xử lý VN', count: processingCount, icon: Loader2, color: 'text-blue-600' },
    { label: 'Cần cập nhật', count: verifyCount, icon: AlertTriangle, color: 'text-orange-600' },
    { label: 'Hoàn tất', count: completeCount, icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'Thất bại', count: failCount, icon: XCircle, color: 'text-red-600' },
  ]

  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quản trị viên</h1>
            <p className="text-muted-foreground">Quản lý tất cả giao dịch</p>
          </div>
        </div>

        {/* Admin Settings Section */}
        <AdminSettings />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-card rounded-xl p-4 card-shadow border">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                  <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
              </div>
            )
          })}
        </div>

        {txns.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 card-shadow border text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-secondary">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="font-semibold text-lg">Chưa có giao dịch</h3>
            <p className="text-muted-foreground mt-1">Giao dịch sẽ xuất hiện ở đây khi được tạo.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl card-shadow-md border overflow-hidden">
            <div className="p-5 border-b">
              <h2 className="font-semibold">Tất cả giao dịch ({txns.length})</h2>
            </div>
            <div className="divide-y">
              {txns.map((tx) => (
                <AdminTransactionRow key={tx.id} transaction={tx} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
