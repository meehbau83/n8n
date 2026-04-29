'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, CheckCircle2, Building2, Banknote, DollarSign, Phone, Mail, CreditCard, Receipt } from 'lucide-react'
import { getTransferState, clearTransferState } from '@/lib/transfer-state'
import { StepProgress } from '@/components/send-flow/step-progress'
import { getOrCreateSessionId } from '@/lib/session'

// Format VND with dot separators
function formatVnd(num: number): string {
  return num.toLocaleString('vi-VN')
}

// Format USD with comma separators and currency symbol
function formatUSD(value: number | string): string {
  const num = typeof value === 'string'
    ? Number(value.replace(/,/g, ''))
    : value

  if (!num || isNaN(num)) return '$0'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

// Generate secure 6-character transaction code using crypto
function generateTransactionCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint32Array(length)
    window.crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      code += chars[array[i] % chars.length]
    }
    return code
  }
  
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function getOrCreateTransactionCode(): string {
  const existingCode = sessionStorage.getItem('transfer_transaction_code')
  if (existingCode && /^[A-HJ-NP-Z2-9]{6}$/.test(existingCode)) {
    return existingCode
  }
  const newCode = generateTransactionCode(6)
  sessionStorage.setItem('transfer_transaction_code', newCode)
  return newCode
}

