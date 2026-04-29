'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/status-badge'
import { StatusTimeline } from '@/components/status-timeline'
import { Receipt, ArrowUpRight, Calendar, Image as ImageIcon, Building2, Banknote, DollarSign, Phone, MapPin, AlertTriangle, LogIn, Search, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { UploadReceiptButton } from '@/components/upload-receipt-button'
import { EditReceiverInfoButton } from '@/components/edit-receiver-info-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { getSessionId } from '@/lib/session'
import type { Transaction } from '@/lib/types'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

const EXCHANGE_RATE = 25000
const AUTO_FAIL_MINUTES = 60

// Check if transaction should be auto-failed
function shouldAutoFail(tx: Transaction): boolean {
  if (tx.status !== 'awaiting_zelle_receipt') return false
  if (tx.receipt_url) return false

  const createdAt = new Date(tx.created_at)
  const now = new Date()
  const minutesOld = (now.getTime() - createdAt.getTime()) / (1000 * 60)

  return minutesOld >= AUTO_FAIL_MINUTES
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

function formatCurrency(amount: number, currency: 'USD' | 'VND'): string {
  if (currency === 'USD') {
    return `$${formatNumber(amount)}`
  }
  return `${formatNumber(amount)} VND`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

// Mask account number for security: show only last 4 digits
function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length <= 4) return accountNumber
  return '***' + accountNumber.slice(-4)
}

const receiveMethodLabels = {
  bank_transfer: { label: 'Chuyển khoản ngân hàng', icon: Building2 },
  cash_usd: { label: 'Tiền mặt USD', icon: DollarSign },
  cash_vnd: { label: 'Tiền mặt VNĐ', icon: Banknote },
}

// Status message mapping for guest lookup
const statusMessages: Record<string, { message: string; color: string }> = {
  awaiting_zelle_receipt: { message: 'Bạn chưa tải biên nhận Zelle', color: 'text-amber-700' },
  processing_vn: { message: 'Giao dịch đang được xử lý tại Việt Nam.', color: 'text-blue-700' },
  verify: { message: 'Thông tin người nhận cần cập nhật lại.', color: 'text-orange-700' },
  complete: { message: 'Giao dịch đã hoàn tất.', color: 'text-emerald-700' },
  fail: { message: 'Giao dịch thất bại.', color: 'text-red-700' },
}

// Inner component that uses useSearchParams
function HistoryPageContent() {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search state
  const [searchCode, setSearchCode] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchResult, setSearchResult] = useState<Transaction | null>(null)
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [hasAutoSearched, setHasAutoSearched] = useState(false)

  useEffect(() => {
    async function loadTransactions() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      let query = supabase.from('transactions').select('*').order('created_at', { ascending: false })

      if (user) {
        query = query.eq('user_id', user.id)
      } else {
        const sessionId = getSessionId()
        if (sessionId) {
          query = query.eq('session_id', sessionId)
        } else {
          setTransactions([])
          setLoading(false)
          return
        }
      }

      const { data, error } = await query

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const txns = data as Transaction[]
      const toAutoFail = txns.filter(shouldAutoFail)

      if (toAutoFail.length > 0) {
        for (const tx of toAutoFail) {
          await supabase
            .from('transactions')
            .update({ status: 'fail' })
            .eq('id', tx.id)
        }

        const updatedTxns = txns.map(tx =>
          shouldAutoFail(tx) ? { ...tx, status: 'fail' as const } : tx
        )
        setTransactions(updatedTxns)
      } else {
        setTransactions(txns)
      }

      setLoading(false)
    }

    loadTransactions()
  }, [])

  // Auto-search if URL has ?code= parameter
  useEffect(() => {
    const codeParam = searchParams.get('code')
    if (codeParam && !hasAutoSearched) {
      setHasAutoSearched(true)
      setSearchCode(codeParam.toUpperCase())
      // Trigger search automatically
      autoSearchByCode(codeParam.toUpperCase())
    }
  }, [searchParams, hasAutoSearched])

  // Separate function for auto-search to avoid duplication
  const autoSearchByCode = async (code: string) => {
    if (!code) return

    setSearchLoading(true)
    setSearchError(null)
    setSearchResult(null)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_code', code)
        .single()

      if (error || !data) {
        setSearchError('Không tìm thấy giao dịch. Vui lòng kiểm tra lại mã giao dịch.')
        setIsSearchActive(true)
        return
      }

      // Check auto-fail for the found transaction
      const tx = data as Transaction
      if (shouldAutoFail(tx)) {
        await supabase
          .from('transactions')
          .update({ status: 'fail' })
          .eq('id', tx.id)
        tx.status = 'fail'
      }

      setSearchResult(tx)
      setIsSearchActive(true)
    } catch (err) {
      setSearchError('Đã xảy ra lỗi. Vui lòng thử lại.')
    } finally {
      setSearchLoading(false)
    }
  }

  // Search transaction by code
  const handleSearch = async () => {
    const code = searchCode.trim().toUpperCase()
    if (!code) return

    setSearchLoading(true)
    setSearchError(null)
    setSearchResult(null)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_code', code)
        .single()

      if (error || !data) {
        setSearchError('Không tìm thấy giao dịch. Vui lòng kiểm tra lại mã giao dịch.')
        setIsSearchActive(true)
        return
      }

      // Check auto-fail for the found transaction
      const tx = data as Transaction
      if (shouldAutoFail(tx)) {
        await supabase
          .from('transactions')
          .update({ status: 'fail' })
          .eq('id', tx.id)
        tx.status = 'fail'
      }

      setSearchResult(tx)
      setIsSearchActive(true)
    } catch (err) {
      setSearchError('Đã xảy ra lỗi. Vui lòng thử lại.')
    } finally {
      setSearchLoading(false)
    }
  }

  // Clear search and return to normal history
  const handleClearSearch = () => {
    setSearchCode('')
    setSearchResult(null)
    setSearchError(null)
    setIsSearchActive(false)
  }

  // Refresh search result after action
  const refreshSearchResult = async () => {
    if (!searchResult) return

    const supabase = createClient()
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', searchResult.id)
      .single()

    if (data) {
      setSearchResult(data as Transaction)
    }
  }

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-[calc(100vh-4rem)] px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6">
            <p className="text-destructive">Error loading transactions: {error}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:py-12">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Lịch sử giao dịch</h1>
          <p className="text-muted-foreground mt-1">
            {user ? 'Các giao dịch gần đây của bạn' : 'Giao dịch từ thiết bị này'}
          </p>
        </div>

        {/* Search Section */}
        <div className="mb-6 p-4 rounded-2xl bg-card border card-shadow-sm">
          <h2 className="font-semibold mb-3">Tìm kiếm giao dịch</h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="search_code" className="text-sm text-muted-foreground mb-1.5 block">Mã giao dịch</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search_code"
                  type="text"
                  placeholder="Nhập mã giao dịch"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 h-11 rounded-xl bg-secondary/30 border-0 font-medium"
                  maxLength={10}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                disabled={searchLoading || !searchCode.trim()}
                className="flex-1 h-11 rounded-xl fintech-gradient"
              >
                {searchLoading ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Đang tìm...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Tìm giao dịch
                  </>
                )}
              </Button>
              {isSearchActive && (
                <Button
                  onClick={handleClearSearch}
                  variant="outline"
                  className="h-11 rounded-xl"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Xóa
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Search Error */}
        {searchError && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{searchError}</p>
          </div>
        )}

        {/* Search Result Card */}
        {searchResult && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Kết quả tìm kiếm</h3>
            <SearchResultCard
              transaction={searchResult}
              onActionComplete={refreshSearchResult}
            />
          </div>
        )}

        {/* Divider when search is active */}
        {isSearchActive && transactions.length > 0 && (
          <div className="mb-6 border-t pt-6">
            <h3 className="text-sm font-medium text-muted-foreground">Giao dịch của bạn</h3>
          </div>
        )}

        {/* Login prompt for anonymous users */}
        {!user && transactions.length > 0 && !isSearchActive && (
          <div className="mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <LogIn className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Đăng nhập để theo dõi trên mọi thiết bị</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Giao dịch hiện tại chỉ hiển thị trên thiết bị này.
                </p>
              </div>
              <Link href="/auth/login">
                <Button size="sm" variant="outline" className="rounded-full">
                  Đăng nhập
                </Button>
              </Link>
            </div>
          </div>
        )}

        {transactions.length === 0 && !isSearchActive ? (
          <div className="bg-card rounded-2xl p-8 card-shadow border text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-secondary">
                <Receipt className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
<h3 className="font-semibold text-lg">Chưa có giao dịch nào.</h3>
              <p className="text-muted-foreground mt-1">Bạn có thể tìm giao dịch bằng mã giao dịch.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} showFullDetails />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

// Wrapper component with Suspense for useSearchParams
export default function HistoryPage() {
  return (
    <Suspense fallback={
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <Spinner className="h-8 w-8" />
      </main>
    }>
      <HistoryPageContent />
    </Suspense>
  )
}

// Transaction card for regular history view (shows full details)
function TransactionCard({ transaction: tx, showFullDetails }: { transaction: Transaction; showFullDetails?: boolean }) {
  const vndAmount = Number(tx.amount) * EXCHANGE_RATE
  const method = receiveMethodLabels[tx.receive_method || 'bank_transfer']
  const MethodIcon = method.icon

  return (
    <div className="bg-card rounded-2xl p-5 card-shadow-md border hover:border-primary/30 transition-colors">
      {/* Status Timeline */}
      <div className="mb-3 p-3 rounded-xl bg-secondary/30">
        <StatusTimeline status={tx.status} />
      </div>

      {/* Top row: Amount and Status badge */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-2xl font-bold">
            {formatCurrency(Number(tx.amount), 'USD')}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <ArrowUpRight className="h-3.5 w-3.5" />
            {formatCurrency(vndAmount, 'VND')}
          </p>
        </div>
        <StatusBadge status={tx.status} />
      </div>

      {/* Verify warning message and edit button */}
      {tx.status === 'verify' && (
        <div className="mb-3 space-y-2">
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800 font-medium">
              Thông tin người nhận cần cập nhật lại.
            </p>
          </div>
          <EditReceiverInfoButton transaction={tx} />
        </div>
      )}

      {/* Recipient info */}
      <div className="mb-3 space-y-1">
        <p className="font-medium">{tx.receiver_name}</p>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MethodIcon className="h-3.5 w-3.5" />
          <span>{method.label}</span>
        </div>

        {showFullDetails && tx.receive_method === 'bank_transfer' && tx.bank_name && (
          <p className="text-sm text-muted-foreground">
            {tx.bank_name} &middot; {tx.account_number}
          </p>
        )}

        {showFullDetails && (tx.receive_method === 'cash_usd' || tx.receive_method === 'cash_vnd') && tx.address && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {tx.address}
          </p>
        )}

        {showFullDetails && tx.phone && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {tx.phone}
          </p>
        )}
      </div>

      {/* Transaction code */}
      {tx.transaction_code && (
        <div className="mb-3 p-2 rounded-lg bg-success/10 border border-success/20">
          <p className="text-xs text-muted-foreground">Mã giao dịch</p>
          <p className="font-mono font-medium text-success">{tx.transaction_code}</p>
        </div>
      )}

      {/* Upload Receipt section */}
      {tx.status === 'awaiting_zelle_receipt' && (
        <div className="mb-3">
          <UploadReceiptButton transactionId={tx.id} />
        </div>
      )}

      {/* Footer: Date and Receipt */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(tx.created_at)} at {formatTime(tx.created_at)}</span>
        </div>

        {tx.receipt_url && (
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                <ImageIcon className="h-4 w-4" />
                Biên nhận
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg p-2" aria-describedby={undefined}>
              <VisuallyHidden>
                <DialogTitle>Hình biên nhận</DialogTitle>
              </VisuallyHidden>
              <img
                src={tx.receipt_url}
                alt="Zelle receipt"
                className="w-full rounded-lg"
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}

// Search result card with masked sensitive info and actions
function SearchResultCard({ transaction: tx, onActionComplete }: { transaction: Transaction; onActionComplete: () => void }) {
  const vndAmount = Number(tx.amount) * EXCHANGE_RATE
  const method = receiveMethodLabels[tx.receive_method || 'bank_transfer']
  const MethodIcon = method.icon
  const statusInfo = statusMessages[tx.status] || { message: '', color: 'text-muted-foreground' }

  return (
    <div className="bg-card rounded-2xl p-5 card-shadow-md border border-primary/30">
      {/* Status Timeline */}
      <div className="mb-3 p-3 rounded-xl bg-secondary/30">
        <StatusTimeline status={tx.status} />
      </div>

      {/* Transaction Code */}
      <div className="mb-3 p-2 rounded-lg bg-success/10 border border-success/20">
        <p className="text-xs text-muted-foreground">Mã giao dịch</p>
        <p className="font-mono font-medium text-success">{tx.transaction_code}</p>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between mb-3">
        <StatusBadge status={tx.status} />
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(tx.created_at)}</span>
        </div>
      </div>

      {/* Status Message */}
      <div className={`mb-4 p-3 rounded-xl bg-secondary/50 ${statusInfo.color}`}>
        <p className="text-sm font-medium">{statusInfo.message}</p>
      </div>

      {/* Amount Info */}
      <div className="mb-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Số tiền gửi</span>
          <span className="font-semibold">{formatCurrency(Number(tx.amount), 'USD')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Người nhận nhận được</span>
          <span className="font-semibold">{tx.receive_method === 'cash_usd' ? formatCurrency(Number(tx.amount), 'USD') : formatCurrency(vndAmount, 'VND')}</span>
        </div>
      </div>

      {/* Receiver Info - Safe info only */}
      <div className="mb-3 p-3 rounded-xl bg-secondary/30 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tên người nhận</span>
          <span className="font-medium">{tx.receiver_name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Hình thức nhận tiền</span>
          <span className="flex items-center gap-1.5">
            <MethodIcon className="h-3.5 w-3.5" />
            {method.label}
          </span>
        </div>
        {tx.receive_method === 'bank_transfer' && tx.bank_name && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ngân hàng</span>
              <span>{tx.bank_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Số tài khoản</span>
              <span className="font-mono">{maskAccountNumber(tx.account_number || '')}</span>
            </div>
          </>
        )}
      </div>

      {/* Receipt Status */}
      <div className="mb-3 flex justify-between text-sm">
        <span className="text-muted-foreground">Biên nhận Zelle</span>
        <span className={tx.receipt_url ? 'text-success font-medium' : 'text-amber-600'}>
          {tx.receipt_url ? 'Đã tải lên' : 'Chưa tải lên'}
        </span>
      </div>

      {/* Actions based on status */}
      {tx.status === 'awaiting_zelle_receipt' && (
        <div className="mt-4">
          <UploadReceiptButton transactionId={tx.id} />
        </div>
      )}

      {tx.status === 'verify' && (
        <div className="mt-4">
          <EditReceiverInfoButton transaction={tx} />
        </div>
      )}
    </div>
  )
}