export default function ReviewPage() {
  const router = useRouter()
  const [state, setState] = useState(getTransferState())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transactionCode, setTransactionCode] = useState('')

  useEffect(() => {
    const stored = getTransferState()
    setState(stored)
    const code = getOrCreateTransactionCode()
    setTransactionCode(code)
    
    if (!stored.receive_method || stored.amount_usd <= 0) {
      router.push('/send/method')
    }
    if (!stored.sender_email && !stored.sender_phone) {
      router.push('/send/payment')
    }
  }, [router])

  const handleBack = () => {
    router.push('/send/upload-receipt')
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    // Final amount validation
    if (state.amount_usd < 50 || state.amount_usd > 10000) {
      setError('Số tiền không hợp lệ. Vui lòng quay lại và nhập lại.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const sessionId = user ? null : getOrCreateSessionId()
      
      let receiptUrl: string | null = null
      let status: 'awaiting_zelle_receipt' | 'processing_vn' = 'awaiting_zelle_receipt'

      const receiptData = sessionStorage.getItem('receipt_file_data')
      const receiptName = sessionStorage.getItem('receipt_file_name')
      const receiptType = sessionStorage.getItem('receipt_file_type')

      if (receiptData && receiptName) {
        const base64Response = await fetch(receiptData)
        const blob = await base64Response.blob()
        const file = new File([blob], receiptName, { type: receiptType || 'image/jpeg' })

        const fileExt = receiptName.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, file)

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName)

        receiptUrl = urlData.publicUrl
        status = 'processing_vn'
      }

      let codeToUse = sessionStorage.getItem('transfer_transaction_code') || generateTransactionCode(6)
      let insertError = null
      
      for (let attempt = 0; attempt < 2; attempt++) {
        const { error } = await supabase.from('transactions').insert({
          amount: state.amount_usd,
          receiver_name: state.receiver_name,
          receive_method: state.receive_method,
          bank_name: state.receive_method === 'bank_transfer' ? state.bank_name : null,
          account_number: state.receive_method === 'bank_transfer' ? state.account_number : null,
          phone: state.phone || null,
          address: state.receive_method !== 'bank_transfer' ? state.address : null,
          receipt_url: receiptUrl,
          status,
          user_id: user?.id || null,
          session_id: sessionId,
          sender_email: state.sender_email || null,
          sender_phone: state.sender_phone || null,
          payment_method: state.payment_method || 'zelle',
          transaction_code: codeToUse,
          rounding_difference_vnd: state.rounding_difference_vnd || 0,
        })
        
        if (!error) {
          insertError = null
          break
        }
        
        if (error.message.includes('transaction_code') || error.code === '23505') {
          codeToUse = generateTransactionCode(6)
          insertError = error
          continue
        }
        
        insertError = error
        break
      }

      if (insertError) {
        throw new Error(`Insert failed: ${insertError.message}`)
      }

      // Send email notification after successful transaction creation
      // This is non-blocking - we don't wait for it to complete
      if (state.sender_email && state.sender_email.includes('@')) {
        const emailMessage = `Giao dịch của bạn đã được tạo thành công.

Mã giao dịch: ${codeToUse}

Bạn có thể kiểm tra trạng thái tại:
https://latousa.com/history?code=${codeToUse}

Cảm ơn bạn đã sử dụng Lato.`

        fetch('/api/send-test-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: state.sender_email,
            subject: 'Lato - Giao dịch của bạn đã được tạo',
            message: emailMessage,
          }),
        }).catch((err) => {
          // Log error but don't block the user flow
          console.error('Email notification failed:', err)
        })
      }

      clearTransferState()
      sessionStorage.removeItem('transfer_transaction_code')
      sessionStorage.removeItem('receipt_file_data')
      sessionStorage.removeItem('receipt_file_name')
      sessionStorage.removeItem('receipt_file_type')

      router.push('/history')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  if (!state.receive_method || state.amount_usd <= 0) {
    return null
  }

  const isCashUsd = state.receive_method === 'cash_usd'
  const totalPay = state.amount_usd + state.fee_usd

  const getMethodLabel = () => {
    switch (state.receive_method) {
      case 'bank_transfer': return 'Chuyển khoản'
      case 'cash_usd': return 'Ti��n mặt USD'
      case 'cash_vnd': return 'Tiền mặt VNĐ'
      default: return ''
    }
  }

  const getMethodIcon = () => {
    switch (state.receive_method) {
      case 'bank_transfer': return <Building2 className="h-3.5 w-3.5" />
      case 'cash_usd': return <DollarSign className="h-3.5 w-3.5" />
      case 'cash_vnd': return <Banknote className="h-3.5 w-3.5" />
      default: return null
    }
  }

  // Truncate long text
  const truncate = (str: string, max: number) => 
    str.length > max ? str.slice(0, max) + '...' : str

  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col px-4 py-4">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
        {/* Compact Header */}
        <h1 className="text-lg font-bold text-center mb-3">Xem lại giao dịch</h1>

        {/* Step Progress */}
        <StepProgress currentStep={6} />

        {/* Compact Bill Card */}
        <div className="bg-card rounded-xl border card-shadow-sm overflow-hidden">
          {/* Code Header */}
          <div className="bg-primary/5 px-3 py-2 border-b flex items-center justify-between">
            <div>
              <span className="text-[11px] text-muted-foreground block">Mã GD</span>
              <span className="text-[9px] text-muted-foreground/70">Dùng để tra cứu trạng thái</span>
            </div>
            <span className="text-sm font-bold text-primary font-mono">{transactionCode}</span>
          </div>

          {/* Compact Content */}
          <div className="p-3 space-y-2.5 text-sm">
            {/* Row: Method + Receiver */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-secondary/50 flex items-center justify-center flex-shrink-0">
                {getMethodIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-muted-foreground text-xs">{getMethodLabel()}</span>
                <p className="font-medium truncate">{state.receiver_name}</p>
              </div>
            </div>

            {/* Bank info or Phone/Address */}
            {state.receive_method === 'bank_transfer' ? (
              <div className="pl-8 text-xs text-muted-foreground">
                {state.bank_name} • {state.account_number}
              </div>
            ) : (
              <div className="pl-8 text-xs text-muted-foreground space-y-0.5">
                {state.phone && <p>SĐT: {state.phone}</p>}
                {state.address && <p className="truncate">Địa chỉ: {truncate(state.address, 30)}</p>}
              </div>
            )}

            <hr className="border-dashed my-2" />

            {/* Amount rows - compact */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Gửi</span>
                <span className="font-medium">{formatUSD(state.amount_usd)}</span>
              </div>
              {!isCashUsd && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Nhận được</span>
                  <span className="font-medium text-success">{formatVnd(state.amount_vnd)}₫</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Phí</span>
                <span className={state.fee_usd === 0 ? 'text-success text-xs' : 'text-xs'}>
                  {state.fee_usd === 0 ? 'Mi���n phí' : formatUSD(state.fee_usd)}
                </span>
              </div>
              {!isCashUsd && state.exchange_rate > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Tỷ giá</span>
                  <span className="text-xs">$1 = {formatVnd(state.exchange_rate)}₫</span>
                </div>
              )}
            </div>

            <hr className="border-dashed my-2" />

            {/* Payment + Contact row */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-3 w-3 text-muted-foreground" />
                <span>Zelle</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {state.sender_email ? <Mail className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                <span className="truncate max-w-[140px]">{state.sender_email || state.sender_phone}</span>
              </div>
            </div>

            {/* Receipt - compact */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-xs">
                <Receipt className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Biên lai</span>
              </div>
              {state.receipt_preview ? (
                <div className="flex items-center gap-1.5">
                  <img
                    src={state.receipt_preview}
                    alt="Receipt"
                    className="w-8 h-8 object-cover rounded border"
                  />
                  <span className="text-xs text-success">Đã tải</span>
                </div>
              ) : (
                <span className="text-xs text-amber-600">Chưa tải</span>
              )}
            </div>
          </div>

          {/* Total Footer */}
          <div className="bg-primary/5 px-3 py-2.5 border-t flex items-center justify-between">
            <span className="text-sm font-medium">Tổng</span>
            <span className="text-lg font-bold text-primary">{formatUSD(totalPay)}</span>
          </div>
        </div>

        {/* Error */}
        {error?.trim() ? (
          <div className="bg-destructive/10 text-destructive p-2.5 rounded-lg text-xs mt-3">
            {error}
          </div>
        ) : null}

        {/* Sticky Bottom Actions */}
        <div className="flex gap-2 mt-4 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={loading}
            className="h-11 rounded-full px-4"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Quay lại
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 h-11 rounded-full font-semibold fintech-gradient hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Đang tạo giao dịch...
              </>
            ) : (
              'Hoàn tất'
            )}
          </Button>
        </div>
      </div>
    </main>
  )
}
